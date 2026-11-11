import { LEVELS } from '../config/levels/registry';
import { audioManager } from '../systems/AudioManager';
import { SFX, type SfxId } from '../systems/audio/sfx/recipes';
import { measureTrack } from './measureTrack';

/** Development page for auditioning every sound effect and music track by ear. */
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function button(label: string, onPress: () => void): HTMLButtonElement {
  const node = element('button', label);
  node.addEventListener('click', () => {
    audioManager.init();
    audioManager.resumeFromUserGesture();
    onPress();
  });
  return node;
}

function section(title: string, buttons: HTMLElement[]): HTMLElement[] {
  const grid = element('div');
  grid.className = 'grid';
  grid.append(...buttons);
  return [element('h2', title), grid];
}

function slider(label: string, value: number, onInput: (value: number) => void): HTMLElement {
  const wrapper = element('label', label);
  const input = element('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.value = String(Math.round(value * 100));
  input.addEventListener('input', () => onInput(Number(input.value) / 100));
  wrapper.append(input);
  return wrapper;
}

const app = document.getElementById('app');
if (app) {
  const volumes = audioManager.getVolumes();
  const pan = { value: 0 };
  const intensity = { value: 1 };
  const controls = element('p');
  controls.append(
    slider('Music', volumes.music, (value) => audioManager.setVolume('music', value)),
    slider('Effects', volumes.effects, (value) => audioManager.setVolume('effects', value)),
    slider('Pan', 0.5, (value) => (pan.value = value * 2 - 1)),
    slider('Music intensity', 0.8, (value) => {
      intensity.value = 0.2 + value;
      audioManager.setMusicIntensity(intensity.value);
    })
  );

  const effects = (Object.keys(SFX) as SfxId[]).map((id) => button(id, () => audioManager.playSfx(id, pan.value)));
  const music = LEVELS.flatMap((level) => [
    button(`${level.name}: stage`, () => audioManager.startMusic(level.music.stage)),
    button(`${level.name}: boss`, () => audioManager.startMusic(level.music.boss)),
  ]);

  const report = element('pre');
  const measure = button('Measure every track', () => {
    void (async () => {
      const rows = ['track                              intensity   peak    rms    low   high'];
      for (const level of LEVELS) {
        for (const [kind, track] of [
          ['stage', level.music.stage],
          ['boss', level.music.boss],
        ] as const) {
          for (const level01 of kind === 'stage' ? [0.35, 0.6, 0.85] : [1.1]) {
            const m = await measureTrack(track, 24, level01);
            rows.push(
              `${`${level.name}: ${kind}`.padEnd(36)} ${level01.toFixed(2)}     ${m.peak.toFixed(3)}  ${m.rms.toFixed(3)}  ${m.lowShare.toFixed(2)}  ${m.highShare.toFixed(2)}`
            );
            report.textContent = rows.join('\n');
          }
        }
      }
      report.dataset.done = 'true';
    })();
  });

  app.append(
    controls,
    ...section('EFFECTS', effects),
    ...section('MUSIC', [button('Stop music', () => audioManager.stopMusic()), ...music]),
    ...section('LEVELS', [measure]),
    report
  );
}
