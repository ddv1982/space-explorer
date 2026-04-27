/**
 * Bass pattern collection split out from patterns.ts
 */

// =============================================================================
// BASS PATTERNS (20 total)
// =============================================================================

/**
 * Bass pattern collection for harmonic foundation and rhythmic support.
 * Designed to complement arpeggiator patterns and provide low-end energy.
 */
export const bassPatterns = {
  // ============================================================================
  // FOUNDATION PATTERNS (3 patterns)
  // Basic bass movement for general harmonic support
  // ============================================================================

  /**
   * Root-fifth movement: alternating root and perfect fifth
   * Classic bass foundation pattern for stability
   */
  rootFifth: (root: number = 0): (number | null)[] => [
    root, null, null, null, root + 7, null, null, null,
    root, null, null, null, root - 5, null, null, null
  ],

  /**
   * Gentle bass pulse: sparse triadic movement
   * Soft rhythmic foundation for calm exploration
   */
  gentlePulse: (root: number = 0): (number | null)[] => [
    root, null, null, null, null, null, root + 3, null,
    null, null, root, null, null, null, null, null
  ],

  /**
   * Ambient drone: sustained tone with minimal variation
   * Long sustained notes for atmospheric backgrounds
   */
  drone: (root: number = 0): (number | null)[] => [
    root, null, null, null, null, null, null, null,
    null, null, root, null, null, null, null, null
  ],

  // ============================================================================
  // WALKING BASS VARIATIONS (2 patterns)
  // Stepwise melodic motion for momentum and forward drive
  // ============================================================================

  /**
   * Walking bass: continuous stepwise motion through chord tones
   * Jazz-influenced melodic bass line with passing tones
   */
  walking: (root: number = 0): (number | null)[] => [
    root, null, root + 2, null, root + 4, null, root + 5, null,
    root + 7, null, root + 5, null, root + 4, null, root + 2, null
  ],

  /**
   * Sparse walk: simplified walking bass with rests
   * Creates space while maintaining stepwise momentum
   */
  sparseWalk: (root: number = 0): (number | null)[] => [
    root, null, null, root + 2, null, null, root + 4, null,
    null, root + 5, null, null, root, null, null, null
  ],

  // ============================================================================
  // OSTINATO (REPEATING FIGURES) (2 patterns)
  // Rhythmic patterns that repeat consistently for hypnotic effect
  // ============================================================================

  /**
   * Rhythmic ostinato: repeating 4-note figure
   * Consistent rhythmic cell for hypnotic drive
   */
  rhythmicOstinato: (root: number = 0): (number | null)[] => [
    root, null, root + 7, null, root + 12, null, root + 7, null,
    root, null, root + 7, null, root + 12, null, root + 7, null
  ],

  /**
   * Syncopated ostinato: off-beat emphasis pattern
   * Shifts rhythmic weight to weak beats for groove
   */
  syncopatedOstinato: (root: number = 0): (number | null)[] => [
    null, root, null, null, root + 7, null, null, root + 12,
    null, null, root + 7, null, null, root, null, null
  ],

  // ============================================================================
  // PEDAL TONE / DRONE VARIATIONS (2 patterns)
  // Sustained harmonic anchors for stability and tension
  // ============================================================================

  /**
   * Pedal fifths: alternating root and fifth for harmonic anchor
   * Creates a solid foundation that supports harmonic changes above
   */
  pedalFifths: (root: number = 0): (number | null)[] => [
    root, null, null, null, root + 7, null, null, null,
    root + 7, null, null, null, root, null, null, null
  ],

  /**
   * Low drone: sustained low register with sparse accents
   * Deep sub-bass foundation for ominous atmospheres
   */
  lowDrone: (root: number = 0): (number | null)[] => [
    root - 12, null, null, null, null, null, root - 12, null,
    null, null, null, null, root - 12, null, null, null
  ],

  // ============================================================================
  // SYNCOPATED RHYTHMIC BASS (2 patterns)
  // Off-beat patterns for rhythmic interest and groove
  // ============================================================================

  /**
   * Syncopated bounce: off-beat rhythm for groove
   * Emphasizes the "and" of beats for funky feel
   */
  syncopatedBounce: (root: number = 0): (number | null)[] => [
    root, null, null, root + 7, null, null, root, null,
    null, root + 12, null, null, root + 7, null, null, null
  ],

  /**
   * Push rhythm: anticipation hits before the beat
   * Creates forward-leaning rhythmic tension
   */
  pushRhythm: (root: number = 0): (number | null)[] => [
    null, root, null, root + 7, null, root, null, root + 12,
    null, root + 7, null, root, null, null, null, null
  ],

  // ============================================================================
  // DRIVING BASS PATTERNS FOR INTENSITY (4 patterns)
  // High-energy bass for action sequences and combat
  // ============================================================================

  /**
   * Driving pulse bass: relentless rhythmic drive with octave punch
   * Powerful bass pattern for high-tension scenes
   */
  drivingPulseBass: (root: number = 0): (number | null)[] => [
    root, null, root + 12, null, root + 7, null, root + 12, null,
    root, null, root + 7, root + 12, null, root + 7, null, root
  ],

  /**
   * Aggressive bass: heavy attack pattern with staccato feel
   * Sharp, percussive bass for combat intensity
   */
  aggressiveBass: (root: number = 0): (number | null)[] => [
    root, root + 7, null, null, root + 12, null, root + 7, null,
    root, null, null, root + 12, root + 7, null, root, null
  ],

  /**
   * Power chord bass: root-fifth-octave power drive
   * Heavy bass pattern inspired by rock/metal
   */
  powerChordBass: (root: number = 0): (number | null)[] => [
    root, null, root + 7, null, root + 12, null, null, root + 7,
    null, root + 12, null, root + 7, null, root, null, root + 12
  ],

  /**
   * Tension walk bass: chromatic walking bass building tension
   * Uses chromatic passing tones for maximum harmonic tension
   */
  tensionWalkBass: (root: number = 0): (number | null)[] => [
    root, root + 1, root + 2, root + 4, null, root + 2, root + 1, root,
    root + 7, root + 8, root + 7, root + 5, null, root + 4, root + 3, root + 4
  ],

  // ============================================================================
  // CLIMACTIC FINALE BASS PATTERNS (5 patterns)
  // Dark ominous bass for final boss encounters and ending sequences
  // ============================================================================

  /**
   * Maw chase: relentless low-end pursuit for canyon chase
   * Suitable for Obsidian Maw escape sequences
   */
  mawChase: (root: number = 0): (number | null)[] => [
    root, null, root, root + 7, null, root, null, root + 12,
    root + 7, null, root, null, root + 7, root, null, null
  ],

  /**
   * Terminus drone: deep cosmic drone for void approach
   * Deep space ambience for Terminus Black sequences
   */
  terminusDrone: (root: number = 0): (number | null)[] => [
    root, null, null, null, null, null, null, null,
    null, null, null, root + 7, null, null, null, null
  ],

  /**
   * Final boss ostinato: unrelenting rhythmic figure for ultimate boss
   * Incessant rhythmic pattern for final confrontations
   */
  finalBossOstinato: (root: number = 0): (number | null)[] => [
    root, root + 7, null, root + 12, null, root + 7, root, null,
    root + 12, null, root + 7, root, null, root + 7, null, root + 12
  ],

  /**
   * Chromatic pulse: dark chromatic bass movement for tension
   * Uses semitone intervals for dissonant low-end
   */
  chromaticPulse: (root: number = 0): (number | null)[] => [
    root, null, root + 1, null, root, null, root - 1, null,
    root, null, root + 7, null, root + 6, root + 7, null, null
  ],

  /**
   * Void stalker: sparse threatening accents from the deep
   * Minimal but menacing pattern for psychological tension
   */
  voidStalker: (root: number = 0): (number | null)[] => [
    root, null, null, null, root + 6, null, null, null,
    null, root + 7, null, null, null, null, root, null
  ],
};
