import { defineConfig } from '@playwright/test';

const evidencePort = Number(process.env.GAME_FEEL_EVIDENCE_PORT ?? 4173);
if (!Number.isInteger(evidencePort) || evidencePort < 1024 || evidencePort > 65535)
  throw new Error('Invalid GAME_FEEL_EVIDENCE_PORT');
const baseURL = `http://127.0.0.1:${evidencePort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // GitHub's software WebGL renderer can stall when multiple Phaser instances
  // compete inside one runner. CI parallelism is provided by isolated workflow
  // jobs instead; local hardware-backed runs can safely fan out.
  workers: process.env.CI ? 1 : 4,
  timeout: 60_000,
  expect: {
    timeout: process.env.CI ? 15_000 : 5_000,
  },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    launchOptions: process.env.CI
      ? {
          args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
        }
      : undefined,
  },
  projects: [
    {
      name: 'chromium-portrait-polish',
      testMatch: ['**/playerControls.spec.ts', '**/directRetry.spec.ts'],
      use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
    {
      name: 'chromium-desktop-game-feel',
      testMatch: '**/gameFeel.evidence.spec.ts',
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'chromium-mobile-game-feel',
      testMatch: '**/gameFeel.evidence.spec.ts',
      grepInvert: /recording overhead/,
      use: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true },
    },
    {
      name: 'chromium-portrait-game-feel',
      testMatch: '**/gameFeel.evidence.spec.ts',
      grep: /records delivered controls/,
      use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
    {
      name: 'chromium-desktop',
      grepInvert: /recording overhead/,
      testMatch: [
        '**/smoke.spec.ts',
        '**/cinematic.spec.ts',
        '**/proceduralBackground.spec.ts',
        '**/interaction.spec.ts',
        '**/accessibleActions.spec.ts',
        '**/saveSlotConcurrency.spec.ts',
        '**/picketTurrets.spec.ts',
        '**/firstShot.spec.ts',
        '**/playerControls.spec.ts',
        '**/directRetry.spec.ts',
        '**/gameFeel.evidence.spec.ts',
      ],
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'chromium-mobile',
      grepInvert: /recording overhead/,
      testMatch: [
        '**/smoke.spec.ts',
        '**/interaction.spec.ts',
        '**/accessibleActions.spec.ts',
        '**/hardwareKeyboard.spec.ts',
        '**/proceduralBackground.spec.ts',
        '**/cinematic.spec.ts',
        '**/picketTurrets.spec.ts',
        '**/firstShot.spec.ts',
        '**/playerControls.spec.ts',
        '**/directRetry.spec.ts',
        '**/gameFeel.evidence.spec.ts',
      ],
      use: {
        viewport: { width: 844, height: 390 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'chromium-desktop-visual',
      testMatch: '**/visual.evidence.spec.ts',
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'chromium-mobile-visual',
      testMatch: '**/visual.evidence.spec.ts',
      use: {
        viewport: { width: 844, height: 390 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'chromium-desktop-performance',
      testMatch: '**/performance.evidence.spec.ts',
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'chromium-desktop-performance-gate',
      testMatch: '**/performance.evidence.spec.ts',
      grep: /enforces the approved gameplay update-cost threshold/,
      retries: 0,
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'chromium-mobile-performance',
      testMatch: '**/performance.evidence.spec.ts',
      use: {
        viewport: { width: 844, height: 390 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: `bun run dev --host 127.0.0.1 --port ${evidencePort} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
