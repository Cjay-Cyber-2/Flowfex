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

/**
 * Build a minimal ICO file from an array of PNG buffers.
 * ICO format: 6-byte header, then one 16-byte directory entry per image,
 * followed by the raw PNG data for each image.
 */
function buildIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * count;
  let dataOffset = headerSize + dirSize;

  // ICO header: reserved(2) + type 1=icon(2) + count(2)
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);       // reserved
  header.writeUInt16LE(1, 2);       // type: icon
  header.writeUInt16LE(count, 4);   // image count

  const dirEntries = [];
  for (let i = 0; i < count; i++) {
    const entry = Buffer.alloc(dirEntrySize);
    const s = sizes[i];
    entry.writeUInt8(s >= 256 ? 0 : s, 0);          // width  (0 = 256)
    entry.writeUInt8(s >= 256 ? 0 : s, 1);          // height (0 = 256)
    entry.writeUInt8(0, 2);                           // color palette
    entry.writeUInt8(0, 3);                           // reserved
    entry.writeUInt16LE(1, 4);                        // color planes
    entry.writeUInt16LE(32, 6);                       // bits per pixel
    entry.writeUInt32LE(pngBuffers[i].length, 8);    // image data size
    entry.writeUInt32LE(dataOffset, 12);              // offset to image data
    dirEntries.push(entry);
    dataOffset += pngBuffers[i].length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

async function main() {
  const { writeFileSync } = await import('node:fs');
  const logo = await loadZoomedLogo();

  for (const { size, name } of SIZES) {
    await renderSize(logo, size, join(outDir, name));
    console.log('wrote', name);
  }

  // Build favicon.ico from the 16, 32, 48 px PNGs (pure Node.js — no Python needed)
  const icoSizes = [16, 32, 48];
  const pngBuffers = [];
  for (const s of icoSizes) {
    const { readFileSync } = await import('node:fs');
    pngBuffers.push(readFileSync(join(outDir, `syniq-favicon-${s}.png`)));
  }
  const icoBuffer = buildIco(pngBuffers, icoSizes);
  writeFileSync(join(outDir, 'favicon.ico'), icoBuffer);
  console.log('wrote favicon.ico');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
