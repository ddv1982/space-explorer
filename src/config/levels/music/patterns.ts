// Arpeggiator pattern helpers for melodic sequences
export const arpeggiatorPatterns = {
  // Upward arpeggio: root -> 3rd -> 5th -> octave
  upTriad: (root: number = 0): (number | null)[] => [
    root, null, root + 4, null, root + 7, null, root + 12, null,
    null, null, root + 7, null, root + 4, null, null, null
  ],

  // Downward arpeggio
  downTriad: (root: number = 0): (number | null)[] => [
    root + 12, null, root + 7, null, root + 4, null, root, null,
    null, null, root + 4, null, root + 7, null, null, null
  ],

  // Up and down pattern
  upDownTriad: (root: number = 0): (number | null)[] => [
    root, null, root + 4, null, root + 7, null, root + 12, null,
    root + 7, null, root + 4, null, null, null, null, null
  ],

  // Gentle cascade for ambient flow
  cascade: (root: number = 0): (number | null)[] => [
    root, null, null, root + 3, null, root + 7, null, null,
    root + 12, null, null, root + 7, null, root + 3, null, null
  ],

  // Flowing river pattern
  flowing: (root: number = 0): (number | null)[] => [
    root, null, root + 2, null, root + 4, null, root + 7, null,
    root + 5, null, root + 4, null, root + 2, null, root, null
  ],

  // Calm ambient sparse pattern
  ambientSparse: (root: number = 0): (number | null)[] => [
    root, null, null, null, root + 7, null, null, null,
    root + 4, null, null, null, root + 12, null, null, null
  ],

  // Pentatonic flow (very pleasing/ASMR-like)
  pentatonic: (root: number = 0): (number | null)[] => [
    root, null, root + 2, null, root + 4, null, root + 7, null,
    root + 9, null, root + 7, null, root + 4, null, root + 2, null
  ],
};

// Helper to create melodic bass patterns that complement arpeggios
export const bassPatterns = {
  // Root-fifth movement
  rootFifth: (root: number = 0): (number | null)[] => [
    root, null, null, null, root + 7, null, null, null,
    root, null, null, null, root - 5, null, null, null
  ],

  // Gentle bass pulse
  gentlePulse: (root: number = 0): (number | null)[] => [
    root, null, null, null, null, null, root + 3, null,
    null, null, root, null, null, null, null, null
  ],

  // Ambient drone bass
  drone: (root: number = 0): (number | null)[] => [
    root, null, null, null, null, null, null, null,
    null, null, root, null, null, null, null, null
  ],
};
