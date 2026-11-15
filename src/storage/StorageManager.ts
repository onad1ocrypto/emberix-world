import {
  ACCOUNTS_STORAGE_KEY,
  ACTIVE_ACCOUNT_ID_KEY,
  COSMETICS,
  DEFAULT_PROGRESSION,
  DEFAULT_STATS,
  STORAGE_KEY,
  getDefaultSettings,
} from '../constants';
import {
  applyHungerTimerTick,
  applyTimeDecay,
  calculateFriendshipLevel,
  calculateLevelFromXp,
  claimDailyReward,
  claimKeeperQuest,
  clampStat,
  evaluateAchievements,
  getHungerStateLevel,
  isCosmeticUnlocked,
  isPetHungry,
  performPetAction,
  syncUnlockedCosmetics,
  type HungerTickResult,
  type PetActionResult,
} from '../game/rules';
import type {
  CosmeticId,
  GameSettings,
  PetActionType,
  PetStats,
  PlayerAccount,
  PlayerAvatarId,
  ProgressionState,
  SaveData,
} from '../types';

type StateListener = (state: SaveData) => void;
type HungerListener = (result: HungerTickResult) => void;

export class StorageManager {
  private state: SaveData;
  private accounts: PlayerAccount[] = [];
  private activeAccountId: string | null = null;
  private listeners = new Set<StateListener>();
  private hungerListeners = new Set<HungerListener>();
  private storageAvailable = true;

  constructor() {
    this.accounts = this.loadAccountsFromStorage();
    this.activeAccountId = this.loadActiveAccountId();
    const activeAccount = this.getCurrentUser();
    if (activeAccount && activeAccount.saveData) {
      this.state = this.hydrateSaveData(activeAccount.saveData);
    } else {
      this.state = this.loadFromStorage();
    }
  }

  private createDefaultSaveData(): SaveData {
    return {
      version: 1,
      stats: { ...DEFAULT_STATS },
      progression: {
        ...DEFAULT_PROGRESSION,
        unlockedCosmetics: [...DEFAULT_PROGRESSION.unlockedCosmetics],
        unlockedAchievements: [...DEFAULT_PROGRESSION.unlockedAchievements],
        claimedQuests: [],
      },
      settings: getDefaultSettings(),
    };
  }

  private hydrateSaveData(parsed: Partial<SaveData>): SaveData {
    const stats: PetStats = {
      ...DEFAULT_STATS,
      ...(parsed.stats || {}),
    };
    const rawPetName =
      typeof parsed.progression?.petName === 'string' &&
      parsed.progression.petName.trim().length >= 2
        ? parsed.progression.petName.trim()
        : DEFAULT_PROGRESSION.petName;
    const progression: ProgressionState = {
      ...DEFAULT_PROGRESSION,
      ...(parsed.progression || {}),
      petName: rawPetName,
      selfieCount:
        typeof parsed.progression?.selfieCount === 'number'
          ? parsed.progression.selfieCount
          : 0,
      claimedQuests: Array.isArray(parsed.progression?.claimedQuests)
        ? parsed.progression.claimedQuests
        : [],
      unlockedCosmetics: [...DEFAULT_PROGRESSION.unlockedCosmetics],
      unlockedAchievements: Array.isArray(
        parsed.progression?.unlockedAchievements,
      )
        ? parsed.progression.unlockedAchievements
        : [],
    };
    const defaultSettings = getDefaultSettings();
    const rawLang = parsed.settings?.language;
    const validLang =
      rawLang === 'en' || rawLang === 'id' || rawLang === 'zh'
        ? rawLang
        : defaultSettings.language;
    const settings: GameSettings = {
      ...defaultSettings,
      ...(parsed.settings || {}),
      language: validLang,
    };

    const elapsedSeconds = Math.max(
      0,
      (Date.now() - (progression.lastSavedAt || Date.now())) / 1000,
    );
    const decayedStats = applyTimeDecay(stats, elapsedSeconds);
    progression.lastSavedAt = Date.now();
    progression.playerLevel = calculateLevelFromXp(progression.playerXp).level;
    progression.creatureLevel = calculateLevelFromXp(
      progression.creatureXp,
    ).level;
    progression.friendshipLevel = calculateFriendshipLevel(
      decayedStats.friendship,
    );

    // Strictly synchronize unlockedCosmetics with creatureLevel
    progression.unlockedCosmetics = COSMETICS.filter(
      (c) => progression.creatureLevel >= c.requiredCreatureLevel,
    ).map((c) => c.id);
    if (!progression.unlockedCosmetics.includes(progression.equippedCosmetic)) {
      progression.equippedCosmetic = 'crown';
    }

    return {
      version: 1,
      stats: decayedStats,
      progression,
      settings,
    };
  }

  private loadAccountsFromStorage(): PlayerAccount[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return [];
      }
      const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PlayerAccount[]) : [];
    } catch {
      return [];
    }
  }

  private loadActiveAccountId(): string | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null;
      }
      return window.localStorage.getItem(ACTIVE_ACCOUNT_ID_KEY);
    } catch {
      return null;
    }
  }

  private persistAccounts(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          ACCOUNTS_STORAGE_KEY,
          JSON.stringify(this.accounts),
        );
        if (this.activeAccountId) {
          window.localStorage.setItem(
            ACTIVE_ACCOUNT_ID_KEY,
            this.activeAccountId,
          );
        } else {
          window.localStorage.removeItem(ACTIVE_ACCOUNT_ID_KEY);
        }
      }
    } catch {
      // Ignore storage error
    }
  }

  private loadFromStorage(): SaveData {
    const defaultData = this.createDefaultSaveData();

    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this.storageAvailable = false;
        return defaultData;
      }
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaultData;
      }
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return this.hydrateSaveData(parsed);
    } catch {
      this.storageAvailable = false;
      return defaultData;
    }
  }

  public isStorageAvailable(): boolean {
    return this.storageAvailable;
  }

  public getState(): SaveData {
    return this.state;
  }

  public getPetName(): string {
    return this.state.progression.petName || 'EMBER';
  }

  public setPetName(rawName: string): {
    ok: boolean;
    petName?: string;
    error?: string;
  } {
    const cleaned = rawName.trim().slice(0, 24);
    if (cleaned.length < 2) {
      return {
        ok: false,
        error: 'Pet name must be at least 2 characters.',
      };
    }
    this.state.progression.petName = cleaned;
    this.persistAndNotify();
    return { ok: true, petName: cleaned };
  }

  public getCurrentUser(): PlayerAccount | null {
    if (!this.activeAccountId) return null;
    return (
      this.accounts.find((acc) => acc.id === this.activeAccountId) || null
    );
  }

  public getRegisteredAccounts(): PlayerAccount[] {
    return [...this.accounts];
  }

  private hashPassword(rawPassword: string): string {
    let hash = 5381;
    const str = `solara_salt_${rawPassword.trim()}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }

  public registerAccount(input: {
    username: string;
    password: string;
    avatarId: PlayerAvatarId;
    titleBadge: string;
    petName?: string;
  }): { ok: boolean; error?: string; account?: PlayerAccount } {
    const username = input.username.trim();
    const password = input.password.trim();

    if (username.length < 2) {
      return {
        ok: false,
        error: 'Username must be at least 2 characters.',
      };
    }
    if (password.length < 4) {
      return {
        ok: false,
        error: 'Password / PIN must be at least 4 characters.',
      };
    }

    const exists = this.accounts.some(
      (acc) => acc.username.toLowerCase() === username.toLowerCase(),
    );
    if (exists) {
      return {
        ok: false,
        error: 'That username is already taken. Please pick another or log in.',
      };
    }

    const now = Date.now();
    // Carry over current session progress if registering from guest mode
    const initialSave: SaveData = JSON.parse(JSON.stringify(this.state));
    if (input.petName && input.petName.trim().length >= 2) {
      initialSave.progression.petName = input.petName.trim().slice(0, 24);
    }
    // Grant a +50 XP Registration Welcome Bonus!
    initialSave.progression.playerXp += 50;
    initialSave.progression.playerLevel = calculateLevelFromXp(
      initialSave.progression.playerXp,
    ).level;

    const newAccount: PlayerAccount = {
      id: `keeper_${now}_${Math.random().toString(36).slice(2, 7)}`,
      username,
      passwordHash: this.hashPassword(password),
      avatarId: input.avatarId || 'fire_keeper',
      titleBadge: input.titleBadge || 'Dragon Tamer',
      createdAt: now,
      lastLoginAt: now,
      saveData: initialSave,
    };

    this.accounts.push(newAccount);
    this.activeAccountId = newAccount.id;
    this.state = initialSave;
    this.persistAccounts();
    this.persistAndNotify();
    return { ok: true, account: newAccount };
  }

  public loginAccount(
    identifier: string,
    password: string,
  ): { ok: boolean; error?: string; account?: PlayerAccount } {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();
    if (!cleanId || !cleanPass) {
      return {
        ok: false,
        error: 'Please enter your username and password.',
      };
    }

    // `email` is only matched for accounts created before registration became
    // username-only, so existing saves can still log in.
    const account = this.accounts.find(
      (acc) =>
        acc.username.toLowerCase() === cleanId ||
        (acc.email ? acc.email.toLowerCase() === cleanId : false),
    );
    if (!account) {
      return {
        ok: false,
        error: 'Account not found. Please register a new account first.',
      };
    }

    if (account.passwordHash !== this.hashPassword(cleanPass)) {
      return {
        ok: false,
        error: 'Incorrect Password / PIN. Please try again.',
      };
    }

    account.lastLoginAt = Date.now();
    this.activeAccountId = account.id;
    this.state = this.hydrateSaveData(account.saveData);
    account.saveData = this.state;
    this.persistAccounts();
    this.persistAndNotify();
    return { ok: true, account };
  }

  public quickSwitchAccount(accountId: string): boolean {
    const account = this.accounts.find((acc) => acc.id === accountId);
    if (!account) return false;
    account.lastLoginAt = Date.now();
    this.activeAccountId = account.id;
    this.state = this.hydrateSaveData(account.saveData);
    account.saveData = this.state;
    this.persistAccounts();
    this.persistAndNotify();
    return true;
  }

  public updatePlayerProfile(updates: {
    username?: string;
    avatarId?: PlayerAvatarId;
    titleBadge?: string;
    petName?: string;
  }): boolean {
    if (updates.petName && updates.petName.trim().length >= 2) {
      this.state.progression.petName = updates.petName.trim().slice(0, 24);
    }
    const current = this.getCurrentUser();
    if (!current) {
      if (updates.petName) {
        this.persistAndNotify();
        return true;
      }
      return false;
    }
    if (updates.username && updates.username.trim().length >= 2) {
      current.username = updates.username.trim();
    }
    if (updates.avatarId) {
      current.avatarId = updates.avatarId;
    }
    if (updates.titleBadge) {
      current.titleBadge = updates.titleBadge;
    }
    this.persistAccounts();
    this.persistAndNotify();
    return true;
  }

  public logoutAccount(): void {
    this.activeAccountId = null;
    this.persistAccounts();
    this.persistAndNotify();
  }

  /**
   * Replaces the active save with a restored Keeper Code payload.
   * The payload is untrusted, so it goes through `hydrateSaveData` first.
   */
  public applyKeeperSave(partial: Partial<SaveData>): SaveData {
    this.state = this.hydrateSaveData(partial);
    this.persistAndNotify();
    return this.state;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeHunger(listener: HungerListener): () => void {
    this.hungerListeners.add(listener);
    return () => this.hungerListeners.delete(listener);
  }

  private notifyHungerListeners(tickResult: HungerTickResult): void {
    for (const listener of this.hungerListeners) {
      listener(tickResult);
    }
  }

  private persistAndNotify(): void {
    this.state.progression.lastSavedAt = Date.now();
    const activeUser = this.getCurrentUser();
    if (activeUser) {
      activeUser.saveData = JSON.parse(JSON.stringify(this.state));
      this.persistAccounts();
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        this.storageAvailable = true;
      }
    } catch {
      this.storageAvailable = false;
    }
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public dispatchPetAction(action: PetActionType): PetActionResult {
    const result = performPetAction(
      action,
      this.state.stats,
      this.state.progression,
    );
    this.state = {
      ...this.state,
      stats: result.stats,
      progression: result.progression,
    };
    this.persistAndNotify();
    return result;
  }

  public tickRealtimeDecay(deltaSeconds = 15): HungerTickResult {
    const tickResult = applyHungerTimerTick(this.state.stats, deltaSeconds);
    this.state.stats = tickResult.stats;
    this.state.progression.friendshipLevel = calculateFriendshipLevel(
      this.state.stats.friendship,
    );
    this.persistAndNotify();
    if (tickResult.hungerDelta !== 0 || tickResult.isHungry) {
      this.notifyHungerListeners(tickResult);
    }
    return tickResult;
  }

  public setHungerLevel(targetHunger: number): HungerTickResult {
    const previousHunger = clampStat(this.state.stats.hunger);
    const currentHunger = clampStat(targetHunger);
    const previousState = getHungerStateLevel(previousHunger);
    const hungerState = getHungerStateLevel(currentHunger);
    const isHungry = isPetHungry(currentHunger);
    const crossedIntoHungry =
      previousState === 'satisfied' &&
      (hungerState === 'hungry' || hungerState === 'starving');
    const crossedIntoStarving =
      previousState !== 'starving' && hungerState === 'starving';

    this.state.stats = {
      ...this.state.stats,
      hunger: currentHunger,
    };
    this.persistAndNotify();

    const tickResult: HungerTickResult = {
      stats: { ...this.state.stats },
      previousHunger,
      currentHunger,
      hungerDelta: currentHunger - previousHunger,
      hungerState,
      isHungry,
      crossedIntoHungry,
      crossedIntoStarving,
      shouldNotifyHungry: isHungry,
    };
    this.notifyHungerListeners(tickResult);
    return tickResult;
  }

  public recordSelfieCapture(): {
    playerXp: number;
    creatureXp: number;
    playerLevel: number;
    creatureLevel: number;
  } {
    this.state.progression.selfieCount =
      (this.state.progression.selfieCount || 0) + 1;
    this.state.progression.totalInteractions += 1;
    const isFreshSelfie = this.state.progression.selfieCount <= 2;
    this.state.progression.playerXp += isFreshSelfie ? 15 : 3;
    this.state.progression.creatureXp += isFreshSelfie ? 20 : 4;
    this.state.stats.happiness = Math.min(100, this.state.stats.happiness + 4);
    this.state.stats.friendship = Math.min(
      100,
      this.state.stats.friendship + 3,
    );
    this.state.progression.playerLevel = calculateLevelFromXp(
      this.state.progression.playerXp,
    ).level;
    this.state.progression.creatureLevel = calculateLevelFromXp(
      this.state.progression.creatureXp,
    ).level;
    this.state.progression.friendshipLevel = calculateFriendshipLevel(
      this.state.stats.friendship,
    );
    syncUnlockedCosmetics(this.state.progression);
    evaluateAchievements(this.state.stats, this.state.progression);
    this.persistAndNotify();
    return {
      playerXp: this.state.progression.playerXp,
      creatureXp: this.state.progression.creatureXp,
      playerLevel: this.state.progression.playerLevel,
      creatureLevel: this.state.progression.creatureLevel,
    };
  }

  public recordArTargetSummon(): string[] {
    this.state.progression.arScanCount += 1;
    const isFirstScan = this.state.progression.arScanCount <= 1;
    this.state.progression.playerXp += isFirstScan ? 20 : 4;
    this.state.progression.creatureXp += isFirstScan ? 25 : 5;
    this.state.progression.playerLevel = calculateLevelFromXp(
      this.state.progression.playerXp,
    ).level;
    this.state.progression.creatureLevel = calculateLevelFromXp(
      this.state.progression.creatureXp,
    ).level;
    syncUnlockedCosmetics(this.state.progression);
    const newlyUnlocked = evaluateAchievements(
      this.state.stats,
      this.state.progression,
    );
    this.persistAndNotify();
    return newlyUnlocked;
  }

  public equipCosmetic(cosmeticId: CosmeticId): boolean {
    if (!isCosmeticUnlocked(cosmeticId, this.state.progression)) {
      return false;
    }
    if (!this.state.progression.unlockedCosmetics.includes(cosmeticId)) {
      this.state.progression.unlockedCosmetics.push(cosmeticId);
    }
    this.state.progression.equippedCosmetic = cosmeticId;
    this.persistAndNotify();
    return true;
  }

  public claimQuest(questId: string): {
    claimed: boolean;
    progression: ProgressionState;
    leveledUpPlayer: boolean;
    leveledUpCreature: boolean;
    newlyUnlockedCosmetics: CosmeticId[];
    newlyUnlockedAchievements: string[];
  } {
    const res = claimKeeperQuest(
      questId,
      this.state.stats,
      this.state.progression,
    );
    if (res.claimed) {
      this.state.progression = res.progression;
      this.persistAndNotify();
    }
    return {
      claimed: res.claimed,
      progression: this.state.progression,
      leveledUpPlayer: res.leveledUpPlayer,
      leveledUpCreature: res.leveledUpCreature,
      newlyUnlockedCosmetics: res.newlyUnlockedCosmetics,
      newlyUnlockedAchievements: res.newlyUnlockedAchievements,
    };
  }

  public claimDaily(): { claimed: boolean; rewardSummary: string } {
    const today = new Date().toISOString().slice(0, 10);
    const res = claimDailyReward(
      this.state.stats,
      this.state.progression,
      today,
    );
    if (res.claimed) {
      this.state.stats = res.stats;
      this.state.progression = res.progression;
      evaluateAchievements(this.state.stats, this.state.progression);
      this.persistAndNotify();
    }
    return { claimed: res.claimed, rewardSummary: res.rewardSummary };
  }

  public updateSettings(partial: Partial<GameSettings>): void {
    this.state.settings = {
      ...this.state.settings,
      ...partial,
    };
    this.persistAndNotify();
  }

  public resetProgress(): void {
    this.state = {
      version: 1,
      stats: { ...DEFAULT_STATS },
      progression: {
        ...DEFAULT_PROGRESSION,
        lastSavedAt: Date.now(),
        unlockedCosmetics: [...DEFAULT_PROGRESSION.unlockedCosmetics],
        unlockedAchievements: [],
        claimedQuests: [],
      },
      settings: { ...this.state.settings },
    };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage error
    }
    this.persistAndNotify();
  }
}

export const storageManager = new StorageManager();
