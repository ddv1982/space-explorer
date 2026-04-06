/**
 * @fileoverview Pattern Library for Space Explorer Music System
 *
 * This module provides a comprehensive collection of melodic and rhythmic patterns
 * for procedural music generation in the space-explorer game. All patterns are
 * designed as 16-step sequences (representing one bar in 4/4 time at sixteenth-note
 * resolution) that can be transposed to any root note.
 *
 * ## Pattern System Overview
 *
 * Patterns are factory functions that accept a root note (MIDI note number offset)
 * and return an array of 16 values representing sixteenth-note steps. Values are:
 * - Numbers: MIDI note offsets from root (0 = root, 4 = major third, 7 = perfect fifth, etc.)
 * - null: Rest (no note played)
 *
 * ## Pattern Categories
 *
 * ### Arpeggiator Patterns (35 total)
 * - **Basic Arpeggios** (7): Fundamental triadic and scale patterns
 * - **Quartal Harmony** (2): Modern fourth-based voicings
 * - **Suspended Chords** (2): Tension/resolution patterns
 * - **Modal Flavors** (3): Characteristic modal scale patterns
 * - **Wide Intervals** (2): Octave-spanning dramatic leaps
 * - **Call and Response** (2): Phrase-based dialogue patterns
 * - **Delay/Reverb Style** (2): Ambient echo-like patterns
 * - **Driving/Energetic** (7): High-intensity patterns for action
 * - **Climactic Finale** (8): Maximum tension patterns for boss/ending encounters
 *
 * ### Bass Patterns (20 total)
 * - **Foundation** (3): Root movement and drone patterns
 * - **Walking Bass** (2): Stepwise melodic bass motion
 * - **Ostinato** (2): Rhythmic repeating figures
 * - **Pedal/Drone** (2): Sustained harmonic anchors
 * - **Syncopated** (2): Off-beat rhythmic patterns
 * - **Driving Bass** (4): High-intensity bass patterns
 * - **Climactic Finale** (5): Dark ominous bass for final encounters
 *
 * ## Usage Example
 *
 * ```typescript
 * import { arpeggiatorPatterns, bassPatterns } from './patterns';
 *
 * // Generate a C-major arpeggio pattern
 * const cMajorArp = arpeggiatorPatterns.upTriad(60); // MIDI note 60 = C4
 *
 * // Generate a bass line transposed to F
 * const fBass = bassPatterns.rootFifth(53); // MIDI note 53 = F3
 * ```
 *
 * ## Musical Intervals Reference
 * - 0: Root (unison)
 * - 1: Minor second
 * - 2: Major second
 * - 3: Minor third
 * - 4: Major third
 * - 5: Perfect fourth
 * - 6: Tritone (augmented 4th / diminished 5th)
 * - 7: Perfect fifth
 * - 8: Minor sixth
 * - 9: Major sixth
 * - 10: Minor seventh
 * - 11: Major seventh
 * - 12: Octave
 *
 * @module patterns
 * @author Space Explorer Music System
 * @version 2.0.0
 */

// =============================================================================
// ARPEGGIATOR PATTERNS (35 total)
// =============================================================================

/**
 * Arpeggiator pattern collection for melodic sequences.
 * All patterns are 16-step sequences (one bar at sixteenth-note resolution).
 */
export const arpeggiatorPatterns = {
  // ============================================================================
  // BASIC ARPEGGIOS (7 patterns)
  // Fundamental triadic and scale-based patterns for general use
  // ============================================================================

  /**
   * Upward major triad arpeggio: root → 3rd → 5th → octave
   * Classic ascending pattern suitable for uplifting moments
   */
  upTriad: (root: number = 0): (number | null)[] => [
    root, null, root + 4, null, root + 7, null, root + 12, null,
    null, null, root + 7, null, root + 4, null, null, null
  ],

  /**
   * Downward major triad arpeggio: octave → 5th → 3rd → root
   * Descending resolution pattern, good for cadences
   */
  downTriad: (root: number = 0): (number | null)[] => [
    root + 12, null, root + 7, null, root + 4, null, root, null,
    null, null, root + 4, null, root + 7, null, null, null
  ],

  /**
   * Up-and-down triad pattern: root → 3rd → 5th → octave → 5th → 3rd
   * Balanced arch-shaped contour, very musical and pleasing
   */
  upDownTriad: (root: number = 0): (number | null)[] => [
    root, null, root + 4, null, root + 7, null, root + 12, null,
    root + 7, null, root + 4, null, null, null, null, null
  ],

  /**
   * Gentle cascade pattern with minor third coloring
   * Soft, flowing movement suitable for ambient exploration
   */
  cascade: (root: number = 0): (number | null)[] => [
    root, null, null, root + 3, null, root + 7, null, null,
    root + 12, null, null, root + 7, null, root + 3, null, null
  ],

  /**
   * Flowing river pattern using major scale degrees
   * Stepwise motion creates a smooth, meandering quality
   */
  flowing: (root: number = 0): (number | null)[] => [
    root, null, root + 2, null, root + 4, null, root + 7, null,
    root + 5, null, root + 4, null, root + 2, null, root, null
  ],

  /**
   * Sparse ambient pattern with wide temporal spacing
   * Minimal note density for atmospheric, contemplative moments
   */
  ambientSparse: (root: number = 0): (number | null)[] => [
    root, null, null, null, root + 7, null, null, null,
    root + 4, null, null, null, root + 12, null, null, null
  ],

  /**
   * Pentatonic scale pattern (root, 2nd, 4th, 5th, 6th)
   * Very consonant and pleasing, works across many harmonic contexts
   */
  pentatonic: (root: number = 0): (number | null)[] => [
    root, null, root + 2, null, root + 4, null, root + 7, null,
    root + 9, null, root + 7, null, root + 4, null, root + 2, null
  ],

  // ============================================================================
  // QUARTAL HARMONY (2 patterns)
  // Fourth-based voicings for modern, open, ambiguous harmonic quality
  // ============================================================================

  /**
   * Quartal cascade: stacked perfect fourths (root, 4th, flat-7th, 11th)
   * Creates an open, modern jazz-influenced sound
   */
  quartalCascade: (root: number = 0): (number | null)[] => [
    root, null, root + 5, null, root + 10, null, root + 17, null,
    null, root + 10, null, root + 5, null, root, null, null
  ],

  /**
   * Quartal drift: floating fourth intervals with spacious rests
   * Ethereal, floating quality suitable for space exploration
   */
  quartalDrift: (root: number = 0): (number | null)[] => [
    root, null, null, root + 5, null, null, root + 10, null,
    root + 5, null, null, root, null, root + 5, null, null
  ],

  // ============================================================================
  // SUSPENDED CHORDS (2 patterns)
  // Tension-building patterns that delay resolution
  // ============================================================================

  /**
   * Sus2 pattern: root → 2nd → 5th → octave
   * Airy, open quality that avoids major/minor definition
   */
  suspended2: (root: number = 0): (number | null)[] => [
    root, null, root + 2, null, root + 7, null, root + 14, null,
    root + 7, null, root + 2, null, null, root + 7, null, null
  ],

  /**
   * Sus4 pattern: root → 4th → 5th → octave
   * Anticipatory tension, resolves naturally to major triad
   */
  suspended4: (root: number = 0): (number | null)[] => [
    root, null, root + 5, null, root + 7, null, root + 12, null,
    null, root + 5, null, root + 7, null, root + 5, null, null
  ],

  // ============================================================================
  // MODAL FLAVORS (3 patterns)
  // Characteristic intervals from church modes and world scales
  // ============================================================================

  /**
   * Dorian mode pattern: minor with characteristic raised 6th
   * Melancholic but with subtle brightness (jazz minor feel)
   */
  dorianFlair: (root: number = 0): (number | null)[] => [
    root, null, root + 3, null, root + 7, null, root + 9, null,
    root + 7, null, root + 9, null, root + 3, null, root, null
  ],

  /**
   * Phrygian mode pattern: minor with characteristic flat 2nd
   * Dark, exotic, Spanish/flamenco-influenced quality
   */
  phrygianMystery: (root: number = 0): (number | null)[] => [
    root, null, root + 1, null, root + 7, null, root + 12, null,
    root + 7, null, root + 1, null, null, root + 7, null, null
  ],

  /**
   * Lydian mode pattern: major with characteristic raised 4th
   * Dreamy, floating, celestial quality (favored in film scoring)
   */
  lydianDream: (root: number = 0): (number | null)[] => [
    root, null, root + 4, null, root + 6, null, root + 11, null,
    root + 6, null, root + 4, null, root + 6, null, null, null
  ],

  // ============================================================================
  // WIDE INTERVAL LEAPS (2 patterns)
  // Dramatic octave-spanning patterns for crystalline clarity and space
  // ============================================================================

  /**
   * Wide leap pattern: dramatic octave-plus jumps
   * Creates crystalline clarity and vast spatial impression
   */
  wideLeap: (root: number = 0): (number | null)[] => [
    root, null, null, null, root + 12, null, null, root + 7,
    null, null, root + 19, null, null, root + 12, null, null
  ],

  /**
   * Octave dance: alternating between octaves
   * Spacious feel with clear registral separation
   */
  octaveDance: (root: number = 0): (number | null)[] => [
    root, null, root + 12, null, root, null, root + 24, null,
    root + 12, null, root, null, root + 12, null, root, null
  ],

  // ============================================================================
  // CALL AND RESPONSE (2 patterns)
  // Phrase-based patterns creating musical dialogue
  // ============================================================================

  /**
   * Call and response: question-answer phrasing
   * Classic antecedent-consequent phrase structure
   */
  callResponse: (root: number = 0): (number | null)[] => [
    root, root + 4, root + 7, null, null, null, null, null,
    root + 12, root + 7, root + 4, null, null, null, null, null
  ],

  /**
   * Echo phrase: imitation with octave register shift
   * Creates the illusion of a responding voice in a different register
   */
  echoPhrase: (root: number = 0): (number | null)[] => [
    root, null, root + 4, root + 7, null, null, null, null,
    root + 12, null, root + 16, root + 19, null, null, null, null
  ],

  // ============================================================================
  // DELAY/REVERB STYLE (2 patterns)
  // Patterns that simulate spatial audio effects
  // ============================================================================

  /**
   * Delay trail: simulating echo repeats dying away
   * Each iteration trails off like a delay effect
   */
  delayTrail: (root: number = 0): (number | null)[] => [
    root, null, root + 7, null, root + 4, null, root + 7, null,
    root + 3, null, root + 7, null, root + 4, null, root + 3, null
  ],

  /**
   * Reverb bloom: sparse notes with "afterglow" spaces
   * Resonant, cathedral-like spaciousness
   */
  reverbBloom: (root: number = 0): (number | null)[] => [
    root, null, null, null, root + 7, null, null, null,
    null, null, root + 12, null, null, null, root + 7, null
  ],

  // ============================================================================
  // DRIVING / ENERGETIC INTENSITY (7 patterns)
  // High-energy patterns for action sequences and chase scenes
  // ============================================================================

  /**
   * Driving pulse: sixteenth-note subdivision with relentless forward momentum
   * Constant motion suitable for pursuit and high-tension scenes
   */
  drivingPulse: (root: number = 0): (number | null)[] => [
    root, null, root + 4, root + 7, null, root + 4, root, null,
    root + 7, root + 12, null, root + 7, root + 4, null, root + 7, null
  ],

  /**
   * Aggressive attack: staccato hits for urgency and impact
   * Sharp, percussive articulation for combat scenes
   */
  aggressiveAttack: (root: number = 0): (number | null)[] => [
    root, root + 7, null, root + 12, null, root + 7, root, null,
    null, root + 12, root + 7, null, root, null, root + 7, root + 12
  ],

  /**
   * Power chord arpeggio: root-fifth-octave emphasis
   * Heavy, driving sound inspired by rock/metal power chords
   */
  powerChordArp: (root: number = 0): (number | null)[] => [
    root, null, root + 7, null, root + 12, null, root + 7, root,
    null, root + 12, null, root + 7, null, root, null, root + 12
  ],

  /**
   * Tension chromatic: chromatic neighbor notes building tension
   * Uses semitone dissonance to create unease and anticipation
   */
  tensionChromatic: (root: number = 0): (number | null)[] => [
    root, root + 1, root, root + 4, root, root - 1, root, null,
    root + 7, root + 8, root + 7, root + 4, null, root + 7, root + 6, root + 7
  ],

  /**
   * Forward momentum: rapid ascending drive with push rhythm
   * Continuous upward energy surge for rising action
   */
  forwardMomentum: (root: number = 0): (number | null)[] => [
    root, root + 2, root + 4, root + 7, null, root + 4, root + 7, root + 12,
    null, root + 7, root + 12, root + 16, null, root + 12, root + 7, root
  ],

  /**
   * Martial stomp: heavy rhythmic pattern for combat intensity
   * Military-inspired rhythm with strong downbeat emphasis
   */
  martialStomp: (root: number = 0): (number | null)[] => [
    root, null, null, root + 7, root + 7, null, root + 12, null,
    root + 7, null, root, null, root + 12, root + 7, root, null
  ],

  /**
   * Urgent dash: quick bursts with strategic rests for breathless energy
   * Fits-and-starts motion suggesting frantic activity
   */
  urgentDash: (root: number = 0): (number | null)[] => [
    root, root + 4, root + 7, root + 12, null, null, root + 7, root + 4,
    null, null, root + 12, root + 16, null, root + 12, root + 7, null
  ],

  // ============================================================================
  // CLIMACTIC FINALE PATTERNS: DARK & OMINOUS (8 patterns)
  // Maximum tension patterns for final boss encounters and game endings
  // ============================================================================

  /**
   * Claustrophobic tight: dense chromatic clusters
   * For canyon claustrophobia scenes (Obsidian Maw encounters)
   */
  claustrophobicTight: (root: number = 0): (number | null)[] => [
    root, root + 1, root, root + 3, root + 1, root, root + 3, root + 1,
    root + 6, root + 5, root + 6, root + 7, root + 6, root + 5, root + 3, root
  ],

  /**
   * Cosmic vastness: sparse wide intervals for void feeling
   * Suggests the emptiness of space (Terminus Black approach)
   */
  cosmicVastness: (root: number = 0): (number | null)[] => [
    root, null, null, null, null, null, root + 12, null,
    null, null, root + 24, null, null, null, root + 12, null
  ],

  /**
   * Dark chromatic: flat 2nds and tritones for maximum tension
   * Dissonant intervals create psychological unease
   */
  darkChromatic: (root: number = 0): (number | null)[] => [
    root, root + 1, null, root + 6, root + 7, null, root + 1, root,
    root + 6, root + 7, root + 6, null, root + 1, root, null, null
  ],

  /**
   * Ominous drift: slow-moving ominous intervals with threatening accents
   * Gradual movement toward dissonance and back
   */
  ominousDrift: (root: number = 0): (number | null)[] => [
    root, null, null, root + 3, null, null, root + 6, null,
    null, root + 6, null, null, root + 3, null, null, root
  ],

  /**
   * Stalking pursuit: relentless rhythmic chase pattern
   * Unyielding forward motion suggesting predatory pursuit
   */
  stalkingPursuit: (root: number = 0): (number | null)[] => [
    root, null, root + 7, root + 7, null, root + 12, null, root + 7,
    root, null, root + 7, null, root + 12, root + 7, root, null
  ],

  /**
   * Tension maximum: chromatic cluster buildup for ultimate climax
   * Sequential semitone clusters for peak intensity
   */
  tensionMaximum: (root: number = 0): (number | null)[] => [
    root, root + 1, root + 2, root + 3, null, root + 2, root + 1, root,
    root + 7, root + 8, root + 7, root + 6, null, root + 7, root + 8, root + 7
  ],

  /**
   * Final boss intensity: maximum intensity for final confrontations
   * Dense, powerful pattern for ultimate encounters
   */
  finalBossIntensity: (root: number = 0): (number | null)[] => [
    root, root + 7, root + 12, root + 7, root, root + 7, root + 12, root + 19,
    root + 12, root + 7, root, root + 7, root + 12, root + 7, root, null
  ],

  /**
   * Void beacon: distant, haunting intervals emerging from darkness
   * Suggests signals from an unknown source in deep space
   */
  voidBeacon: (root: number = 0): (number | null)[] => [
    root, null, null, null, root + 7, null, null, null,
    null, root + 12, null, null, null, root + 7, null, null
  ],
};

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
