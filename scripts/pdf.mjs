// Prints both PDFs with Playwright from the same content as the page:
// the full media kit from dist/index.html with print.css applied,
// the one-sheet from its own single page template in src/render/pdf.mjs.
// Text stays selectable, format A4, margins 12mm.

import { access, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { renderOneSheet } from '../src/render/pdf.mjs';
import { KIT_PDF, ONESHEET_PDF } from '../src/render/page.mjs';

const A4_MARGIN = { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' };

async function waitForFonts(page) {
  try {
    await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]));
  } catch {
    // offline is fine, fallback fonts render instead
  }
}

export async function buildPdfs({ site, distDir, root }) {
  const indexPath = path.join(distDir, 'index.html');
  try {
    await access(indexPath);
  } catch {
    throw new Error('dist/index.html not found. Run "npm run build" first.');
  }

  const css =
    (await readFile(path.join(root, 'src', 'styles', 'tokens.css'), 'utf8')) +
    '\n' +
    (await readFile(path.join(root, 'src', 'styles', 'print.css'), 'utf8'));
  const oneSheetPath = path.join(os.tmpdir(), `media-kit-one-sheet-${process.pid}.html`);
  await writeFile(oneSheetPath, renderOneSheet(site, { css }));

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();

    await page.goto(pathToFileURL(indexPath).href, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    await waitForFonts(page);
    await page.pdf({ path: path.join(distDir, KIT_PDF), format: 'A4', margin: A4_MARGIN, printBackground: true });
    console.log(`pdf: ${KIT_PDF}`);

    await page.goto(pathToFileURL(oneSheetPath).href, { waitUntil: 'load' });
    await waitForFonts(page);
    await page.pdf({ path: path.join(distDir, ONESHEET_PDF), format: 'A4', margin: A4_MARGIN, printBackground: true });
    console.log(`pdf: ${ONESHEET_PDF}`);
  } finally {
    await browser.close();
    await rm(oneSheetPath, { force: true });
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { loadSite } = await import('../src/check.mjs');
  const root = fileURLToPath(new URL('..', import.meta.url));
  const site = await loadSite();
  await buildPdfs({ site, distDir: path.join(root, 'dist'), root });
}
