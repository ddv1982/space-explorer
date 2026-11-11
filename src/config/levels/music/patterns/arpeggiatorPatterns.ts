/**
 * Arpeggiator pattern collection split out from patterns.ts
 */

// =============================================================================
// ARPEGGIATOR PATTERNS
// =============================================================================

/**
 * Arpeggiator pattern collection for melodic sequences.
 * All patterns are 16-step sequences (one bar at sixteenth-note resolution).
 */
export const arpeggiatorPatterns = {
  /**
   * Flowing river pattern using major scale degrees
   * Stepwise motion creates a smooth, meandering quality
   */
  flowing: (root: number = 0): (number | null)[] => [
    root,
    null,
    root + 2,
    null,
    root + 4,
    null,
    root + 7,
    null,
    root + 5,
    null,
    root + 4,
    null,
    root + 2,
    null,
    root,
    null,
  ],

  // ============================================================================
  // QUARTAL HARMONY
  // Fourth-based voicings for modern, open, ambiguous harmonic quality
  // ============================================================================

  /**
   * Quartal cascade: stacked perfect fourths (root, 4th, flat-7th, 11th)
   * Creates an open, modern jazz-influenced sound
   */
  quartalCascade: (root: number = 0): (number | null)[] => [
    root,
    null,
    root + 5,
    null,
    root + 10,
    null,
    root + 17,
    null,
    null,
    root + 10,
    null,
    root + 5,
    null,
    root,
    null,
    null,
  ],

  // ============================================================================
  // SUSPENDED CHORDS
  // Tension-building patterns that delay resolution
  // ============================================================================

  /**
   * Sus2 pattern: root → 2nd → 5th → octave
   * Airy, open quality that avoids major/minor definition
   */
  suspended2: (root: number = 0): (number | null)[] => [
    root,
    null,
    root + 2,
    null,
    root + 7,
    null,
    root + 14,
    null,
    root + 7,
    null,
    root + 2,
    null,
    null,
    root + 7,
    null,
    null,
  ],

  /**
   * Sus4 pattern: root → 4th → 5th → octave
   * Anticipatory tension, resolves naturally to major triad
   */
  suspended4: (root: number = 0): (number | null)[] => [
    root,
    null,
    root + 5,
    null,
    root + 7,
    null,
    root + 12,
    null,
    null,
    root + 5,
    null,
    root + 7,
    null,
    root + 5,
    null,
    null,
  ],

  /**
   * Phrygian mode pattern: minor with characteristic flat 2nd
   * Dark, exotic, Spanish/flamenco-influenced quality
   */
  phrygianMystery: (root: number = 0): (number | null)[] => [
    root,
    null,
    root + 1,
    null,
    root + 7,
    null,
    root + 12,
    null,
    root + 7,
    null,
    root + 1,
    null,
    null,
    root + 7,
    null,
    null,
  ],

  // ============================================================================
  // WIDE INTERVAL LEAPS
  // Dramatic octave-spanning patterns for crystalline clarity and space
  // ============================================================================

  /**
   * Wide leap pattern: dramatic octave-plus jumps
   * Creates crystalline clarity and vast spatial impression
   */
  wideLeap: (root: number = 0): (number | null)[] => [
    root,
    null,
    null,
    null,
    root + 12,
    null,
    null,
    root + 7,
    null,
    null,
    root + 19,
    null,
    null,
    root + 12,
    null,
    null,
  ],

  /**
   * Octave dance: alternating between octaves
   * Spacious feel with clear registral separation
   */
  octaveDance: (root: number = 0): (number | null)[] => [
    root,
    null,
    root + 12,
    null,
    root,
    null,
    root + 24,
    null,
    root + 12,
    null,
    root,
    null,
    root + 12,
    null,
    root,
    null,
  ],

  // ============================================================================
  // CALL AND RESPONSE
  // Phrase-based patterns creating musical dialogue
  // ============================================================================

  /**
   * Call and response: question-answer phrasing
   * Classic antecedent-consequent phrase structure
   */
  callResponse: (root: number = 0): (number | null)[] => [
    root,
    root + 4,
    root + 7,
    null,
    null,
    null,
    null,
    null,
    root + 12,
    root + 7,
    root + 4,
    null,
    null,
    null,
    null,
    null,
  ],

  // ============================================================================
  // DELAY/REVERB STYLE
  // Patterns that simulate spatial audio effects
  // ============================================================================

  /**
   * Delay trail: simulating echo repeats dying away
   * Each iteration trails off like a delay effect
   */
  delayTrail: (root: number = 0): (number | null)[] => [
    root,
    null,
    root + 7,
    null,
    root + 4,
    null,
    root + 7,
    null,
    root + 3,
    null,
    root + 7,
    null,
    root + 4,
    null,
    root + 3,
    null,
  ],

  /**
   * Reverb bloom: sparse notes with "afterglow" spaces
   * Resonant, cathedral-like spaciousness
   */
  reverbBloom: (root: number = 0): (number | null)[] => [
    root,
    null,
    null,
    null,
    root + 7,
    null,
    null,
    null,
    null,
    null,
    root + 12,
    null,
    null,
    null,
    root + 7,
    null,
  ],

  // ============================================================================
  // DRIVING / ENERGETIC INTENSITY
  // High-energy patterns for action sequences and chase scenes
  // ============================================================================

  /**
   * Driving pulse: sixteenth-note subdivision with relentless forward momentum
   * Constant motion suitable for pursuit and high-tension scenes
   */
  drivingPulse: (root: number = 0): (number | null)[] => [
    root,
    null,
    root + 4,
    root + 7,
    null,
    root + 4,
    root,
    null,
    root + 7,
    root + 12,
    null,
    root + 7,
    root + 4,
    null,
    root + 7,
    null,
  ],

  /**
   * Aggressive attack: staccato hits for urgency and impact
   * Sharp, percussive articulation for combat scenes
   */
  aggressiveAttack: (root: number = 0): (number | null)[] => [
    root,
    root + 7,
    null,
    root + 12,
    null,
    root + 7,
    root,
    null,
    null,
    root + 12,
    root + 7,
    null,
    root,
    null,
    root + 7,
    root + 12,
  ],

  /**
   * Power chord arpeggio: root-fifth-octave emphasis
   * Heavy, driving sound inspired by rock/metal power chords
   */
  powerChordArp: (root: number = 0): (number | null)[] => [
    root,
    null,
    root + 7,
    null,
    root + 12,
    null,
    root + 7,
    root,
    null,
    root + 12,
    null,
    root + 7,
    null,
    root,
    null,
    root + 12,
  ],

  /**
   * Tension chromatic: chromatic neighbor notes building tension
   * Uses semitone dissonance to create unease and anticipation
   */
  tensionChromatic: (root: number = 0): (number | null)[] => [
    root,
    root + 1,
    root,
    root + 4,
    root,
    root - 1,
    root,
    null,
    root + 7,
    root + 8,
    root + 7,
    root + 4,
    null,
    root + 7,
    root + 6,
    root + 7,
  ],

  /**
   * Forward momentum: rapid ascending drive with push rhythm
   * Continuous upward energy surge for rising action
   */
  forwardMomentum: (root: number = 0): (number | null)[] => [
    root,
    root + 2,
    root + 4,
    root + 7,
    null,
    root + 4,
    root + 7,
    root + 12,
    null,
    root + 7,
    root + 12,
    root + 16,
    null,
    root + 12,
    root + 7,
    root,
  ],

  /**
   * Martial stomp: heavy rhythmic pattern for combat intensity
   * Military-inspired rhythm with strong downbeat emphasis
   */
  martialStomp: (root: number = 0): (number | null)[] => [
    root,
    null,
    null,
    root + 7,
    root + 7,
    null,
    root + 12,
    null,
    root + 7,
    null,
    root,
    null,
    root + 12,
    root + 7,
    root,
    null,
  ],

  /**
   * Urgent dash: quick bursts with strategic rests for breathless energy
   * Fits-and-starts motion suggesting frantic activity
   */
  urgentDash: (root: number = 0): (number | null)[] => [
    root,
    root + 4,
    root + 7,
    root + 12,
    null,
    null,
    root + 7,
    root + 4,
    null,
    null,
    root + 12,
    root + 16,
    null,
    root + 12,
    root + 7,
    null,
  ],

  // ============================================================================
  // CLIMACTIC FINALE PATTERNS: DARK & OMINOUS
  // Maximum tension patterns for final boss encounters and game endings
  // ============================================================================

  /**
   * Claustrophobic tight: dense chromatic clusters
   * For canyon claustrophobia scenes (Obsidian Maw encounters)
   */
  claustrophobicTight: (root: number = 0): (number | null)[] => [
    root,
    root + 1,
    root,
    root + 3,
    root + 1,
    root,
    root + 3,
    root + 1,
    root + 6,
    root + 5,
    root + 6,
    root + 7,
    root + 6,
    root + 5,
    root + 3,
    root,
  ],

  /**
   * Cosmic vastness: sparse wide intervals for void feeling
   * Suggests the emptiness of space (Terminus Black approach)
   */
  cosmicVastness: (root: number = 0): (number | null)[] => [
    root,
    null,
    null,
    null,
    null,
    null,
    root + 12,
    null,
    null,
    null,
    root + 24,
    null,
    null,
    null,
    root + 12,
    null,
  ],

  /**
   * Dark chromatic: flat 2nds and tritones for maximum tension
   * Dissonant intervals create psychological unease
   */
  darkChromatic: (root: number = 0): (number | null)[] => [
    root,
    root + 1,
    null,
    root + 6,
    root + 7,
    null,
    root + 1,
    root,
    root + 6,
    root + 7,
    root + 6,
    null,
    root + 1,
    root,
    null,
    null,
  ],

  /**
   * Ominous drift: slow-moving ominous intervals with threatening accents
   * Gradual movement toward dissonance and back
   */
  ominousDrift: (root: number = 0): (number | null)[] => [
    root,
    null,
    null,
    root + 3,
    null,
    null,
    root + 6,
    null,
    null,
    root + 6,
    null,
    null,
    root + 3,
    null,
    null,
    root,
  ],

  /**
   * Stalking pursuit: relentless rhythmic chase pattern
   * Unyielding forward motion suggesting predatory pursuit
   */
  stalkingPursuit: (root: number = 0): (number | null)[] => [
    root,
    null,
    root + 7,
    root + 7,
    null,
    root + 12,
    null,
    root + 7,
    root,
    null,
    root + 7,
    null,
    root + 12,
    root + 7,
    root,
    null,
  ],

  /**
   * Tension maximum: chromatic cluster buildup for ultimate climax
   * Sequential semitone clusters for peak intensity
   */
  tensionMaximum: (root: number = 0): (number | null)[] => [
    root,
    root + 1,
    root + 2,
    root + 3,
    null,
    root + 2,
    root + 1,
    root,
    root + 7,
    root + 8,
    root + 7,
    root + 6,
    null,
    root + 7,
    root + 8,
    root + 7,
  ],

  /**
   * Final boss intensity: maximum intensity for final confrontations
   * Dense, powerful pattern for ultimate encounters
   */
  finalBossIntensity: (root: number = 0): (number | null)[] => [
    root,
    root + 7,
    root + 12,
    root + 7,
    root,
    root + 7,
    root + 12,
    root + 19,
    root + 12,
    root + 7,
    root,
    root + 7,
    root + 12,
    root + 7,
    root,
    null,
  ],

  /**
   * Void beacon: distant, haunting intervals emerging from darkness
   * Suggests signals from an unknown source in deep space
   */
  voidBeacon: (root: number = 0): (number | null)[] => [
    root,
    null,
    null,
    null,
    root + 7,
    null,
    null,
    null,
    null,
    root + 12,
    null,
    null,
    null,
    root + 7,
    null,
    null,
  ],
};
