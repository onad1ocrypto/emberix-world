import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROGRESSION, DEFAULT_STATS, getDefaultSettings } from '../constants';
import type { SaveData } from '../types';
import {
  KEEPER_CODE_PREFIX,
  KeeperCodeError,
  decodeKeeperCode,
  encodeKeeperCode,
  keeperChecksum,
} from './keeperCode';

function buildSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: 1,
    stats: { ...DEFAULT_STATS, hunger: 23, happiness: 78, friendship: 71 },
    progression: {
      ...DEFAULT_PROGRESSION,
      petName: 'Blaze',
      playerXp: 1450,
      creatureXp: 980,
      friendshipLevel: 6,
      totalInteractions: 142,
      equippedCosmetic: 'crown',
      unlockedAchievements: ['first_feed'],
      claimedQuests: ['quest_first_feed'],
      lastDailyClaimDate: '2026-11-14',
    },
    settings: { ...getDefaultSettings(), language: 'id' },
    ...overrides,
  };
}

test('Keeper Code round-trips the fields that define a save', async () => {
  const save = buildSave();
  const code = await encodeKeeperCode(save);
  const restored = await decodeKeeperCode(code);

  assert.ok(code.startsWith(KEEPER_CODE_PREFIX), 'code must carry the prefix');
  assert.equal(restored.progression?.petName, 'Blaze');
  assert.equal(restored.progression?.playerXp, 1450);
  assert.equal(restored.progression?.creatureXp, 980);
  assert.equal(restored.stats?.hunger, 23);
  assert.equal(restored.stats?.happiness, 78);
  assert.equal(restored.progression?.equippedCosmetic, 'crown');
  assert.deepEqual(restored.progression?.unlockedAchievements, ['first_feed']);
  assert.deepEqual(restored.progression?.claimedQuests, ['quest_first_feed']);
  assert.equal(restored.settings?.language, 'id');
});

test('Keeper Code survives whitespace added by chat apps', async () => {
  const code = await encodeKeeperCode(buildSave());
  const wrapped = `  ${code.slice(0, 40)}\n${code.slice(40)}\n  `;
  const restored = await decodeKeeperCode(wrapped);
  assert.equal(restored.progression?.petName, 'Blaze');
});

test('Keeper Code falls back to plain JSON when deflate is unavailable', async () => {
  const original = globalThis.CompressionStream;
  // @ts-expect-error simulate a browser without CompressionStream
  delete globalThis.CompressionStream;

  try {
    const code = await encodeKeeperCode(buildSave());
    assert.ok(code.startsWith(`${KEEPER_CODE_PREFIX}j`), 'plain path uses the j tag');
    const restored = await decodeKeeperCode(code);
    assert.equal(restored.progression?.petName, 'Blaze');
  } finally {
    globalThis.CompressionStream = original;
  }
});

test('Keeper Code rejects empty, foreign and damaged input', async () => {
  const code = await encodeKeeperCode(buildSave());

  const cases: Array<[string, string]> = [
    ['', 'empty'],
    ['   ', 'empty'],
    ['hello keeper', 'format'],
    [code.slice(0, code.length - 6), 'checksum'],
    [
      code.slice(0, 20) + (code[20] === 'A' ? 'B' : 'A') + code.slice(21),
      'checksum',
    ],
    ['EMBERIX-znope-', 'format'],
  ];

  for (const [input, expectedCode] of cases) {
    await assert.rejects(
      () => decodeKeeperCode(input),
      (error: unknown) =>
        error instanceof KeeperCodeError && error.code === expectedCode,
      `expected ${expectedCode} for ${JSON.stringify(input.slice(0, 24))}`,
    );
  }
});

test('Keeper checksum is stable and 8 hex characters', () => {
  const first = keeperChecksum('{"v":1}');
  assert.match(first, /^[0-9a-f]{8}$/);
  assert.equal(first, keeperChecksum('{"v":1}'));
  assert.notEqual(first, keeperChecksum('{"v":2}'));
});
