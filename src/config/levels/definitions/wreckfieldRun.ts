import type { BossMovementConfig, BossShotPattern, LevelConfig } from '../types';
import { arpeggiatorPatterns, bassPatterns } from '../music';
import { createSignatureMusic } from './reimaginedMusic';

/** Three narrow fans from the hull's gun decks. */
const BULWARK_BATTERY: BossShotPattern = {
  kind: 'arc',
  shots: 3,
  arcDegrees: 18,
  speed: 0.96,
  originsX: [-28, 0, 28],
  originY: 26,
};
const BULWARK_PATROL: BossMovementConfig = {
  kind: 'patrol',
  speed: 36,
  edgePadding: 100,
  bob: { amplitude: 6, periodMs: 3491 },
};

export const WRECKFIELD_RUN_LEVEL: LevelConfig = {
  name: 'Debris Gauntlet',
  planetName: 'Bastion Fall',
  destination: 'Wreckage ramparts orbiting Bastion Fall',
  visualTheme: 'Steel-grey hull plates and orange hazard strobes over a fortress graveyard.',
  coreGameplayIdea: 'A set-piece gauntlet where solar flares and laser lattices replace enemy density.',
  pacingSummary: 'Hazard-dense corridors with destructible cover build to the Bastion Bulwark siege.',
  enemyCompositionSummary: 'A lean enemy roster; gunships and bombers hold the ramparts.',
  hazardSummary: 'Solar-flare sweeps, laser-lattice patterns, and rock corridors with destructible cover.',
  bossConcept:
    'Bastion Bulwark shields only while it charges a wall, breaks out flank to flank, then hunts with a beam.',
  difficultyRole: 'Ramp-to-hard pivot and hazard-literacy exam; helper wing unlocks here.',
  journeyNote: 'Bastion Fall is a wall of wreckage; the gauntlet tests nerve over firepower.',
  bgColor: '#0a0c10',
  accentColor: 0xffb066,
  colorGrade: { brightness: 0.06, contrast: 1.14, saturation: 0.95 },
  planetPalette: [0x5c6672, 0xffd8a8],
  enemies: [
    { type: 'fighter', weight: 30 },
    { type: 'bomber', weight: 25 },
    { type: 'gunship', weight: 35 },
    { type: 'scout', weight: 10 },
  ],
  encounterSize: { min: 2, max: 3 },
  spawnRateMultiplier: 1.55,
  levelDistance: 18500,
  hasBoss: true,
  boss: {
    name: 'Bastion Bulwark',
    maxHp: 520,
    parSeconds: 60,
    escalatesPastPar: true,
    phaseChangePauseMs: 300,
    // Its shield is the tell for the wall: it only closes while the boss charges one, so the shielded
    // stretch is a dodge, not a wait. Phase 2 breaks out of the patrol line; phase 3 has lost the shield.
    phases: [
      {
        // Rampart: slow patrol, two battery salvoes, then a shielded charge into a wall.
        startsAtHull: 1,
        style: 'bulwark',
        movement: BULWARK_PATROL,
        attacks: [
          { cooldownMs: 1150, volley: [BULWARK_BATTERY] },
          { cooldownMs: 1000, volley: [BULWARK_BATTERY] },
          {
            cooldownMs: 1300,
            shielded: true,
            anchor: { x: 0.5, y: 80 },
            volley: [{ kind: 'wall', gaps: [0.3, 0.7, 0.5], gapWidth: 120, spacing: 44, speed: 0.6, originY: 30 }],
          },
        ],
      },
      {
        // Breach: flies flank to flank, so no spot under it stays safe.
        startsAtHull: 0.66,
        style: 'bulwark',
        movement: BULWARK_PATROL,
        attacks: [
          {
            cooldownMs: 1100,
            anchor: { x: 0.22, y: 100 },
            volley: [{ kind: 'aimedBurst', shots: 4, intervalMs: 150, speed: 1.1, originY: 28 }],
          },
          {
            cooldownMs: 1100,
            anchor: { x: 0.78, y: 100 },
            volley: [{ kind: 'spiral', shots: 6, degreesPerSecond: 165, speed: 0.9, originY: 26 }, BULWARK_BATTERY],
          },
          {
            cooldownMs: 1300,
            shielded: true,
            anchor: { x: 0.5, y: 70 },
            volley: [{ kind: 'wall', gaps: [0.2, 0.8], gapWidth: 120, spacing: 44, speed: 0.65, originY: 30 }],
          },
        ],
      },
      {
        // Last stand: shield gone, it hunts the player's lane and drops a beam on it.
        startsAtHull: 0.33,
        style: 'bulwark',
        movement: { kind: 'pursuit', speed: 70, edgePadding: 80, bob: { amplitude: 6, periodMs: 3491 } },
        attacks: [
          {
            cooldownMs: 1200,
            volley: [
              { kind: 'beam', width: 36, telegraphMs: 650, activeMs: 800, originY: 30 },
              { kind: 'arc', shots: 3, arcDegrees: 24, speed: 0.9, originsX: [-40, 40], originY: 26 },
            ],
          },
          { cooldownMs: 900, volley: [{ kind: 'aimedBurst', shots: 5, intervalMs: 120, speed: 1.15, originY: 28 }] },
          {
            cooldownMs: 1100,
            volley: [{ kind: 'wall', gaps: [0.35, 0.65], gapWidth: 120, spacing: 44, speed: 0.7, originY: 30 }],
          },
        ],
      },
    ],
  },
  lastLifeHelperWing: {
    shipCount: 2,
    helperLives: 2,
    hpScaleFromPlayer: 0.5,
    fireRateMs: 300,
    respawnDelayMs: 860,
    spacing: 40,
    followOffsetY: 18,
  },
  bossTriggerProgress: 0.742,
  asteroidInterval: 3350,
  sections: [
    {
      id: 'gauntlet-approach',
      label: 'Rampart Approach',
      startProgress: 0,
      endProgress: 0.14,
      phase: 'intro',
      summary: 'A quiet drift into the wreckage ramparts; the gauntlet reads its lanes before the flares wake.',
      waves: [
        {
          id: 'l6-scout-echelon',
          atMs: 5000,
          formation: 'echelon',
          type: 'scout',
          count: 5,
          lane: 6,
          telegraph: 'warning',
          notes: 'A scout staircase sweeps in from the right before the beams begin.',
        },
      ],
      musicIntensity: 0.46,
      visualModifiers: {
        atmosphereAlpha: 0.97,
        driftScale: 0.96,
        landmarkAlpha: 0.96,
      },
      tensionArc: 'constant',
      vatTarget: { valence: -0.12, arousal: 0.48, tension: 0.44 },
    },
    {
      id: 'flare-strobe-debut',
      label: 'Flare Strobe',
      startProgress: 0.14,
      endProgress: 0.32,
      phase: 'build',
      summary: 'Read each flare edge, descend through its lower escape lane, then clear the warned bomber column.',
      enemyFocus: [{ type: 'scout', weight: 1 }],
      encounterSizeOverride: { min: 1, max: 1 },
      spawnRateMultiplier: 0.65,
      asteroidInterval: 10000,
      waves: [
        {
          id: 'rampart-bomber-column',
          atMs: 10300,
          formation: 'column',
          type: 'bomber',
          count: 3,
          lane: 3,
          telegraph: 'warning',
          notes: 'A slow bomber column reads the center lane while the flare cycle teaches beam timing.',
        },
      ],
      hazardEvents: [
        {
          type: 'solar-flare',
          cadenceMs: 6000,
          durationMs: 15000,
          intensity: 0.55,
          notes: 'Solar-flare debut: a telegraphed beam sweep that also clears enemy bullets it crosses.',
        },
      ],
      musicIntensity: 0.62,
      visualModifiers: {
        atmosphereAlpha: 1.02,
        driftScale: 1.04,
        landmarkAlpha: 1.02,
        hazardResponseScale: 1.12,
      },
      tensionArc: 'gradualBuild',
      vatTarget: { valence: -0.18, arousal: 0.62, tension: 0.58 },
    },
    {
      id: 'lattice-cover-switchbacks',
      label: 'Lattice Switchbacks',
      startProgress: 0.32,
      endProgress: 0.5,
      phase: 'hazard',
      summary: 'Read the lattice gap first, then leave its expired beams for the later destructible-cover route.',
      enemyFocus: [{ type: 'scout', weight: 1 }],
      encounterSizeOverride: { min: 1, max: 1 },
      spawnRateMultiplier: 0.65,
      asteroidInterval: 10000,
      signatureWaves: [
        {
          id: 'cover-exit-pair',
          triggerProgress: 0.5,
          enemies: [
            { type: 'fighter', lane: 'left' },
            { type: 'fighter', lane: 'right' },
          ],
          notes:
            'Two-lane pressure asks the player to leave cover deliberately, reading the lattice gap route rather than drifting.',
        },
      ],
      waves: [
        {
          id: 'gunship-lane-audit',
          atMs: 9000,
          formation: 'line',
          type: 'gunship',
          count: 2,
          lane: 3,
          telegraph: 'warning',
          notes: 'A warning-telegraphed gunship pair audits whether the player is reading lanes or camping cover.',
        },
        {
          id: 'l6-courier-lattice-dash',
          atMs: 15000,
          formation: 'column',
          type: 'courier',
          count: 1,
          lane: 1,
          telegraph: 'warning',
          notes: 'A courier dashes across the lattice: the prize sits behind the beams.',
        },
      ],
      recoveryDrops: [
        {
          id: 'switchback-relief-health',
          triggerProgress: 0.72,
          type: 'health',
          lane: 'center',
          notes: 'Relief beat after the first lattice-cover exam, stabilizing hull before the siege peak.',
        },
      ],
      hazardEvents: [
        {
          type: 'laser-lattice',
          cadenceMs: 4500,
          durationMs: 10000,
          intensity: 0.5,
          notes: 'Two lattice lessons expire before the first cover eligibility at 14s.',
        },
        {
          type: 'rock-corridor',
          cadenceMs: 14000,
          durationMs: 18000,
          corridorWidth: 220,
          laneCount: 2,
          damage: 1,
          intensity: 0.45,
          blocksEnemyProjectiles: true,
          coverHp: 3,
          coverIndestructible: false,
          notes:
            'Destructible cover returns: three-hit wreck plates block enemy projectiles and reward planned routes.',
        },
      ],
      musicIntensity: 0.74,
      visualModifiers: {
        atmosphereAlpha: 1.07,
        driftScale: 1.06,
        landmarkAlpha: 1.08,
        hazardResponseScale: 1.18,
      },
      tensionArc: 'waves',
      vatTarget: { valence: -0.24, arousal: 0.72, tension: 0.7 },
    },
    {
      id: 'bulwark-siege-peak',
      label: 'Siege Peak',
      startProgress: 0.5,
      endProgress: 0.68,
      phase: 'climax',
      summary: 'Flare sweeps and lattice crossings overlap as the Bastion Bulwark siege compresses every route.',
      signatureWaves: [
        {
          id: 'shelter-crossfire',
          triggerProgress: 0.35,
          enemies: [
            { type: 'gunship', lane: 'center', ace: true },
            { type: 'bomber', lane: 'left' },
            { type: 'bomber', lane: 'right' },
          ],
          notes:
            'Central gilded ace gunship pressure validates that cover blocks projectiles but not bodies; read the lane and commit.',
        },
      ],
      waves: [
        {
          id: 'bulwark-midboss-elite',
          atMs: 12800,
          formation: 'pincer',
          type: 'gunship',
          count: 4,
          aceCount: 1,
          midBossBeat: true,
          telegraph: 'warning',
          notes:
            'Mid-boss elite beat at ~60%: a gunship pincer with banner and warnings marks the siege peak; the gilded ace lead anchors the priority read.',
        },
      ],
      encounterSizeOverride: { min: 2, max: 3 },
      spawnRateMultiplier: 1.15,
      hazardEvents: [
        { type: 'solar-flare', cadenceMs: 6500, durationMs: 14000, intensity: 0.5 },
        { type: 'laser-lattice', cadenceMs: 7000, durationMs: 14000, intensity: 0.48 },
        { type: 'debris-surge', cadenceMs: 8200, durationMs: 14000, intensity: 0.5 },
      ],
      musicIntensity: 0.9,
      visualModifiers: {
        atmosphereAlpha: 1.12,
        driftScale: 1.08,
        landmarkAlpha: 1.12,
        hazardResponseScale: 1.22,
      },
      tensionArc: 'buildRelease',
      vatTarget: { valence: -0.3, arousal: 0.86, tension: 0.84 },
    },
    {
      id: 'bulwark-threshold',
      label: 'Bulwark Threshold',
      startProgress: 0.68,
      endProgress: 0.742,
      phase: 'boss-approach',
      summary: 'Follow the center shield into open space, clearing single scouts before the Bulwark arrives.',
      enemyFocus: [{ type: 'scout', weight: 1 }],
      encounterSizeOverride: { min: 1, max: 1 },
      spawnRateMultiplier: 0.45,
      asteroidInterval: 5000,
      recoveryDrops: [
        {
          id: 'pre-bulwark-shield',
          triggerProgress: 0.02,
          type: 'shield',
          lane: 'center',
          notes: 'Pre-boss Recovery Beat shield stabilizes the gauntlet run before the bulwark cycle.',
        },
      ],
      musicIntensity: 0.82,
      visualModifiers: {
        atmosphereAlpha: 0.9,
        driftScale: 0.9,
        landmarkAlpha: 1.06,
      },
      tensionArc: 'constant',
      vatTarget: { valence: -0.08, arousal: 0.46, tension: 0.5 },
    },
  ],
  music: createSignatureMusic({
    palette: 'machine',
    tempo: 110,
    rootHz: 82.41,
    bassPattern: bassPatterns.rhythmicOstinato,
    pulsePattern: arpeggiatorPatterns.powerChordArp,
    leadPattern: arpeggiatorPatterns.delayTrail,
    bossBassPattern: bassPatterns.finalBossOstinato,
    bossPulsePattern: arpeggiatorPatterns.finalBossIntensity,
    bossLeadPattern: arpeggiatorPatterns.stalkingPursuit,
    bossTempo: 118,
    intent: {
      deterministicSeed: 'debris-gauntlet-bastion-siege',
      timeSignature: { beatsPerBar: 4, beatUnit: 4 },
      stage: {
        mode: 'dorian',
        energyProfile: { baseline: 0.52, peak: 0.93, curve: 'build' },
        harmony: {
          steps: [
            { degree: 1, barsDuration: 1, quality: 'minor' },
            { degree: 4, barsDuration: 1, quality: 'major' },
            { degree: 7, barsDuration: 1, quality: 'major' },
            { degree: 1, barsDuration: 1, quality: 'minor' },
          ],
        },
      },
      boss: {
        mode: 'phrygian',
        energyProfile: { baseline: 0.74, peak: 0.98, curve: 'surge' },
        harmony: {
          steps: [
            { degree: 1, barsDuration: 1, quality: 'minor' },
            { degree: 2, barsDuration: 1, quality: 'major' },
            { degree: 7, barsDuration: 1, quality: 'minor' },
            { degree: 1, barsDuration: 1, quality: 'minor' },
          ],
        },
      },
    },
  }),
};
