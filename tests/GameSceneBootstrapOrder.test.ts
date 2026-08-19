import { describe, expect, test } from 'bun:test';

describe('GameScene create bootstrap order', () => {
  test('syncs the helper wing only after the bootstrap runtime is installed', async () => {
    const source = await Bun.file('src/scenes/GameScene.ts').text();
    const createStart = source.indexOf('create(): void {');
    const createEnd = source.indexOf('\n  private installBootstrapRuntime');
    const createBody = source.slice(createStart, createEnd);
    const installAt = createBody.indexOf('this.installBootstrapRuntime(runtime)');
    const syncAt = createBody.indexOf('this.syncLastLifeHelperWingState()');

    expect(installAt).toBeGreaterThan(-1);
    expect(syncAt).toBeGreaterThan(installAt);
    expect(createBody.includes('registerRuntimeHandlers')).toBe(false);
  });
});
