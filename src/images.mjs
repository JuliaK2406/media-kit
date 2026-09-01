// Derived images via sharp. Originals in content/photos are never served directly:
// the page gets 640/1024/1600 in webp+jpeg, the press kit gets a 2400px jpeg.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PAGE_WIDTHS = [640, 1024, 1600];
const PRESS_WIDTH = 2400;
const PRESS_QUALITY = 88;
const PAGE_QUALITY = 82;
const IMAGE_RE = /\.(jpe?g|png|webp|tiff?)$/i;

export const slugify = (name) =>
  name
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const titleCase = (slug) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('-');

export async function buildImages({ photosDir, distDir }) {
  const manifest = {};
  let files = [];
  try {
    files = (await fs.readdir(photosDir)).filter((f) => IMAGE_RE.test(f) && !f.startsWith('.'));
  } catch {
    // photos directory does not exist yet
  }
  if (files.length === 0) {
    console.log('images: no photos in content/photos yet, the page will show placeholders');
    return manifest;
  }

  const imgDir = path.join(distDir, 'img');
  const pressDir = path.join(distDir, 'press');
  await fs.mkdir(imgDir, { recursive: true });
  await fs.mkdir(pressDir, { recursive: true });

  for (const file of files) {
    const src = path.join(photosDir, file);
    const slug = slugify(file).toLowerCase();
    const meta = await sharp(src).metadata();
    // EXIF orientation 5..8 swaps width and height after rotate()
    const swapped = (meta.orientation ?? 1) >= 5;
    const width = swapped ? meta.height : meta.width;
    const height = swapped ? meta.width : meta.height;

    const widths = PAGE_WIDTHS.filter((w) => w <= width);
    if (widths.length === 0) widths.push(width);

    for (const w of widths) {
      await sharp(src).rotate().resize({ width: w }).webp({ quality: PAGE_QUALITY }).toFile(path.join(imgDir, `${slug}-${w}.webp`));
      await sharp(src).rotate().resize({ width: w }).jpeg({ quality: PAGE_QUALITY, mozjpeg: true }).toFile(path.join(imgDir, `${slug}-${w}.jpg`));
    }

    const pressBase = /^julia-krylova/.test(slug) ? titleCase(slug) : `Julia-Krylova-${titleCase(slug)}`;
    const pressName = `${pressBase}-${PRESS_WIDTH}px.jpg`;
    await sharp(src)
      .rotate()
      .resize({ width: PRESS_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: PRESS_QUALITY, mozjpeg: true })
      .toFile(path.join(pressDir, pressName));

    manifest[file] = { slug, widths, width, height, press: `press/${pressName}`, pressName };
    console.log(`images: ${file} -> ${widths.map((w) => w + 'px').join(', ')} + press/${pressName}`);
  }
  return manifest;
}
