// Re-export barrel for backward compatibility
// All code has been split into focused modules under ./music/
// This file maintains the original import path for level configs

export {
  createMusicProfile,
  mergeMusicArrangement,
  layerExpressionPresets,
  trackExpressionPresets,
  noiseExpressionPresets,
  arpeggiatorPatterns,
  bassPatterns,
} from './music/index';
