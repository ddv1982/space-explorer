import { getLevelConfig, getTotalLevels } from '../config/LevelsConfig';
import { describeShipSystems } from '../config/shipSystems';
import { normalizeDeathCause } from './PlayerDamage';
import type { PlayerStateData, RunSummaryData } from './PlayerState';
import { normalizePersistedPlayerState, normalizePersistedScore } from './PlayerState';

export const SAVE_SLOT_STORAGE_KEY = 'space-explorer.saveSlots.v1';
export const SAVE_SLOT_ENTRY_STORAGE_KEY_PREFIX = 'space-explorer.saveSlot.v2.';
/** The slots the player saves to from the pause panel. */
export const MANUAL_SAVE_SLOT_IDS = ['slot-1', 'slot-2', 'slot-3'] as const;
/** Written on leaving the refit bay and cleared when the run ends, so it never offers a dead run. */
export const AUTOSAVE_SLOT_ID = 'autosave';
/** Every stored slot in menu order: the autosave holds the latest progress, so it leads. */
export const SAVE_SLOT_IDS = [AUTOSAVE_SLOT_ID, ...MANUAL_SAVE_SLOT_IDS] as const;

export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

interface SaveSlotLabel {
  level: number;
  levelName: string;
  score: number;
  remainingLives: number;
}

export interface SaveSlotRecordV1 {
  version: 1;
  id: SaveSlotId;
  savedAt: string;
  playerState: PlayerStateData;
  runSummary: RunSummaryData;
  label: SaveSlotLabel;
}

interface SaveSlotsEnvelopeV1 {
  version: 1;
  slots: Partial<Record<SaveSlotId, SaveSlotRecordV1>>;
}

interface SaveSlotEntryV2 {
  version: 2;
  id: SaveSlotId;
  deleted: boolean;
  record?: SaveSlotRecordV1;
}

export interface SaveSlotViewModel {
  id: SaveSlotId;
  occupied: boolean;
  title: string;
  subtitle: string;
  /** The picked ship systems, e.g. `SYSTEMS: LANCE · MAGNET`; empty when there are none. */
  systemsLabel: string;
  savedAtLabel: string;
}

const SAVE_SLOTS_VERSION = 1 as const;

function getDefaultEnvelope(): SaveSlotsEnvelopeV1 {
  return {
    version: SAVE_SLOTS_VERSION,
    slots: {},
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSaveSlotId(value: unknown): value is SaveSlotId {
  return typeof value === 'string' && SAVE_SLOT_IDS.includes(value as SaveSlotId);
}

function normalizeFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  return Math.max(1, Math.floor(normalizeFiniteNumber(value, fallback)));
}

function normalizeKnownLevel(value: unknown, fallback: number): number {
  const totalLevels = Math.max(1, Math.floor(normalizeFiniteNumber(getTotalLevels(), 1)));
  return Math.min(totalLevels, normalizePositiveInteger(value, fallback));
}

function getSafeLevelName(level: number): string {
  try {
    const levelName = getLevelConfig(level).name;
    return typeof levelName === 'string' && levelName.length > 0
      ? levelName
      : `Level ${Math.max(1, Math.floor(normalizeFiniteNumber(level, 1)))}`;
  } catch {
    return `Level ${Math.max(1, Math.floor(normalizeFiniteNumber(level, 1)))}`;
  }
}

function normalizePlayerStateData(value: unknown): PlayerStateData | null {
  if (!isObjectRecord(value) || !isObjectRecord(value.upgrades)) {
    return null;
  }

  return normalizePersistedPlayerState({
    ...value,
    level: normalizeKnownLevel(value.level, 1),
  });
}

function normalizeRunSummaryData(value: unknown, fallbackLevel: number, fallbackScore: number): RunSummaryData {
  if (!isObjectRecord(value)) {
    return {
      finalScore: fallbackScore,
      deathCause: null,
      levelReached: normalizeKnownLevel(fallbackLevel, 1),
    };
  }

  return {
    finalScore: normalizePersistedScore(value.finalScore, fallbackScore),
    deathCause: normalizeDeathCause(value.deathCause),
    levelReached: normalizeKnownLevel(value.levelReached, fallbackLevel),
  };
}

function normalizeSaveSlotLabel(_value: unknown, playerState: PlayerStateData): SaveSlotLabel {
  const level = playerState.level;

  return {
    level,
    levelName: getSafeLevelName(level),
    score: playerState.score,
    remainingLives: playerState.remainingLives,
  };
}

function normalizeSaveSlotRecord(value: unknown, expectedId: SaveSlotId): SaveSlotRecordV1 | null {
  if (!isObjectRecord(value) || value.version !== SAVE_SLOTS_VERSION || !isSaveSlotId(value.id)) {
    return null;
  }

  if (value.id !== expectedId) {
    return null;
  }

  const playerState = normalizePlayerStateData(value.playerState);
  if (!playerState) {
    return null;
  }

  return {
    version: SAVE_SLOTS_VERSION,
    id: expectedId,
    savedAt: typeof value.savedAt === 'string' ? value.savedAt : new Date(0).toISOString(),
    playerState,
    runSummary: normalizeRunSummaryData(value.runSummary, playerState.level, playerState.score),
    label: normalizeSaveSlotLabel(value.label, playerState),
  };
}

function normalizeEnvelope(value: unknown): SaveSlotsEnvelopeV1 {
  if (!isObjectRecord(value) || value.version !== SAVE_SLOTS_VERSION) {
    return getDefaultEnvelope();
  }

  const slots: Partial<Record<SaveSlotId, SaveSlotRecordV1>> = {};
  const rawSlots = isObjectRecord(value.slots) ? value.slots : {};

  for (const slotId of SAVE_SLOT_IDS) {
    try {
      const normalizedRecord = normalizeSaveSlotRecord(rawSlots[slotId], slotId);
      if (normalizedRecord) {
        slots[slotId] = normalizedRecord;
      }
    } catch {
      // Ignore only the bad slot; other slots should remain visible/loadable.
    }
  }

  return {
    version: SAVE_SLOTS_VERSION,
    slots,
  };
}

const STORAGE_PROBE_KEY = 'space-explorer.storageProbe';

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return null;
  }

  try {
    const storage = window.localStorage;
    storage.setItem(STORAGE_PROBE_KEY, '1');
    storage.removeItem(STORAGE_PROBE_KEY);
    return storage;
  } catch {
    return null;
  }
}

function readEnvelope(): SaveSlotsEnvelopeV1 {
  const storage = getStorage();
  if (!storage) {
    return getDefaultEnvelope();
  }

  let envelope = getDefaultEnvelope();
  try {
    const rawValue = storage.getItem(SAVE_SLOT_STORAGE_KEY);
    if (rawValue) envelope = normalizeEnvelope(JSON.parse(rawValue));
  } catch {
    // A corrupt legacy envelope must not hide valid per-slot entries.
  }

  for (const slotId of SAVE_SLOT_IDS) {
    const override = readSlotEntry(storage, slotId);
    if (override === null) {
      delete envelope.slots[slotId];
    } else if (override) {
      envelope.slots[slotId] = override;
    }
  }
  return envelope;
}

function readSlotEntry(storage: Storage, id: SaveSlotId): SaveSlotRecordV1 | null | undefined {
  try {
    const rawValue = storage.getItem(`${SAVE_SLOT_ENTRY_STORAGE_KEY_PREFIX}${id}`);
    if (!rawValue) return undefined;

    const value: unknown = JSON.parse(rawValue);
    if (!isObjectRecord(value) || value.version !== 2 || value.id !== id || typeof value.deleted !== 'boolean') {
      return undefined;
    }
    if (value.deleted) return null;
    return normalizeSaveSlotRecord(value.record, id) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeSlotEntry(entry: SaveSlotEntryV2): boolean {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(`${SAVE_SLOT_ENTRY_STORAGE_KEY_PREFIX}${entry.id}`, JSON.stringify(entry));
    return true;
  } catch {
    return false;
  }
}

function formatLivesLabel(remainingLives: number): string {
  return `${remainingLives} ${remainingLives === 1 ? 'LIFE' : 'LIVES'}`;
}

function formatSavedAtLabel(savedAt: string): string {
  const parsed = new Date(savedAt);
  if (Number.isNaN(parsed.getTime())) {
    return 'UNKNOWN DATE';
  }

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const hour = `${parsed.getHours()}`.padStart(2, '0');
  const minute = `${parsed.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/** What the player calls a slot: `SLOT 1` or `AUTOSAVE`. */
export function getSaveSlotName(id: SaveSlotId): string {
  return id === AUTOSAVE_SLOT_ID ? 'AUTOSAVE' : `SLOT ${id.slice(-1)}`;
}

function toViewModel(id: SaveSlotId, record: SaveSlotRecordV1 | null): SaveSlotViewModel {
  const name = getSaveSlotName(id);
  if (!record) {
    return {
      id,
      occupied: false,
      title: name,
      subtitle: 'EMPTY',
      systemsLabel: '',
      savedAtLabel: '',
    };
  }

  const label = normalizeSaveSlotLabel(record.label, record.playerState);

  return {
    id,
    occupied: true,
    title: `${name} — ${label.levelName.toUpperCase()}`,
    subtitle: `LVL ${label.level} • SCORE ${label.score} • ${formatLivesLabel(label.remainingLives)}`,
    systemsLabel: describeShipSystems(record.playerState.systems),
    savedAtLabel: formatSavedAtLabel(record.savedAt),
  };
}

function clonePlayerState(playerState: PlayerStateData): PlayerStateData {
  return {
    ...playerState,
    upgrades: { ...playerState.upgrades },
    helperWing: {
      grantedSlots: playerState.helperWing.grantedSlots,
      slots: playerState.helperWing.slots.map((slot) => ({ ...slot })),
    },
  };
}

export function isSaveStorageAvailable(): boolean {
  return getStorage() !== null;
}

export function listSaveSlots(): SaveSlotViewModel[] {
  const envelope = readEnvelope();
  return SAVE_SLOT_IDS.map((id) => toViewModel(id, envelope.slots[id] ?? null));
}

export function readSaveSlot(id: SaveSlotId): SaveSlotRecordV1 | null {
  const envelope = readEnvelope();
  return envelope.slots[id] ?? null;
}

export function writeSaveSlot(record: SaveSlotRecordV1): SaveSlotRecordV1 | null {
  const normalizedRecord = normalizeSaveSlotRecord(record, record.id);
  if (!normalizedRecord) {
    return null;
  }

  if (
    !writeSlotEntry({
      version: 2,
      id: normalizedRecord.id,
      deleted: false,
      record: normalizedRecord,
    })
  ) {
    return null;
  }

  return normalizedRecord;
}

export function deleteSaveSlot(id: SaveSlotId): boolean {
  if (!readSaveSlot(id)) {
    return true;
  }

  return writeSlotEntry({ version: 2, id, deleted: true });
}

export function createSaveSlotRecord(
  id: SaveSlotId,
  playerState: PlayerStateData,
  runSummary: RunSummaryData,
  savedAt: Date = new Date()
): SaveSlotRecordV1 {
  const normalizedPlayerState = normalizePlayerStateData(playerState) ?? playerState;

  return {
    version: SAVE_SLOTS_VERSION,
    id,
    savedAt: savedAt.toISOString(),
    playerState: clonePlayerState(normalizedPlayerState),
    runSummary: normalizeRunSummaryData(runSummary, normalizedPlayerState.level, normalizedPlayerState.score),
    label: {
      level: normalizedPlayerState.level,
      levelName: getSafeLevelName(normalizedPlayerState.level),
      score: normalizedPlayerState.score,
      remainingLives: normalizedPlayerState.remainingLives,
    },
  };
}
