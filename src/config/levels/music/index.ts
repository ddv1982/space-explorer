// Barrel export for music helpers
// Only exports what level configs actually use

export { createMusicProfile, mergeMusicArrangement } from './core';
export {
  layerExpressionPresets,
  trackExpressionPresets,
  noiseExpressionPresets,
} from './expressionPresets';
export { arpeggiatorPatterns, bassPatterns } from './patterns';
