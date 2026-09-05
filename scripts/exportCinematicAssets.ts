import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CINEMATIC_DENSITY, CINEMATIC_SHIPS } from '../src/config/cinematicAssets';

const sourceDirectory = process.argv[2] ?? 'assets/source/cinematic';
const destinationDirectory = 'public/assets/cinematic';
mkdirSync(destinationDirectory, { recursive: true });

for (const asset of CINEMATIC_SHIPS) {
  const input = join(sourceDirectory, `${asset.file}.png`);
  const output = join(destinationDirectory, `${asset.file}.webp`);
  const png = readFileSync(input);
  if (png.toString('ascii', 1, 4) !== 'PNG' || png[25] !== 6) {
    throw new Error(`${input} must be a PNG with an alpha channel`);
  }
  const density = CINEMATIC_DENSITY;
  const command = Bun.spawnSync([
    'cwebp',
    '-quiet',
    '-resize',
    String(asset.width * density),
    String(asset.height * density),
    '-q',
    '90',
    '-alpha_q',
    '100',
    input,
    '-o',
    output,
  ]);
  if (command.exitCode !== 0) throw new Error(command.stderr.toString() || 'cwebp export failed');
  process.stdout.write(`${output}\t${statSync(output).size} bytes\n`);
}

const totalBytes = CINEMATIC_SHIPS.map((asset) => asset.file).reduce(
  (total, file) => total + statSync(join(destinationDirectory, `${file}.webp`)).size,
  0
);
if (totalBytes > 384 * 1024) throw new Error(`Cinematic download exceeds 384 KiB: ${totalBytes} bytes`);
process.stdout.write(`Cinematic download: ${totalBytes} bytes\n`);
