// Print variant of the same template: the one-sheet, a single A4 page built
// from the same site.yaml. The full media kit PDF is printed straight from
// dist/index.html with print.css, so it needs no template of its own.

import { esc, isTodo, t, quoted } from './page.mjs';

export function renderOneSheet(site, { css = '' } = {}) {
  const p = site.person ?? {};
  const metaLine = [p.location, Array.isArray(p.languages) && p.languages.length ? p.languages.join(' / ') : '']
    .filter(Boolean)
    .map(esc)
    .join(' &middot; ');

  const stats = (site.proof?.stats ?? [])
    .map(
      (s) => `<div class="os-stat">
      <div class="os-stat-value">${t(s.value)}</div>
      <div class="os-stat-label">${t(s.label)}</div>
    </div>`,
    )
    .join('');

  const topics = (site.topics ?? [])
    .slice(0, 3)
    .map(
      (tp) => `<div class="os-topic">
      <h3>${t(tp.title)}</h3>
      <p>${t(tp.summary)}</p>
      ${Array.isArray(tp.formats) && tp.formats.length ? `<p class="os-format">${tp.formats.map((f) => t(f)).join(' &middot; ')}</p>` : ''}
    </div>`,
    )
    .join('');

  const q = (site.testimonials ?? [])[0];
  const quote = q
    ? `<figure class="os-quote">
      <blockquote>${quoted(q.quote)}</blockquote>
      <figcaption>${[t(q.name), t(q.role), t(q.company)].filter(Boolean).join(', ')}</figcaption>
    </figure>`
    : '';

  const email = p.email_speaking;
  const emailHtml =
    !email || isTodo(email)
      ? '<span class="todo">TODO: person.email_speaking</span>'
      : `<a href="mailto:${esc(email)}">${esc(email)}</a>`;

  const siteUrl = String(site.meta?.site_url ?? '').replace(/\/$/, '');
  const siteLabel = siteUrl.replace(/^https?:\/\//, '');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(p.name ?? '')}: speaker one-sheet</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Lora:ital,wght@0,500;0,600;1,500&display=swap">
<style>
${css}
</style>
</head>
<body class="one-sheet">
<header class="os-header">
  <h1>${esc(p.name ?? '')}</h1>
  <p class="os-positioning">${t(p.positioning)}</p>
  <p class="os-meta">${metaLine}</p>
</header>
${stats ? `<section><h2>At a glance</h2><div class="os-stats">${stats}</div></section>` : ''}
${topics ? `<section><h2>Speaking topics</h2>${topics}</section>` : ''}
${quote ? `<section><h2>Testimonial</h2>${quote}</section>` : ''}
<section class="os-contact">
  <h2>Contact</h2>
  <p>Speaking enquiries: ${emailHtml}</p>
  ${siteLabel ? `<p>Media kit and photos: ${esc(siteLabel)}</p>` : ''}
</section>
</body>
</html>
`;
}
