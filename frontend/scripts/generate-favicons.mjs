/**
 * Build tab favicons from syniq-logo-v3.png (same asset as landing/nav).
 * Dark square backing + ~94% logo fill so the mark reads at 16–48px.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'src/assets/syniq-logo-v3.png');
const outDir = join(root, 'public');

/** Syniq app shell (#0d1117) — visible on light and dark browser chrome */
const BG = { r: 13, g: 17, b: 23, alpha: 1 };

/** Logo occupies this fraction of the canvas (higher = larger in tab) */
const LOGO_FILL = 0.97;

const SIZES = [
  { size: 16, name: 'syniq-favicon-16.png' },
  { size: 32, name: 'syniq-favicon-32.png' },
  { size: 48, name: 'syniq-favicon-48.png' },
  { size: 180, name: 'syniq-apple-touch.png' },
  { size: 192, name: 'syniq-favicon-192.png' },
  { size: 512, name: 'syniq-favicon-512.png' },
];

function loadLogo() {
  if (!existsSync(src)) {
    throw new Error(`Missing logo source: ${src}`);
  }

  return sharp(src).ensureAlpha().trim({ threshold: 12 });
}

async function renderSize(logo, size, dest) {
  const logoPx = Math.max(12, Math.round(size * LOGO_FILL));
  const mark = await logo
    .clone()
    .resize(logoPx, logoPx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(dest);
}

async function main() {
  const logo = loadLogo();

  for (const { size, name } of SIZES) {
    await renderSize(logo, size, join(outDir, name));
    console.log('wrote', name);
  }

  // Multi-size .ico for browsers that still request /favicon.ico
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
