import { getLevelConfig, getTotalLevels } from '../config/LevelsConfig';
import type {
  PersistentHelperWingSlotState,
  PersistentHelperWingState,
  PlayerStateData,
  RunSummaryData,
} from './PlayerState';

export const SAVE_SLOT_STORAGE_KEY = 'space-explorer.saveSlots.v1';
const SAVE_SLOT_IDS = ['slot-1', 'slot-2', 'slot-3'] as const;

export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

export interface SaveSlotLabel {
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

export interface SaveSlotViewModel {
  id: SaveSlotId;
  index: number;
  occupied: boolean;
  title: string;
  subtitle: string;
  savedAtLabel: string;
}

const SAVE_SLOTS_VERSION = 1 as const;
const MAX_HELPER_WING_SAVE_SLOTS = 4;

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

function normalizeHelperWingSlotState(slot: unknown): PersistentHelperWingSlotState {
  if (!isObjectRecord(slot)) {
    return { remainingLives: 0, hp: 0 };
  }

  const remainingLives =
    typeof slot.remainingLives === 'number' ? Math.max(0, Math.floor(slot.remainingLives)) : 0;
  const hp = typeof slot.hp === 'number' ? Math.max(0, Math.round(slot.hp)) : 0;

  return { remainingLives, hp };
}

function normalizeHelperWingState(value: unknown): PersistentHelperWingState {
  if (!isObjectRecord(value)) {
    return { slots: [], grantedSlots: 0 };
  }

  const slotsInput = Array.isArray(value.slots) ? value.slots.slice(0, MAX_HELPER_WING_SAVE_SLOTS) : [];
  const normalizedSlots = slotsInput.map((slot) => normalizeHelperWingSlotState(slot));
  const rawGrantedSlots =
    typeof value.grantedSlots === 'number'
      ? Math.min(MAX_HELPER_WING_SAVE_SLOTS, Math.max(0, Math.floor(value.grantedSlots)))
      : normalizedSlots.length;
  const grantedSlots = Math.min(MAX_HELPER_WING_SAVE_SLOTS, Math.max(rawGrantedSlots, normalizedSlots.length));
  const slots = normalizedSlots.slice(0, grantedSlots);

  while (slots.length < grantedSlots) {
    slots.push({ remainingLives: 0, hp: 0 });
  }

  return {
    slots,
    grantedSlots,
  };
}

function normalizeFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeNonNegativeInteger(value: unknown, fallback: number): number {
  return Math.max(0, Math.floor(normalizeFiniteNumber(value, fallback)));
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
    return getLevelConfig(level).name;
  } catch {
    return `Level ${Math.max(1, Math.floor(normalizeFiniteNumber(level, 1)))}`;
  }
}

function normalizePlayerStateData(value: unknown): PlayerStateData | null {
  if (!isObjectRecord(value) || !isObjectRecord(value.upgrades)) {
    return null;
  }

  const upgrades = {
    hp: normalizeNonNegativeInteger(value.upgrades.hp, 0),
    damage: normalizeNonNegativeInteger(value.upgrades.damage, 0),
    fireRate: normalizeNonNegativeInteger(value.upgrades.fireRate, 0),
    shield: normalizeNonNegativeInteger(value.upgrades.shield, 0),
  };
  const maxShields = Math.max(0, upgrades.shield);
  const rawCurrentShields = normalizeFiniteNumber(value.currentShields, maxShields);

  return {
    level: normalizeKnownLevel(value.level, 1),
    score: normalizeFiniteNumber(value.score, 0),
    currentHp: normalizeFiniteNumber(value.currentHp, 5),
    currentShields: Math.max(0, Math.min(Math.floor(rawCurrentShields), maxShields)),
    remainingLives: normalizeNonNegativeInteger(value.remainingLives, 3),
    upgrades,
    helperWing: normalizeHelperWingState(value.helperWing),
  };
}

function normalizeRunSummaryData(value: unknown, fallbackLevel: number, fallbackScore: number): RunSummaryData {
  if (!isObjectRecord(value)) {
    return {
      finalScore: fallbackScore,
      levelReached: normalizeKnownLevel(fallbackLevel, 1),
    };
  }

  return {
    finalScore: typeof value.finalScore === 'number' ? value.finalScore : fallbackScore,
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

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readEnvelope(): SaveSlotsEnvelopeV1 {
  const storage = getStorage();
  if (!storage) {
    return getDefaultEnvelope();
  }

  try {
    const rawValue = storage.getItem(SAVE_SLOT_STORAGE_KEY);
    if (!rawValue) {
      return getDefaultEnvelope();
    }

    return normalizeEnvelope(JSON.parse(rawValue));
  } catch {
    return getDefaultEnvelope();
  }
}

function writeEnvelope(envelope: SaveSlotsEnvelopeV1): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(SAVE_SLOT_STORAGE_KEY, JSON.stringify(envelope));
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

function toViewModel(id: SaveSlotId, index: number, record: SaveSlotRecordV1 | null): SaveSlotViewModel {
  if (!record) {
    return {
      id,
      index,
      occupied: false,
      title: `SLOT ${index}`,
      subtitle: 'EMPTY',
      savedAtLabel: '',
    };
  }

  return {
    id,
    index,
    occupied: true,
    title: `SLOT ${index} — ${record.label.levelName.toUpperCase()}`,
    subtitle: `LVL ${record.label.level} • SCORE ${record.label.score} • ${formatLivesLabel(record.label.remainingLives)}`,
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
  return SAVE_SLOT_IDS.map((id, index) => toViewModel(id, index + 1, envelope.slots[id] ?? null));
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

  const envelope = readEnvelope();
  envelope.slots[normalizedRecord.id] = normalizedRecord;

  if (!writeEnvelope(envelope)) {
    return null;
  }

  return normalizedRecord;
}

export function deleteSaveSlot(id: SaveSlotId): boolean {
  const envelope = readEnvelope();
  if (!envelope.slots[id]) {
    return true;
  }

  delete envelope.slots[id];
  return writeEnvelope(envelope);
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
