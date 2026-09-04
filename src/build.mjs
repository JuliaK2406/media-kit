// Full build: yaml -> images -> dist/index.html -> static files -> both PDFs.

import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSite, reportTodos, assertPublishable } from './check.mjs';
import { buildImages } from './images.mjs';
import { renderPage } from './render/page.mjs';
import { buildPdfs } from '../scripts/pdf.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const distDir = path.join(root, 'dist');

const site = await loadSite();
const todos = reportTodos(site);
assertPublishable(site, todos);
const published = site?.meta?.published === true;

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

const manifest = await buildImages({
  photosDir: path.join(root, 'content', 'photos'),
  distDir,
  posterFile: site?.video?.poster,
});

await mkdir(path.join(distDir, 'styles'), { recursive: true });
for (const f of ['tokens.css', 'page.css', 'print.css']) {
  await cp(path.join(root, 'src', 'styles', f), path.join(distDir, 'styles', f));
}
await cp(path.join(root, 'src', 'assets', 'favicon.svg'), path.join(distDir, 'favicon.svg'));

// Video files are optional until content/video gets real material
try {
  await cp(path.join(root, 'content', 'video'), path.join(distDir, 'video'), {
    recursive: true,
    filter: (src) => !path.basename(src).startsWith('.'),
  });
} catch {
  // no video directory yet
}

await writeFile(path.join(distDir, 'index.html'), renderPage(site, { manifest }));
console.log('build: dist/index.html');

if (!published) {
  await writeFile(path.join(distDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  console.log('build: robots.txt (Disallow all, page is not published yet)');
}

await buildPdfs({ site, distDir, root });

console.log('build: done, output in dist/');
