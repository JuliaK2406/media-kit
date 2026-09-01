// HTML template for the page. Plain template strings, no framework.
// Every value from site.yaml goes through esc() or t(). t() turns any string
// containing TODO into a visible yellow placeholder so unfinished fields are obvious.

import { slugify } from '../images.mjs';

export const KIT_PDF = 'Julia-Krylova-Media-Kit-2026.pdf';
export const ONESHEET_PDF = 'Julia-Krylova-Speaker-One-Sheet-2026.pdf';

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const isTodo = (v) => typeof v === 'string' && v.includes('TODO');

export const t = (v) => {
  if (v == null || v === '') return '';
  return isTodo(v) ? `<span class="todo">${esc(v)}</span>` : esc(v);
};

const nonEmpty = (arr) => Array.isArray(arr) && arr.length > 0;

const findImage = (manifest, ref) => {
  if (!ref || isTodo(ref)) return null;
  if (manifest[ref]) return manifest[ref];
  const slug = slugify(ref).toLowerCase();
  return Object.values(manifest).find((m) => m.slug === slug) ?? null;
};

export function picture(manifest, ref, { alt, eager = false, sizes = '(min-width: 880px) 45vw, 92vw' } = {}) {
  const m = findImage(manifest, ref);
  if (!m) {
    return `<div class="img-placeholder"><span>Photo pending: ${t(ref) || 'no file set'}</span></div>`;
  }
  const webp = m.widths.map((w) => `img/${m.slug}-${w}.webp ${w}w`).join(', ');
  const jpeg = m.widths.map((w) => `img/${m.slug}-${w}.jpg ${w}w`).join(', ');
  const maxW = m.widths[m.widths.length - 1];
  const maxH = Math.round((m.height / m.width) * maxW);
  const loadAttrs = eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  return `<picture>
  <source type="image/webp" srcset="${webp}" sizes="${sizes}">
  <img src="img/${m.slug}-${maxW}.jpg" srcset="${jpeg}" sizes="${sizes}" alt="${esc(alt)}" width="${maxW}" height="${maxH}" ${loadAttrs}>
</picture>`;
}

const mailto = (email, name) => `mailto:${email}?subject=${encodeURIComponent(`Speaking enquiry: ${name}`)}`;

// closest generated width to 1024 for video posters
const posterWidth = (img) =>
  img.widths.reduce((best, w) => (Math.abs(w - 1024) < Math.abs(best - 1024) ? w : best), img.widths[0]);

function ctaButton(site) {
  const email = site.person?.email_speaking;
  const label = site.hero?.cta_label || 'Check my availability';
  if (!email || isTodo(email)) {
    return `<span class="todo">TODO: person.email_speaking (the "${esc(label)}" button appears when this email is set)</span>`;
  }
  return `<a class="btn" href="${esc(mailto(email, site.person.name))}">${esc(label)}</a>`;
}

function header(site) {
  const nav = [
    ['Speaking', '#speaking'],
    ['Topics', '#topics'],
    ['Press kit', '#press-kit'],
    ['Contact', '#contact'],
  ];
  if (site.podcast?.enabled === true) nav.push(['Podcast', '#podcast']);
  const links = nav.map(([label, href]) => `<a href="${href}">${label}</a>`).join('');
  return `<header class="site-header">
  <div class="container inner">
    <a class="brand" href="#top">${esc(site.person.name)}</a>
    <nav class="site-nav" aria-label="Page sections">${links}</nav>
    <a class="btn btn-outline btn-sm" href="${KIT_PDF}" download>Download media kit</a>
  </div>
</header>`;
}

function hero(site, manifest) {
  const p = site.person ?? {};
  const h = site.hero ?? {};
  const metaLine = [p.location, nonEmpty(p.languages) ? p.languages.join(' / ') : '']
    .filter(Boolean)
    .map(esc)
    .join(' &middot; ');
  return `<section class="hero" aria-label="Introduction">
  <div class="container grid">
    <div class="hero-copy">
      <h1>${esc(p.name ?? '')}</h1>
      <p class="positioning">${t(p.positioning)}</p>
      <p class="hero-headline">${t(h.headline)}</p>
      <p class="subhead">${t(h.subhead)}</p>
      <p class="meta-line">${metaLine}</p>
      <p class="hero-cta">${ctaButton(site)}</p>
    </div>
    <div class="hero-media">${picture(manifest, h.photo, { alt: `Portrait of ${p.name ?? 'the speaker'}`, eager: true })}</div>
  </div>
</section>`;
}

function proof(site) {
  const pr = site.proof ?? {};
  const stats = nonEmpty(pr.stats)
    ? `<div class="stats">${pr.stats
        .map(
          (s) => `<div class="stat">
        <div class="stat-value">${t(s.value)}</div>
        <div class="stat-label">${t(s.label)}</div>
      </div>`,
        )
        .join('')}</div>`
    : '';
  const clients = nonEmpty(pr.clients)
    ? `<div class="clients">
      <p class="clients-label">${esc(pr.clients_label ?? 'Selected clients')}</p>
      <div class="clients-list">${pr.clients.map((c) => `<span>${t(c)}</span>`).join('')}</div>
    </div>`
    : '';
  if (!stats && !clients) return '';
  return `<section class="proof" aria-label="Key facts">
  <div class="container">${stats}${clients}</div>
</section>`;
}

function videoSection(site, manifest) {
  const v = site.video;
  if (!v?.enabled) return '';
  const file = v.file ?? '';
  const posterImg = findImage(manifest, v.poster);
  let media;
  if (!file || isTodo(file)) {
    media = `<div class="img-placeholder"><span>${t(file) || 'Video pending'}</span></div>`;
  } else if (/\.(mp4|webm|mov)$/i.test(file)) {
    const posterAttr = posterImg ? ` poster="img/${posterImg.slug}-${posterWidth(posterImg)}.jpg"` : '';
    media = `<video controls preload="metadata"${posterAttr} src="video/${esc(file)}"></video>`;
  } else if (/vimeo/i.test(file) || /^\d+$/.test(file.trim())) {
    const id = file.trim().match(/(\d+)\s*$/)?.[1] ?? file.trim();
    media = `<iframe src="https://player.vimeo.com/video/${esc(id)}" title="Video of ${esc(site.person.name)} speaking" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  } else {
    const id = file.trim().match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)?.[1] ?? file.trim();
    media = `<iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}" title="Video of ${esc(site.person.name)} speaking" loading="lazy" allow="fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  }
  const posterPrint = posterImg
    ? `<img src="img/${posterImg.slug}-${posterWidth(posterImg)}.jpg" alt="Still frame from the video">`
    : `<div class="img-placeholder"><span>Video still pending</span></div>`;
  const watchUrl = `${String(site.meta?.site_url ?? '').replace(/\/$/, '')}/#video`;
  return `<section id="video" class="section video" aria-label="Video">
  <div class="container">
    <h2>Video</h2>
    <figure class="video-frame">
      ${media}
      <figcaption>${t(v.caption)}</figcaption>
      <div class="print-only video-print-frame">
        ${posterPrint}
        <p class="video-print-note">Watch the video online: ${esc(watchUrl)}</p>
      </div>
    </figure>
  </div>
</section>`;
}

function topics(site) {
  if (!nonEmpty(site.topics)) return '';
  const cards = site.topics
    .map(
      (tp) => `<article class="card">
      <h3>${t(tp.title)}</h3>
      <p>${t(tp.summary)}</p>
      ${
        nonEmpty(tp.takeaways)
          ? `<p class="takeaways-label">What the audience takes away</p>
      <ul>${tp.takeaways.map((x) => `<li>${t(x)}</li>`).join('')}</ul>`
          : ''
      }
      ${nonEmpty(tp.formats) ? `<p class="format-line">${tp.formats.map((f) => t(f)).join(' &middot; ')}</p>` : ''}
    </article>`,
    )
    .join('');
  return `<section id="topics" class="section topics">
  <div class="container">
    <h2>Speaking topics</h2>
    <div class="cards">${cards}</div>
  </div>
</section>`;
}

function formats(site) {
  const f = site.formats;
  if (!f) return '';
  const fact = (label, body) => (body ? `<div class="fact"><h3>${label}</h3>${body}</div>` : '');
  const list = (items) => (nonEmpty(items) ? `<ul>${items.map((x) => `<li>${t(x)}</li>`).join('')}</ul>` : '');
  const facts = [
    fact('Delivery', list(f.delivery)),
    fact('Setting', list(f.settings)),
    fact('Languages', nonEmpty(f.languages) ? `<p>${f.languages.map(esc).join(', ')}</p>` : ''),
    fact('Technical requirements', f.av_notes ? `<p>${t(f.av_notes)}</p>` : ''),
  ].join('');
  if (!facts) return '';
  return `<section id="formats" class="section formats">
  <div class="container">
    <h2>Formats and logistics</h2>
    <div class="facts">${facts}</div>
  </div>
</section>`;
}

function testimonials(site) {
  if (!nonEmpty(site.testimonials)) return '';
  const quotes = site.testimonials
    .map((q) => {
      const attribution = [t(q.name), t(q.role), t(q.company)].filter(Boolean).join(', ');
      return `<figure class="quote">
      <blockquote>${t(q.quote)}</blockquote>
      <figcaption><span class="quote-name">${attribution}</span></figcaption>
    </figure>`;
    })
    .join('');
  return `<section id="testimonials" class="section testimonials">
  <div class="container">
    <h2>Testimonials</h2>
    <div class="quotes">${quotes}</div>
  </div>
</section>`;
}

function about(site, manifest) {
  const a = site.about;
  if (!a) return '';
  const paragraphs = String(a.bio_long ?? '')
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => `<p>${t(p.trim())}</p>`)
    .join('');
  return `<section id="about" class="section about">
  <div class="container">
    <h2>About</h2>
    <div class="grid">
      <div class="about-media">${picture(manifest, a.photo, { alt: `Portrait of ${site.person.name}` })}</div>
      <div class="about-copy">${paragraphs}</div>
    </div>
  </div>
</section>`;
}

function pressKit(site, manifest) {
  const pk = site.press_kit ?? {};
  const bios = [
    ['One line bio', 'one_line'],
    ['Short bio (about 50 words)', 'short_50'],
    ['Medium bio (about 150 words)', 'medium_150'],
    ['Long bio (about 300 words)', 'long_300'],
  ];
  const bioBlocks = bios
    .map(([label, key]) => {
      const value = pk.bios?.[key];
      const copyBtn = !value || isTodo(value) ? '' : `<button type="button" class="btn btn-outline btn-sm copy-btn" data-copy="bio-${key}" hidden>Copy</button>`;
      return `<div class="bio-block">
      <div class="bio-head"><h3>${label}</h3>${copyBtn}</div>
      <p id="bio-${key}">${t(value)}</p>
    </div>`;
    })
    .join('');
  const intro = pk.intro_script
    ? `<div class="bio-block">
      <div class="bio-head"><h3>Introduction script</h3>${
        isTodo(pk.intro_script) ? '' : '<button type="button" class="btn btn-outline btn-sm copy-btn" data-copy="intro-script" hidden>Copy</button>'
      }</div>
      <p id="intro-script">${t(pk.intro_script)}</p>
    </div>`
    : '';
  const photoLinks = Object.values(manifest)
    .map((m) => `<li><a href="${esc(m.press)}" download>${esc(m.pressName)}</a></li>`)
    .join('');
  const photosCard = photoLinks
    ? `<ul class="press-photo-list">${photoLinks}</ul>`
    : `<p>High resolution photos will appear here once they are uploaded.</p>`;
  return `<section id="press-kit" class="section press-kit">
  <div class="container">
    <h2>Press kit</h2>
    <div class="dl-cards">
      <div class="dl-card">
        <h3>Full media kit</h3>
        <p>Everything on this page as a single PDF. A4.</p>
        <a class="btn btn-sm" href="${KIT_PDF}" download>Download PDF</a>
      </div>
      <div class="dl-card">
        <h3>Speaker one-sheet</h3>
        <p>One page summary for organisers. A4.</p>
        <a class="btn btn-sm" href="${ONESHEET_PDF}" download>Download PDF</a>
      </div>
      <div class="dl-card">
        <h3>Photos</h3>
        ${photosCard}
      </div>
    </div>
    ${bioBlocks}
    ${intro}
  </div>
</section>`;
}

function pressMentions(site) {
  if (!nonEmpty(site.press_mentions)) return '';
  const items = site.press_mentions
    .map((m) => {
      if (typeof m === 'string') return `<li>${t(m)}</li>`;
      const title = m.url ? `<a href="${esc(m.url)}">${t(m.title)}</a>` : t(m.title);
      return `<li>${[title, t(m.outlet), t(m.date)].filter(Boolean).join(', ')}</li>`;
    })
    .join('');
  return `<section id="press" class="section press-mentions">
  <div class="container">
    <h2>Press and media</h2>
    <ul class="press-list">${items}</ul>
  </div>
</section>`;
}

function podcast(site) {
  const pod = site.podcast;
  if (pod?.enabled !== true) return '';
  const story = String(pod.origin_story ?? '')
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => `<p>${t(p.trim())}</p>`)
    .join('');
  const list = (items) => (nonEmpty(items) ? `<ul>${items.map((x) => `<li>${t(x)}</li>`).join('')}</ul>` : '');
  const appearances = nonEmpty(pod.appearances)
    ? `<div class="podcast-appearances">
      <h3>Previous appearances</h3>
      <ul>${pod.appearances
        .map((a) => {
          if (typeof a === 'string') return `<li>${t(a)}</li>`;
          const title = a.url ? `<a href="${esc(a.url)}">${t(a.title)}</a>` : t(a.title);
          return `<li>${[title, t(a.show)].filter(Boolean).join(', ')}</li>`;
        })
        .join('')}</ul>
    </div>`
    : '';
  return `<section id="podcast" class="section podcast">
  <div class="container">
    <h2>Podcast</h2>
    ${story}
    <div class="podcast-cols">
      ${pod.talking_points?.length ? `<div><h3>Talking points</h3>${list(pod.talking_points)}</div>` : ''}
      ${pod.questions?.length ? `<div><h3>Suggested questions</h3>${list(pod.questions)}</div>` : ''}
    </div>
    ${appearances}
  </div>
</section>`;
}

function contact(site) {
  const p = site.person ?? {};
  const line = (label, email, field) => {
    if (!email) return '';
    const value = isTodo(email)
      ? `<span class="todo">TODO: ${field}</span>`
      : `<a href="${esc(mailto(email, p.name))}">${esc(email)}</a>`;
    return `<p class="contact-line">${label}: ${value}</p>`;
  };
  return `<section id="contact" class="section contact">
  <div class="container">
    <h2>Contact</h2>
    ${line('Speaking enquiries', p.email_speaking, 'person.email_speaking')}
    ${site.podcast?.enabled === true ? line('Podcast enquiries', p.email_podcast, 'person.email_podcast') : ''}
    <p class="hero-cta">${ctaButton(site)}</p>
  </div>
</section>`;
}

function footer(site) {
  const p = site.person ?? {};
  const mainSite = p.main_site ? String(p.main_site) : '';
  const mainLabel = mainSite.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  const socials = nonEmpty(p.socials)
    ? p.socials.map((s) => `<a href="${esc(s.url)}">${esc(s.label)}</a>`).join('')
    : '';
  return `<footer class="site-footer">
  <div class="container inner">
    <p>&copy; ${new Date().getFullYear()} ${esc(p.name ?? '')}</p>
    <nav aria-label="Elsewhere">
      ${mainSite ? `<a href="${esc(mainSite)}">${esc(mainLabel)}</a>` : ''}
      ${socials}
    </nav>
  </div>
</footer>`;
}

// Progressive enhancement only: without JS the copy buttons stay hidden
// and the page keeps working. This is the only script on the page.
const copyScript = `<script>
(function () {
  if (!navigator.clipboard) return;
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var src = document.getElementById(btn.getAttribute('data-copy'));
      if (!src) return;
      navigator.clipboard.writeText(src.innerText.trim()).then(function () {
        var original = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = original; }, 1600);
      });
    });
  });
})();
</script>`;

export function renderPage(site, { manifest = {} } = {}) {
  const m = site.meta ?? {};
  const published = m.published === true;
  const ogImg = findImage(manifest, m.og_image);
  const baseUrl = String(m.site_url ?? '').replace(/\/$/, '');
  const ogImgUrl = ogImg ? `${baseUrl}/img/${ogImg.slug}-${ogImg.widths[ogImg.widths.length - 1]}.jpg` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(m.title ?? site.person?.name ?? '')}</title>
<meta name="description" content="${esc(m.description ?? '')}">
${published ? `<link rel="canonical" href="${esc(baseUrl)}/">` : '<meta name="robots" content="noindex, nofollow">'}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(m.title ?? '')}">
<meta property="og:description" content="${esc(m.description ?? '')}">
<meta property="og:url" content="${esc(baseUrl)}/">
${ogImgUrl ? `<meta property="og:image" content="${esc(ogImgUrl)}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Lora:ital,wght@0,500;0,600;1,500&display=swap">
<link rel="stylesheet" href="styles/tokens.css">
<link rel="stylesheet" href="styles/page.css">
<link rel="stylesheet" href="styles/print.css" media="print">
</head>
<body id="top">
<a class="skip-link" href="#speaking">Skip to content</a>
${header(site)}
<main>
<div id="speaking">
${hero(site, manifest)}
${proof(site)}
${videoSection(site, manifest)}
${topics(site)}
${formats(site)}
${testimonials(site)}
${about(site, manifest)}
${pressKit(site, manifest)}
${pressMentions(site)}
</div>
${podcast(site)}
${contact(site)}
</main>
${footer(site)}
${copyScript}
</body>
</html>
`;
}
