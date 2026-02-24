#!/usr/bin/env node
/**
 * Generate PWA icon PNGs from the SVG source.
 * Run from the repo root: node scripts/generate-pwa-icons.js
 *
 * Requires: sharp (installed in scripts/node_modules)
 */

const sharp = require('./node_modules/sharp');
const path = require('path');
const fs = require('fs');

const SRC_SVG = path.resolve(__dirname, '../frontend/public/favicon.svg');
const OUT_DIR = path.resolve(__dirname, '../frontend/public/icons');

const STANDARD_SIZES = [72, 96, 128, 144, 152, 192, 256, 384, 512];
const MASKABLE_SIZES = [192, 512];
// Maskable icons use 80% of the icon area as safe zone (10% padding each side)
const MASKABLE_PADDING_PCT = 0.1;

async function main() {
  if (!fs.existsSync(SRC_SVG)) {
    console.error(`Source SVG not found: ${SRC_SVG}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Standard icons
  for (const size of STANDARD_SIZES) {
    const outPath = path.join(OUT_DIR, `icon-${size}.png`);
    await sharp(SRC_SVG)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`Generated: ${path.relative(process.cwd(), outPath)}`);
  }

  // Maskable icons — add padding so the icon sits within the safe zone
  for (const size of MASKABLE_SIZES) {
    const padding = Math.round(size * MASKABLE_PADDING_PCT);
    const innerSize = size - padding * 2;
    const outPath = path.join(OUT_DIR, `icon-${size}-maskable.png`);
    const inner = await sharp(SRC_SVG)
      .resize(innerSize, innerSize)
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 59, g: 130, b: 246, alpha: 1 }, // blue-500 background
      },
    })
      .composite([{ input: inner, left: padding, top: padding }])
      .png()
      .toFile(outPath);
    console.log(`Generated maskable: ${path.relative(process.cwd(), outPath)}`);
  }

  console.log(`\nAll icons written to: ${path.relative(process.cwd(), OUT_DIR)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
