import type {
  AppLanguage,
  CosmeticId,
  DanceTrackId,
  GraphicsQuality,
  SaveData,
} from '../types';

/**
 * Keeper Code — a short, copy-pasteable snapshot of a save.
 *
 * Accounts live in `localStorage`, so progress is tied to one browser. A Keeper
 * Code lets a player carry their save to another device without any backend:
 * the save is narrowed to the fields that matter, serialised to JSON, deflated
 * (when the platform supports it) and base64url-encoded.
 *
 * Format: `EMBERIX-<tag><checksum8>-<payload>`
 *   tag        'z' = deflate-raw, 'j' = plain JSON
 *   checksum8  djb2 of the JSON string, 8 lowercase hex chars
 *
 * The code carries no identity and no password — restoring it only replaces
 * the active save. Untrusted input is always passed through the storage
 * layer's `hydrateSaveData`, which clamps and defaults every field.
 */

export const KEEPER_CODE_PREFIX = 'EMBERIX-';

const COMPACT_VERSION = 1;
/** Guards against absurdly large pastes before we try to inflate them. */
const MAX_CODE_LENGTH = 8000;

export type KeeperCodeErrorCode =
  | 'empty'
  | 'format'
  | 'checksum'
  | 'version'
  | 'unsupported';

export class KeeperCodeError extends Error {
  public readonly code: KeeperCodeErrorCode;

  constructor(code: KeeperCodeErrorCode, message: string) {
    super(message);
    this.name = 'KeeperCodeError';
    this.code = code;
  }
}

export interface CompactKeeperSave {
  v: number;
  /** [hunger, happiness, energy, friendship, isSleeping (0 | 1)] */
  st: [number, number, number, number, 0 | 1];
  pr: {
    n: string;
    px: number;
    cx: number;
    fl: number;
    ti: number;
    fc: number;
    pc: number;
    plc: number;
    dc: number;
    asc: number;
    sc: number;
    ec: CosmeticId;
    ua: string[];
    lq: string[];
    lld: string;
  };
  se: {
    l: AppLanguage;
    mv: number;
    sv: number;
    mu: boolean;
    gq: GraphicsQuality;
    cs: number;
    dt: DanceTrackId;
    bt?: string;
  };
}

export function toCompactSave(save: SaveData): CompactKeeperSave {
  const { stats, progression, settings } = save;
  return {
    v: COMPACT_VERSION,
    st: [
      Math.round(stats.hunger),
      Math.round(stats.happiness),
      Math.round(stats.energy),
      Math.round(stats.friendship),
      stats.isSleeping ? 1 : 0,
    ],
    pr: {
      n: progression.petName,
      px: progression.playerXp,
      cx: progression.creatureXp,
      fl: progression.friendshipLevel,
      ti: progression.totalInteractions,
      fc: progression.feedCount,
      pc: progression.petCount,
      plc: progression.playCount,
      dc: progression.danceCount,
      asc: progression.arScanCount,
      sc: progression.selfieCount ?? 0,
      ec: progression.equippedCosmetic,
      ua: [...progression.unlockedAchievements],
      lq: [...(progression.claimedQuests ?? [])],
      lld: progression.lastDailyClaimDate ?? '',
    },
    se: {
      l: settings.language,
      mv: settings.musicVolume,
      sv: settings.sfxVolume,
      mu: settings.muted,
      gq: settings.graphicsQuality,
      cs: settings.cameraSensitivity,
      dt: settings.selectedDanceTrack,
      bt: settings.selectedBgmTrack,
    },
  };
}

/**
 * Turns a compact payload back into the loose shape `StorageManager` accepts.
 * Every value here is still untrusted — the storage layer sanitises it.
 */
export function fromCompactSave(compact: CompactKeeperSave): Partial<SaveData> {
  const st = compact.st;
  return {
    stats: {
      hunger: st[0],
      happiness: st[1],
      energy: st[2],
      friendship: st[3],
      isSleeping: st[4] === 1,
    },
    progression: {
      petName: compact.pr.n,
      playerXp: compact.pr.px,
      creatureXp: compact.pr.cx,
      friendshipLevel: compact.pr.fl,
      totalInteractions: compact.pr.ti,
      feedCount: compact.pr.fc,
      petCount: compact.pr.pc,
      playCount: compact.pr.plc,
      danceCount: compact.pr.dc,
      arScanCount: compact.pr.asc,
      selfieCount: compact.pr.sc,
      equippedCosmetic: compact.pr.ec,
      // Recomputed by `hydrateSaveData` from XP / creature level. The values
      // here only satisfy the type and are never trusted.
      playerLevel: 1,
      creatureLevel: 1,
      unlockedCosmetics: [],
      lastSavedAt: Date.now(),
      unlockedAchievements: compact.pr.ua,
      claimedQuests: compact.pr.lq,
      lastDailyClaimDate: compact.pr.lld,
    },
    settings: {
      language: compact.se.l,
      musicVolume: compact.se.mv,
      sfxVolume: compact.se.sv,
      muted: compact.se.mu,
      graphicsQuality: compact.se.gq,
      cameraSensitivity: compact.se.cs,
      selectedDanceTrack: compact.se.dt,
      selectedBgmTrack: compact.se.bt as SaveData['settings']['selectedBgmTrack'],
    },
  };
}

export function keeperChecksum(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(payload: string): Uint8Array {
  const normalised = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalised.length % 4)) % 4;
  const binary = atob(normalised + '='.repeat(padLength));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  const CompressionStreamCtor = (
    globalThis as unknown as { CompressionStream?: typeof CompressionStream }
  ).CompressionStream;
  if (typeof CompressionStreamCtor !== 'function') return null;
  try {
    const stream = new Blob([bytes as BlobPart])
      .stream()
      .pipeThrough(new CompressionStreamCtor('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const DecompressionStreamCtor = (
    globalThis as unknown as { DecompressionStream?: typeof DecompressionStream }
  ).DecompressionStream;
  if (typeof DecompressionStreamCtor !== 'function') {
    throw new KeeperCodeError(
      'unsupported',
      'This browser cannot unpack compressed Keeper Codes.',
    );
  }
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStreamCtor('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodeKeeperCode(save: SaveData): Promise<string> {
  const json = JSON.stringify(toCompactSave(save));
  const checksum = keeperChecksum(json);
  const raw = new TextEncoder().encode(json);
  const compressed = await deflateRaw(raw);
  const tag = compressed ? 'z' : 'j';
  const bytes = compressed ?? raw;
  return `${KEEPER_CODE_PREFIX}${tag}${checksum}-${bytesToBase64Url(bytes)}`;
}

export async function decodeKeeperCode(
  input: string,
): Promise<Partial<SaveData>> {
  const cleaned = (input || '').replace(/\s+/g, '');
  if (!cleaned) {
    throw new KeeperCodeError('empty', 'Paste a Keeper Code first.');
  }
  if (cleaned.length > MAX_CODE_LENGTH) {
    throw new KeeperCodeError('format', 'That text is too long to be a Keeper Code.');
  }
  if (!cleaned.toUpperCase().startsWith(KEEPER_CODE_PREFIX)) {
    throw new KeeperCodeError(
      'format',
      'Keeper Codes start with EMBERIX-.',
    );
  }

  const body = cleaned.slice(KEEPER_CODE_PREFIX.length);
  const tag = body.charAt(0);
  const checksum = body.slice(1, 9).toLowerCase();
  const payload = body.slice(10); // tag(1) + checksum(8) + '-'(1)

  if ((tag !== 'z' && tag !== 'j') || body.charAt(9) !== '-' || !payload) {
    throw new KeeperCodeError('format', 'Keeper Code is incomplete.');
  }

  let json: string;
  try {
    const bytes = base64UrlToBytes(payload);
    const decoded = tag === 'z' ? await inflateRaw(bytes) : bytes;
    json = new TextDecoder().decode(decoded);
  } catch (error) {
    if (error instanceof KeeperCodeError) throw error;
    // The header looked right, so the payload was probably truncated or
    // mistyped — report it as damage rather than as "not a code".
    throw new KeeperCodeError(
      tag === 'z' ? 'checksum' : 'format',
      'Keeper Code looks damaged — check for missing characters.',
    );
  }

  if (keeperChecksum(json) !== checksum) {
    throw new KeeperCodeError(
      'checksum',
      'Keeper Code looks damaged — check for missing characters.',
    );
  }

  let compact: CompactKeeperSave;
  try {
    compact = JSON.parse(json) as CompactKeeperSave;
  } catch {
    throw new KeeperCodeError('format', 'Keeper Code could not be read.');
  }

  if (!compact || typeof compact !== 'object' || !Array.isArray(compact.st)) {
    throw new KeeperCodeError('format', 'Keeper Code could not be read.');
  }
  if (compact.v !== COMPACT_VERSION) {
    throw new KeeperCodeError(
      'version',
      'This Keeper Code was made by a different version of the game.',
    );
  }

  return fromCompactSave(compact);
}
