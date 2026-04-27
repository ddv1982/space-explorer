import Phaser from 'phaser';
import { PauseStateController, type PauseSaveSlotAdapter } from './PauseStateController';
import { MobileViewportGuard } from '../../systems/MobileViewportGuard';
import { audioManager } from '../../systems/AudioManager';
import type { MobileControls } from '../../systems/MobileControls';
import {
  getRunSummary,
  setPlayerState,
  setRunSummary,
  type PlayerStateData,
} from '../../systems/PlayerState';
import {
  createSaveSlotRecord,
  deleteSaveSlot,
  isSaveStorageAvailable,
  listSaveSlots,
  readSaveSlot,
  writeSaveSlot,
} from '../../systems/SaveSlotStorage';
import { startRegisteredScene } from '../sceneRegistry';

interface PauseViewportWiringContext {
  scene: Phaser.Scene;
  stopPlayerMotion: () => void;
  getMobileControls: () => MobileControls | null;
  captureCurrentRunStateForSave: () => PlayerStateData;
  canSaveCurrentRun: () => boolean;
}

interface PauseViewportWiring {
  pauseStateController: PauseStateController;
  mobileViewportGuard: MobileViewportGuard;
}

function createPauseSaveSlotAdapter(context: PauseViewportWiringContext): PauseSaveSlotAdapter {
  let gameTransitionQueued = false;

  return {
    isAvailable: () => isSaveStorageAvailable(),
    list: () => listSaveSlots(),
    canSave: () => context.canSaveCurrentRun(),
    save: (slotId) => {
      const playerState = context.captureCurrentRunStateForSave();
      const record = createSaveSlotRecord(slotId, playerState, getRunSummary(context.scene.registry));
      const writtenRecord = writeSaveSlot(record);

      if (!writtenRecord) {
        return { ok: false, message: 'Save failed. Browser storage rejected the checkpoint.' };
      }

      return { ok: true, message: `Saved ${writtenRecord.label.levelName} checkpoint to slot ${writtenRecord.id.slice(-1)}.` };
    },
    load: (slotId) => {
      const record = readSaveSlot(slotId);
      if (!record) {
        return { ok: false, message: 'No checkpoint stored in that slot.' };
      }

      if (gameTransitionQueued) {
        return { ok: false, message: 'Checkpoint load already in progress.' };
      }

      gameTransitionQueued = true;
      context.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        setPlayerState(context.scene.registry, record.playerState);
        setRunSummary(context.scene.registry, record.runSummary);
      });
      startRegisteredScene(context.scene, 'Game');
      return { ok: true, message: `Loading ${record.label.levelName} checkpoint...` };
    },
    delete: (slotId) => {
      if (!deleteSaveSlot(slotId)) {
        return { ok: false, message: 'Delete failed. Browser storage rejected the update.' };
      }

      return { ok: true, message: `Slot ${slotId.slice(-1)} checkpoint cleared.` };
    },
  };
}

export function createPauseViewportWiring(context: PauseViewportWiringContext): PauseViewportWiring {
  const pauseStateController = PauseStateController.create({
    scene: context.scene,
    stopPlayerMotion: context.stopPlayerMotion,
    setMobileControlsBlocked: (blocked) => context.getMobileControls()?.setBlocked(blocked),
    onReturnToMenu: () => {
      audioManager.stopMusic();
      context.scene.scene.start('Menu');
    },
    saveSlotAdapter: createPauseSaveSlotAdapter(context),
  });

  const mobileViewportGuard = MobileViewportGuard.create(context.scene, (blocked) => {
    pauseStateController.setOrientationBlocked(blocked);
  });

  pauseStateController.setOrientationBlocked(mobileViewportGuard.isBlocked());

  return {
    pauseStateController,
    mobileViewportGuard,
  };
}
