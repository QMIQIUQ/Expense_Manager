import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(scriptDir, '../public/app-icons');
await mkdir(outputDir, { recursive: true });

for (const theme of ['light', 'dark']) {
  const name = `warm-kitty-${theme}`;
  const svg = await readFile(path.join(outputDir, `${name}.svg`));
  for (const size of [192, 512]) {
    await sharp(svg).resize(size, size).png().toFile(path.join(outputDir, `${name}-${size}.png`));
  }
  const background = theme === 'dark' ? '#17141b' : '#fff9f4';
  await sharp(svg)
    .resize(410, 410)
    .extend({ top: 51, bottom: 51, left: 51, right: 51, background })
    .png()
    .toFile(path.join(outputDir, `${name}-maskable-512.png`));
}

console.log('Generated Warm Kitty PWA icons (192px, 512px, and maskable 512px).');
