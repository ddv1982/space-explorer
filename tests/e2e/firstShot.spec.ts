import { writeFileSync } from 'node:fs';
import { expect, openMenu, snapshot, startNewRun, test } from './fixtures';

declare global {
  interface Window {
    __PLAYER_BULLET_READBACK_COUNT__?: number;
  }
}

test('prepares the player bullet before firing without another canvas readback', async ({
  page,
  isMobile,
  assertNoBrowserErrors,
}) => {
  await page.addInitScript(() => {
    window.__PLAYER_BULLET_READBACK_COUNT__ = 0;
    const original = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (
      this: CanvasRenderingContext2D,
      ...args: Parameters<typeof original>
    ) {
      if (this.canvas.width === 8 && this.canvas.height === 18 && args[2] === 8 && args[3] === 18) {
        window.__PLAYER_BULLET_READBACK_COUNT__ = (window.__PLAYER_BULLET_READBACK_COUNT__ ?? 0) + 1;
      }
      return original.apply(this, args);
    };
  });

  await openMenu(page);
  await startNewRun(page);
  const beforeFire = await page.evaluate(() => window.__PLAYER_BULLET_READBACK_COUNT__);
  const beforePath = test.info().outputPath('before-fire-readbacks.json');
  writeFileSync(beforePath, JSON.stringify({ beforeFire }));
  await test.info().attach('before-fire-readbacks.json', { path: beforePath, contentType: 'application/json' });
  expect(beforeFire, 'player bullet texture must be ready before the first firing update').toBe(1);

  const touch = isMobile ? await page.context().newCDPSession(page) : null;
  try {
    if (touch) {
      const viewport = page.viewportSize();
      if (!viewport) throw new Error('Missing touch viewport');
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: viewport.width * 0.75, y: viewport.height * 0.5 }],
      });
    } else {
      await page.keyboard.down('Space');
    }
    await expect
      .poll(async () =>
        (await snapshot(page)).objects.some((object) => object.active && object.textureKey === 'player-bullet')
      )
      .toBe(true);
    const afterFire = await page.evaluate(() => window.__PLAYER_BULLET_READBACK_COUNT__);
    expect(afterFire, 'firing must reuse the prepared player bullet texture').toBe(beforeFire);
    const resultPath = test.info().outputPath('first-shot-readbacks.json');
    writeFileSync(resultPath, JSON.stringify({ beforeFire, afterFire, input: isMobile ? 'touch' : 'keyboard' }));
    await test.info().attach('first-shot-readbacks.json', { path: resultPath, contentType: 'application/json' });
    const screenshotPath = test.info().outputPath('first-shot.png');
    await page.screenshot({ path: screenshotPath });
    await test.info().attach('first-shot.png', { path: screenshotPath, contentType: 'image/png' });
  } finally {
    if (touch) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await touch.detach();
    } else {
      await page.keyboard.up('Space');
    }
  }
  assertNoBrowserErrors();
});
