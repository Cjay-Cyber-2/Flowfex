/**
 * Build tab favicons from syniq-logo-v3.png (same asset as landing/nav).
 * Center-zooms the mark then fills the canvas so it reads large at 16–32px.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'src/assets/syniq-logo-v3.png');
const outDir = join(root, 'public');

/** Syniq app shell (#0d1117) — visible on light browser chrome */
const BG = { r: 13, g: 17, b: 23, alpha: 1 };

/**
 * How much of the trimmed logo to keep before scaling (lower = more zoom).
 * ~0.62 crops to the inner emblem so the tab icon is not a tiny hex outline.
 */
const CENTER_CROP_RATIO = 0.54;

const SIZES = [
  { size: 16, name: 'syniq-favicon-16.png' },
  { size: 32, name: 'syniq-favicon-32.png' },
  { size: 48, name: 'syniq-favicon-48.png' },
  { size: 180, name: 'syniq-apple-touch.png' },
  { size: 192, name: 'syniq-favicon-192.png' },
  { size: 512, name: 'syniq-favicon-512.png' },
];

async function loadZoomedLogo() {
  if (!existsSync(src)) {
    throw new Error(`Missing logo source: ${src}`);
  }

  const trimmed = sharp(src).ensureAlpha().trim({ threshold: 12 });
  const { width, height } = await trimmed.metadata();
  if (!width || !height) {
    throw new Error('Could not read logo dimensions');
  }

  const cropW = Math.max(1, Math.round(width * CENTER_CROP_RATIO));
  const cropH = Math.max(1, Math.round(height * CENTER_CROP_RATIO));
  const left = Math.floor((width - cropW) / 2);
  const top = Math.floor((height - cropH) / 2);

  return trimmed.extract({ left, top, width: cropW, height: cropH });
}

async function renderSize(logo, size, dest) {
  let mark = logo.clone().resize(size, size, {
    fit: 'cover',
    position: 'centre',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  if (size <= 32) {
    mark = mark.sharpen({ sigma: 0.8, m1: 0.5, m2: 0.35 });
  }

  const markBuffer = await mark.png().toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: markBuffer, gravity: 'center' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(dest);
}

async function main() {
  const logo = await loadZoomedLogo();

  for (const { size, name } of SIZES) {
    await renderSize(logo, size, join(outDir, name));
    console.log('wrote', name);
  }

  const { execSync } = await import('node:child_process');
  execSync(
    `python3 -c "
from PIL import Image
from pathlib import Path
p = Path('${outDir}')
layers = [Image.open(p / f'syniq-favicon-{s}.png').convert('RGBA') for s in (16, 32, 48)]
layers[0].save(p / 'favicon.ico', format='ICO', sizes=[(16,16),(32,32),(48,48)], append_images=layers[1:])
print('wrote favicon.ico')
"`,
    { stdio: 'inherit' }
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
