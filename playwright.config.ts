import { defineConfig } from '@playwright/test';

const evidencePort = 4173;
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
  reporter: [[process.env.CI ? 'github' : 'list'], ['junit', { outputFile: 'test-results/playwright-results.xml' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CI
      ? {
          args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
        }
      : undefined,
  },
  projects: [
    {
      name: 'chromium-desktop',
      testMatch: [
        '**/smoke.spec.ts',
        '**/shipyard.spec.ts',
        '**/interaction.spec.ts',
        '**/accessibleActions.spec.ts',
        '**/saveSlotConcurrency.spec.ts',
        '**/firstShot.spec.ts',
        '**/playerControls.spec.ts',
        '**/directRetry.spec.ts',
        '**/autoFire.spec.ts',
        '**/impactFeel.spec.ts',
        '**/renderBudget.spec.ts',
      ],
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'chromium-mobile',
      grepInvert: /@desktop-only/,
      testMatch: [
        '**/smoke.spec.ts',
        '**/interaction.spec.ts',
        '**/accessibleActions.spec.ts',
        '**/hardwareKeyboard.spec.ts',
        '**/shipyard.spec.ts',
        '**/firstShot.spec.ts',
        '**/playerControls.spec.ts',
        '**/directRetry.spec.ts',
        '**/autoFire.spec.ts',
        '**/impactFeel.spec.ts',
      ],
      use: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: `bun run dev --host 127.0.0.1 --port ${evidencePort} --strictPort`,
    // No hot reload: an edit made while the suite runs must not reload a page mid-test.
    env: { SPACE_EXPLORER_E2E: '1' },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
