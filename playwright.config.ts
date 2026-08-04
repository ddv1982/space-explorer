import { defineConfig } from '@playwright/test';

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
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    launchOptions: process.env.CI ? {
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
    } : undefined,
  },
  projects: [
    {
      name: 'chromium-desktop',
      testMatch: ['**/smoke.spec.ts', '**/interaction.spec.ts', '**/picketTurrets.spec.ts'],
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'chromium-mobile',
      testMatch: [
        '**/smoke.spec.ts',
        '**/interaction.spec.ts',
        '**/hardwareKeyboard.spec.ts',
        '**/picketTurrets.spec.ts',
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
    command: 'bun run dev --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
