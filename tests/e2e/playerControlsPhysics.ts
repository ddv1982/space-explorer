import Phaser from 'phaser';
import { Player } from '../../src/entities/Player';
import { InputManager } from '../../src/systems/InputManager';

interface Measurement {
  updateHz: number;
  physicsHz: number;
  cardinalSpeed: number;
  diagonalSpeed: number;
  releaseDistance: number;
  releaseMs: number;
  reversalMs: number;
  bodyWidth: number;
  bodyHeight: number;
  fireX: number;
  fireY: number;
  muzzleX: number;
  muzzleY: number;
  rotation: number;
}

export function measurePlayerControls(): Promise<Measurement[]> {
  return new Promise((resolve, reject) => {
    class MeasurementScene extends Phaser.Scene {
      create(): void {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 48;
          canvas.height = 64;
          this.textures.addCanvas('player-ship', canvas);
          const input = new InputManager();
          input.create(this);
          const right = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
          const left = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
          const up = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
          this.physics.world.setBounds(-100_000, -100_000, 200_000, 200_000);
          const results: Measurement[] = [];
          for (const { updateHz, physicsHz } of [
            { updateHz: 60, physicsHz: 60 },
            { updateHz: 120, physicsHz: 60 },
            { updateHz: 120, physicsHz: 120 },
          ]) {
            const player = new Player(this, 0, 0);
            const body = player.body;
            if (!(body instanceof Phaser.Physics.Arcade.Body)) throw new Error('Missing dynamic body');
            const stepMs = 1000 / updateHz;
            this.physics.world.setFPS(physicsHz);
            const step = (x: number, y = 0) => {
              right.isDown = x > 0;
              left.isDown = x < 0;
              up.isDown = y < 0;
              player.update(input, stepMs);
              this.physics.world.update(0, stepMs);
              this.physics.world.postUpdate();
            };
            const reset = () => {
              body.reset(0, 0);
              body.stop();
            };
            for (let frame = 0; frame < updateHz * 3; frame++) step(1);
            const cardinalSpeed = body.velocity.length();
            const releaseStart = body.x;
            let releaseMs = 0;
            // Momentum flight decays exponentially, so "at rest" means below 1 px/s.
            while (body.velocity.length() > 1 && releaseMs < 4000) {
              step(0);
              releaseMs += stepMs;
            }
            const releaseDistance = body.x - releaseStart;
            reset();
            for (let frame = 0; frame < updateHz * 3; frame++) step(1);
            let reversalMs = 0;
            while (body.velocity.x > -cardinalSpeed * 0.9 && reversalMs < 4000) {
              step(-1);
              reversalMs += stepMs;
            }
            reset();
            for (let frame = 0; frame < updateHz * 3; frame++) step(1, -1);
            const direction = player.getFireDirection();
            const muzzle = player.getMuzzlePosition(20);
            results.push({
              updateHz,
              physicsHz,
              cardinalSpeed,
              diagonalSpeed: body.velocity.length(),
              releaseDistance,
              releaseMs,
              reversalMs,
              bodyWidth: body.width,
              bodyHeight: body.height,
              fireX: direction.x,
              fireY: direction.y,
              muzzleX: muzzle.x - player.x,
              muzzleY: muzzle.y - player.y,
              rotation: player.rotation,
            });
            player.destroy();
          }
          this.game.destroy(true);
          resolve(results);
        } catch (error) {
          this.game.destroy(true);
          reject(error);
        }
      }
    }
    new Phaser.Game({
      type: Phaser.WEBGL,
      width: 1280,
      height: 720,
      audio: { noAudio: true },
      banner: false,
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
      scene: [MeasurementScene],
    });
  });
}
