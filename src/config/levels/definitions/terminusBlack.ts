import type { BossMovementConfig, BossShotPattern, LevelConfig } from '../types';
import { arpeggiatorPatterns, bassPatterns } from '../music';
import { createSignatureMusic } from './reimaginedMusic';

/** Its signature fan: leans with the patrol on every other volley, so consecutive fans interleave. */
const OMEGA_FANS: BossShotPattern = {
  kind: 'arc',
  shots: 8,
  arcDegrees: 36,
  speed: 1,
  originY: 30,
  lean: 6,
  leanEveryOther: true,
};
/** Two rings turning against each other, the maelstrom hull's answer to the fans. */
const OMEGA_VORTEX: BossShotPattern = {
  kind: 'spiral',
  shots: 6,
  degreesPerSecond: 220,
  speed: 1,
  originY: 30,
  mirrored: true,
};
const OMEGA_PATROL: BossMovementConfig = { kind: 'patrol', speed: 90, edgePadding: 60 };

export const TERMINUS_BLACK_LEVEL: LevelConfig = {
  name: 'Eventide Engine',
  planetName: 'Omega Spire',
  destination: 'Singularity engine core of Omega Spire',
  visualTheme: 'Deep violet void caged by cyan engine rings and accretion light.',
  coreGameplayIdea: 'A final exam where every gimmick reprises in sequence across six sections.',
  pacingSummary: 'Wormholes, minefields, flares, lattices, and corridors reprise before Omega Null.',
  enemyCompositionSummary: 'An elite lineup: lancers and gunships lead, sowers deny, fighters press.',
  hazardSummary: 'Every hazard type returns as a reprise sequence.',
  bossConcept: 'Omega Null reprises every boss lesson in four phases, switching pressure into maelstrom at half hull.',
  difficultyRole: 'Finale and total mastery check.',
  journeyNote: 'The Eventide Engine powers down only for the worthy.',
  bgColor: '#04060f',
  accentColor: 0x8fd3ff,
  colorGrade: { brightness: 0.05, contrast: 1.14, saturation: 1.08 },
  planetPalette: [0x2c2a8f, 0xc8e2ff],
  enemies: [
    { type: 'fighter', weight: 30 },
    { type: 'lancer', weight: 18 },
    { type: 'gunship', weight: 32 },
    { type: 'sower', weight: 20 },
  ],
  encounterSize: { min: 2, max: 3 },
  spawnRateMultiplier: 2.25,
  levelDistance: 21000,
  hasBoss: true,
  boss: {
    name: 'Omega Null',
    maxHp: 1300,
    parSeconds: 70,
    escalatesPastPar: true,
    phaseChangePauseMs: 240,
    // The final exam, like the sector that leads to it: each phase reprises a lesson from an earlier boss, and
    // the last one asks for all of them in turn. The hull switches from pressure to maelstrom at half.
    phases: [
      {
        // Pressure: interleaving fans that lean with its patrol, then a burst aimed at the player's lane.
        startsAtHull: 1,
        style: 'pressure',
        movement: OMEGA_PATROL,
        attacks: [
          { cooldownMs: 950, volley: [OMEGA_FANS] },
          { cooldownMs: 950, volley: [OMEGA_FANS] },
          { cooldownMs: 1150, volley: [{ kind: 'aimedBurst', shots: 4, intervalMs: 140, speed: 1.15, originY: 30 }] },
        ],
      },
      {
        // Siege: it shields while it charges a wall, and every other round launches a gunship guard
        // in front of the hull, which a piercing gun cuts through on its way to the boss.
        startsAtHull: 0.75,
        style: 'pressure',
        movement: OMEGA_PATROL,
        attacks: [
          {
            cooldownMs: 1200,
            shielded: true,
            volley: [{ kind: 'wall', gaps: [0.25, 0.75, 0.5], gapWidth: 120, spacing: 44, speed: 0.7, originY: 30 }],
          },
          {
            cooldownMs: 1000,
            volley: [OMEGA_FANS, { kind: 'summon', escorts: ['gunship', 'gunship'], onVolleys: 'even' }],
          },
          {
            cooldownMs: 1000,
            volley: [{ kind: 'aimedArc', shots: 5, arcDegrees: 30, speed: 1.1, originY: 30 }],
          },
        ],
      },
      {
        // Maelstrom: counter-rotating rings from its patrol, then it drops low on one flank and burns
        // a beam straight down. Beside the beam, close under the hull, is the place to be for a short gun.
        startsAtHull: 0.5,
        style: 'maelstrom',
        movement: OMEGA_PATROL,
        attacks: [
          { cooldownMs: 900, volley: [OMEGA_VORTEX] },
          { cooldownMs: 600, volley: [OMEGA_VORTEX] },
          {
            cooldownMs: 1100,
            anchor: { x: 0.7, y: 140 },
            volley: [{ kind: 'beam', width: 40, telegraphMs: 700, activeMs: 700, originY: 30 }],
          },
        ],
      },
      {
        // Null: it hunts the player's lane with everything it has taught, one lesson per volley, so
        // each still reads on its own: a beam inside sparse rings, an aimed burst, a shielded wall.
        startsAtHull: 0.25,
        style: 'maelstrom',
        movement: { kind: 'pursuit', speed: 70, edgePadding: 60 },
        attacks: [
          {
            cooldownMs: 1200,
            volley: [
              { kind: 'beam', width: 36, telegraphMs: 650, activeMs: 750, originY: 30 },
              { kind: 'spiral', shots: 5, degreesPerSecond: 90, speed: 0.85, originY: 30, mirrored: true },
            ],
          },
          { cooldownMs: 1000, volley: [{ kind: 'aimedBurst', shots: 5, intervalMs: 120, speed: 1.15, originY: 30 }] },
          {
            cooldownMs: 1300,
            shielded: true,
            volley: [{ kind: 'wall', gaps: [0.3, 0.7], gapWidth: 120, spacing: 44, speed: 0.75, originY: 30 }],
          },
        ],
      },
    ],
  },
  bossAddWaves: true,
  lastLifeHelperWing: {
    shipCount: 2,
    helperLives: 2,
    hpScaleFromPlayer: 0.5,
    fireRateMs: 240,
    respawnDelayMs: 720,
    spacing: 34,
    followOffsetY: 18,
  },
  bossTriggerProgress: 0.695,
  asteroidInterval: 2900,
  sections: [
    {
      id: 'eventide-hush',
      label: 'Singularity Hush',
      startProgress: 0,
      endProgress: 0.1,
      phase: 'intro',
      summary:
        'A quiet hush, then the first reprise: wormhole rings sequence fighter and lancer pickets into the exam.',
      hazardEvents: [
        {
          type: 'wormhole-spawn',
          cadenceMs: 4000,
          intensity: 0.42,
          enemyTypes: ['fighter', 'lancer'],
          notes: 'Wormhole reprise: every warp-in is ring-telegraphed before it lands.',
        },
      ],
      waves: [
        {
          id: 'warp-picket',
          atMs: 2500,
          formation: 'line',
          type: 'fighter',
          count: 3,
          lane: 3,
          telegraph: 'wormhole',
          notes: 'Wormhole reprise: rings announce the picket before it materializes.',
        },
      ],
      musicIntensity: 0.4,
      tensionArc: 'constant',
      vatTarget: { valence: -0.2, arousal: 0.5, tension: 0.5 },
    },
    {
      id: 'eventide-minefield',
      label: 'Minefield Reprise',
      startProgress: 0.1,
      endProgress: 0.22,
      phase: 'build',
      summary: 'Minefield reprise: sowers seed drifting lanes and the exam asks for calm route discipline.',
      hazardEvents: [
        {
          type: 'minefield',
          cadenceMs: 3200,
          intensity: 0.5,
          notes: 'Sower reprise mines drift on readable lanes.',
        },
      ],
      signatureWaves: [
        {
          id: 'minefield-lane-read',
          triggerProgress: 0.5,
          enemies: [
            { type: 'sower', lane: 'center' },
            { type: 'fighter', lane: 'left' },
            { type: 'fighter', lane: 'right' },
          ],
          notes: 'Lane-read reprise: the sower seam telegraphs its lanes; route wide and punish the anchors.',
        },
      ],
      waves: [
        {
          id: 'sower-seam',
          atMs: 4000,
          formation: 'column',
          type: 'sower',
          count: 2,
          lane: 2,
          telegraph: 'warning',
          notes: 'Sowers reprise the mine seams down the left-of-center lane.',
        },
        {
          id: 'fighter-screen-mines',
          atMs: 11500,
          formation: 'line',
          type: 'fighter',
          count: 3,
          lane: 4,
          telegraph: 'warning',
          notes: 'Fighter screen presses the lanes behind the mine seam.',
        },
      ],
      musicIntensity: 0.58,
      visualModifiers: {
        atmosphereAlpha: 1.02,
        driftScale: 1.08,
        landmarkAlpha: 1.06,
        hazardResponseScale: 1.22,
      },
      tensionArc: 'gradualBuild',
      vatTarget: { valence: -0.24, arousal: 0.64, tension: 0.62 },
    },
    {
      id: 'eventide-flare',
      label: 'Flare Reprise',
      startProgress: 0.22,
      endProgress: 0.34,
      phase: 'build',
      summary:
        'Solar-flare reprise: the beam sweep clears the bullets it crosses, a risk route folded into the sequence.',
      hazardEvents: [
        {
          type: 'solar-flare',
          cadenceMs: 3600,
          intensity: 0.5,
          notes: 'Telegraphed edge sweep; it also clears enemy fire it crosses.',
        },
      ],
      waves: [
        {
          id: 'flare-gunship-line',
          atMs: 5000,
          formation: 'line',
          type: 'gunship',
          count: 3,
          lane: 3,
          telegraph: 'warning',
          notes: 'Gunships press in behind each flare sweep.',
        },
        {
          id: 'l10-courier-flare-run',
          atMs: 11000,
          formation: 'column',
          type: 'courier',
          count: 1,
          lane: 5,
          telegraph: 'warning',
          notes: 'One last courier runs under the flares.',
        },
      ],
      recoveryDrops: [
        {
          id: 'flare-relief',
          triggerProgress: 0.8,
          type: 'shield',
          lane: 'center',
          notes: 'Relief beat after the flare peak: a breath before the lattice.',
        },
      ],
      musicIntensity: 0.7,
      visualModifiers: {
        atmosphereAlpha: 1.06,
        driftScale: 1.1,
        landmarkAlpha: 1.08,
        hazardResponseScale: 1.24,
      },
      tensionArc: 'gradualBuild',
      vatTarget: { valence: -0.26, arousal: 0.72, tension: 0.7 },
    },
    {
      id: 'eventide-lattice',
      label: 'Lattice Reprise',
      startProgress: 0.34,
      endProgress: 0.45,
      phase: 'hazard',
      summary: 'Laser-lattice reprise: crossing beam pairs leave safe lanes that must be read on the telegraph.',
      hazardEvents: [
        {
          type: 'laser-lattice',
          cadenceMs: 3400,
          intensity: 0.55,
          notes: 'Timed beam pairs with readable safe gaps.',
        },
      ],
      signatureWaves: [
        {
          id: 'lattice-route-check',
          triggerProgress: 0.45,
          enemies: [
            { type: 'lancer', lane: 'left' },
            { type: 'gunship', lane: 'right' },
          ],
          notes: 'Route-read check: both elites telegraph from the edges while the lattice holds the lanes.',
        },
      ],
      waves: [
        {
          id: 'lancer-lattice-duel',
          atMs: 4000,
          formation: 'line',
          type: 'lancer',
          count: 3,
          lane: 3,
          telegraph: 'warning',
          notes: 'Lancers reprise their duels between lattice beats.',
        },
        {
          id: 'l10-rival-mirror-pair',
          atMs: 12300,
          formation: 'pincer',
          type: 'rival',
          count: 2,
          telegraph: 'warning',
          notes: 'The mirror pair: two rivals enter from both edges for the final duel before the convergence.',
        },
      ],
      musicIntensity: 0.82,
      visualModifiers: {
        atmosphereAlpha: 1.1,
        driftScale: 1.12,
        landmarkAlpha: 1.12,
        hazardResponseScale: 1.28,
      },
      tensionArc: 'waves',
      vatTarget: { valence: -0.3, arousal: 0.82, tension: 0.8 },
    },
    {
      id: 'eventide-corridor',
      label: 'Corridor Reprise',
      startProgress: 0.45,
      endProgress: 0.55,
      phase: 'hazard',
      summary: 'Rock-corridor reprise: destructible cover blocks enemy fire, so route choices double as shelter.',
      hazardEvents: [
        {
          type: 'rock-corridor',
          cadenceMs: 3000,
          corridorWidth: 190,
          laneCount: 2,
          damage: 1,
          intensity: 0.55,
          blocksEnemyProjectiles: true,
          coverHp: 4,
          coverIndestructible: false,
          notes: 'Cover reprise: breakable rock that stops enemy projectiles.',
        },
      ],
      waves: [
        {
          id: 'corridor-pincer-finale',
          atMs: 3500,
          formation: 'pincer',
          type: 'fighter',
          count: 4,
          telegraph: 'warning',
          notes: 'Final corridor pincer before the convergence.',
        },
      ],
      musicIntensity: 0.88,
      visualModifiers: {
        atmosphereAlpha: 1.14,
        driftScale: 1.14,
        landmarkAlpha: 1.16,
        hazardResponseScale: 1.3,
      },
      tensionArc: 'waves',
      vatTarget: { valence: -0.32, arousal: 0.86, tension: 0.86 },
    },
    {
      id: 'eventide-convergence',
      label: 'Null Convergence',
      startProgress: 0.55,
      endProgress: 0.64,
      phase: 'climax',
      summary: 'The convergence: every gimmick in the sequence overlaps at once, the final exam before Omega Null.',
      spawnRateMultiplier: 2.3,
      encounterSizeOverride: { min: 2, max: 3 },
      hazardEvents: [
        { type: 'gravity-well', cadenceMs: 3800, intensity: 0.5 },
        { type: 'energy-storm', cadenceMs: 4800, intensity: 0.45 },
        { type: 'ring-crossfire', cadenceMs: 5800, intensity: 0.5 },
        { type: 'debris-surge', cadenceMs: 6800, intensity: 0.4 },
      ],
      signatureWaves: [
        {
          id: 'convergence-final-read',
          triggerProgress: 0.36,
          enemies: [
            { type: 'gunship', lane: 'left', ace: true },
            { type: 'fighter', lane: 'center' },
            { type: 'gunship', lane: 'right', ace: true },
          ],
          notes:
            'Final lane-read exam: twin gilded ace gunships bracket the center route until the crossfire telegraphs clear.',
        },
      ],
      waves: [
        {
          id: 'convergence-pincer',
          atMs: 1500,
          formation: 'pincer',
          type: 'gunship',
          count: 4,
          telegraph: 'warning',
          notes: 'Gunship pincer folds the corridor grammar into the convergence.',
        },
        {
          id: 'omega-honor-guard',
          atMs: 7200,
          formation: 'vee',
          type: 'gunship',
          count: 5,
          lane: 3,
          aceCount: 1,
          telegraph: 'warning',
          midBossBeat: true,
          notes:
            'Mid-boss elite wave: Omega Null honor guard enters at the convergence; the gilded ace point leads the guard.',
        },
      ],
      musicIntensity: 0.97,
      visualModifiers: {
        atmosphereAlpha: 1.18,
        driftScale: 1.16,
        landmarkAlpha: 1.18,
        hazardResponseScale: 1.34,
      },
      tensionArc: 'buildRelease',
      vatTarget: { valence: -0.38, arousal: 0.96, tension: 0.96 },
    },
    {
      id: 'eventide-axis',
      label: 'Axiom Gate',
      startProgress: 0.64,
      endProgress: 0.695,
      phase: 'boss-approach',
      summary: 'Clear the final picket and collect the center health drop before Omega Null.',
      enemyFocus: [{ type: 'scout', weight: 1 }],
      encounterSizeOverride: { min: 1, max: 1 },
      spawnRateMultiplier: 0.45,
      asteroidInterval: 4800,
      waves: [
        {
          id: 'final-picket',
          atMs: 400,
          formation: 'line',
          type: 'fighter',
          count: 3,
          lane: 3,
          telegraph: 'warning',
          notes: 'Last picket before Omega Null; a breath, not a wall.',
        },
      ],
      recoveryDrops: [
        {
          id: 'omega-breath',
          triggerProgress: 0.02,
          type: 'health',
          lane: 'center',
          notes: 'Final relief beat before Omega Null: stabilize, then step through the gate.',
        },
      ],
      musicIntensity: 0.88,
      visualModifiers: {
        atmosphereAlpha: 0.88,
        driftScale: 0.86,
        landmarkAlpha: 1.2,
        hazardResponseScale: 0.92,
      },
      tensionArc: 'constant',
      vatTarget: { valence: -0.12, arousal: 0.54, tension: 0.6 },
    },
  ],
  music: createSignatureMusic({
    palette: 'finale',
    tempo: 126,
    rootHz: 65.41,
    bassPattern: bassPatterns.voidStalker,
    pulsePattern: arpeggiatorPatterns.cosmicVastness,
    leadPattern: arpeggiatorPatterns.voidBeacon,
    bossBassPattern: bassPatterns.finalBossOstinato,
    bossPulsePattern: arpeggiatorPatterns.darkChromatic,
    bossLeadPattern: arpeggiatorPatterns.tensionMaximum,
    bossTempo: 128,
    bossGain: 1.1,
    intent: {
      deterministicSeed: 'eventide-engine-omega-null',
      timeSignature: { beatsPerBar: 4, beatUnit: 4 },
      stage: {
        mode: 'aeolian',
        energyProfile: { baseline: 0.62, peak: 0.99, curve: 'build' },
        harmony: {
          steps: [
            { degree: 1, barsDuration: 1, quality: 'minor' },
            { degree: 6, barsDuration: 1, quality: 'major' },
            { degree: 3, barsDuration: 1, quality: 'major' },
            { degree: 7, barsDuration: 1, quality: 'major' },
          ],
        },
      },
      boss: {
        mode: 'ultralocrian',
        energyProfile: { baseline: 0.84, peak: 1, curve: 'surge' },
        harmony: {
          steps: [
            { degree: 1, barsDuration: 1, quality: 'diminished' },
            { degree: 2, barsDuration: 1, quality: 'minor' },
            { degree: 5, barsDuration: 1, quality: 'diminished' },
            { degree: 1, barsDuration: 1, quality: 'diminished' },
          ],
        },
      },
    },
  }),
};
