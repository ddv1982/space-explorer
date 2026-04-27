import { describe, expect, mock, test } from 'bun:test';

let phoneSizedViewport = true;

mock.module('phaser', () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
    },
  },
}));

mock.module('../src/utils/device', () => ({
  isTouchMobileDevice: () => phoneSizedViewport,
  isPortraitTouchViewport: () => false,
  isPhoneSizedTouchViewport: () => phoneSizedViewport,
}));

mock.module('../src/utils/layout', () => ({
  getViewportBounds: (scene: { scale: { getViewPort: (camera?: unknown) => { x: number; y: number; width: number; height: number } } }, camera?: unknown) => {
    if (camera) {
      return { left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720, centerX: 640, centerY: 360 };
    }

    const viewport = scene.scale.getViewPort();
    return {
      left: viewport.x,
      top: viewport.y,
      width: viewport.width,
      height: viewport.height,
      right: viewport.x + viewport.width,
      bottom: viewport.y + viewport.height,
      centerX: viewport.x + viewport.width / 2,
      centerY: viewport.y + viewport.height / 2,
    };
  },
  getViewportLayout: (scene: { scale: { getViewPort: () => { x: number; y: number; width: number; height: number } } }) => {
    const viewport = scene.scale.getViewPort();
    return {
      left: viewport.x,
      top: viewport.y,
      width: viewport.width,
      height: viewport.height,
      right: viewport.x + viewport.width,
      bottom: viewport.y + viewport.height,
      centerX: viewport.x + viewport.width / 2,
      centerY: viewport.y + viewport.height / 2,
    };
  },
  getGameplayBounds: () => ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720, centerX: 640, centerY: 360 }),
  getActiveGameplayBounds: (scene: { scale: { getViewPort: () => { x: number; y: number; width: number; height: number } } }) => {
    if (phoneSizedViewport) {
      return { left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720, centerX: 640, centerY: 360 };
    }

    const viewport = scene.scale.getViewPort();
    return {
      left: viewport.x,
      top: viewport.y,
      width: viewport.width,
      height: viewport.height,
      right: viewport.x + viewport.width,
      bottom: viewport.y + viewport.height,
      centerX: viewport.x + viewport.width / 2,
      centerY: viewport.y + viewport.height / 2,
    };
  },
  centerHorizontally: (layout: { left: number; width: number }, width: number) => layout.left + (layout.width - width) / 2,
}));

const { clampPlayerToViewport, getPlayerSpawnPoint, syncSceneViewport } = await import('../src/scenes/gameScene/viewport');

describe('game scene viewport consistency helpers', () => {
  test('uses the fixed gameplay field on phone-sized touch viewports', () => {
    phoneSizedViewport = true;
    const spawnPoint = getPlayerSpawnPoint({ scale: { getViewPort: () => ({ x: 0, y: 0, width: 1024, height: 768 }) } } as never);

    expect(spawnPoint).toEqual({ x: 640, y: 640 });
  });

  test('keeps the original viewport-sized spawn field off phone-sized touch viewports', () => {
    phoneSizedViewport = false;
    const spawnPoint = getPlayerSpawnPoint({ scale: { getViewPort: () => ({ x: 0, y: 0, width: 1024, height: 768 }) } } as never);

    expect(spawnPoint).toEqual({ x: 512, y: 688 });
  });

  test('fits a 16:9 gameplay camera inside the available display area on phone-sized touch viewports', () => {
    phoneSizedViewport = true;
    const cameraCalls = {
      setViewport: [] as Array<[number, number, number, number]>,
      setSize: [] as Array<[number, number]>,
      setBounds: [] as Array<[number, number, number, number]>,
      setZoom: [] as number[],
      centerOn: [] as Array<[number, number]>,
    };
    const physicsCalls = {
      setBounds: [] as Array<[number, number, number, number]>,
    };

    const camera = {
      setViewport: (x: number, y: number, width: number, height: number) => {
        cameraCalls.setViewport.push([x, y, width, height]);
        return camera;
      },
      setSize: (width: number, height: number) => {
        cameraCalls.setSize.push([width, height]);
        return camera;
      },
      setBounds: (x: number, y: number, width: number, height: number) => {
        cameraCalls.setBounds.push([x, y, width, height]);
        return camera;
      },
      setZoom: (zoom: number) => {
        cameraCalls.setZoom.push(zoom);
        return camera;
      },
      centerOn: (x: number, y: number) => {
        cameraCalls.centerOn.push([x, y]);
        return camera;
      },
    };

    const scene = {
      cameras: { main: camera },
      physics: {
        world: {
          setBounds: (x: number, y: number, width: number, height: number) => {
            physicsCalls.setBounds.push([x, y, width, height]);
          },
        },
      },
      scale: {
        getViewPort: (inputCamera?: unknown) => {
          if (inputCamera) {
            return { x: 0, y: 0, width: 1280, height: 720 };
          }

          return { x: 0, y: 0, width: 1024, height: 768 };
        },
      },
    };

    syncSceneViewport(scene as never);

    expect(cameraCalls.setViewport).toEqual([[0, 96, 1024, 576]]);
    expect(cameraCalls.setSize).toEqual([[1024, 576]]);
    expect(cameraCalls.setBounds).toEqual([[0, 0, 1280, 720]]);
    expect(cameraCalls.setZoom).toEqual([0.8]);
    expect(cameraCalls.centerOn).toEqual([[640, 360]]);
    expect(physicsCalls.setBounds).toEqual([[0, 0, 1280, 720]]);
  });

  test('keeps the old full-screen camera behavior off phone-sized touch viewports', () => {
    phoneSizedViewport = false;
    const cameraCalls = {
      setViewport: [] as Array<[number, number, number, number]>,
      setSize: [] as Array<[number, number]>,
      setBounds: [] as Array<[number, number, number, number]>,
      setZoom: [] as number[],
    };
    const physicsCalls = {
      setBounds: [] as Array<[number, number, number, number]>,
    };

    const camera = {
      setViewport: (x: number, y: number, width: number, height: number) => {
        cameraCalls.setViewport.push([x, y, width, height]);
        return camera;
      },
      setSize: (width: number, height: number) => {
        cameraCalls.setSize.push([width, height]);
        return camera;
      },
      setBounds: (x: number, y: number, width: number, height: number) => {
        cameraCalls.setBounds.push([x, y, width, height]);
        return camera;
      },
      setZoom: (zoom: number) => {
        cameraCalls.setZoom.push(zoom);
        return camera;
      },
    };

    const scene = {
      cameras: { main: camera },
      physics: {
        world: {
          setBounds: (x: number, y: number, width: number, height: number) => {
            physicsCalls.setBounds.push([x, y, width, height]);
          },
        },
      },
      scale: {
        getViewPort: () => ({ x: 0, y: 0, width: 1440, height: 900 }),
      },
    };

    syncSceneViewport(scene as never);

    expect(cameraCalls.setViewport).toEqual([[0, 0, 1440, 900]]);
    expect(cameraCalls.setSize).toEqual([[1440, 900]]);
    expect(cameraCalls.setBounds).toEqual([[0, 0, 1440, 900]]);
    expect(cameraCalls.setZoom).toEqual([1]);
    expect(physicsCalls.setBounds).toEqual([[0, 0, 1440, 900]]);
  });

  test('clamps the player to the phone-sized gameplay field when fixed gameplay is active', () => {
    phoneSizedViewport = true;
    const updateFromGameObject = mock(() => {});
    const player = {
      x: 1400,
      y: 760,
      displayWidth: 40,
      displayHeight: 30,
      body: { updateFromGameObject },
      setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
      },
    };

    clampPlayerToViewport({ scale: { getViewPort: () => ({ x: 0, y: 0, width: 1024, height: 768 }) } } as never, player as never);

    expect(player.x).toBe(1260);
    expect(player.y).toBe(705);
    expect(updateFromGameObject).toHaveBeenCalledTimes(1);
  });
});
