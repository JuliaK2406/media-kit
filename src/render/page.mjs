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

// Typographic quotes for testimonial text; TODO fields keep the placeholder look
export const quoted = (v) => (isTodo(v) || v == null ? t(v) : `&ldquo;${esc(v)}&rdquo;`);

const nonEmpty = (arr) => Array.isArray(arr) && arr.length > 0;

const CAPS_DOT = ' <span aria-hidden="true">&middot;</span> ';

const findImage = (manifest, ref) => {
  if (!ref || isTodo(ref)) return null;
  if (manifest[ref]) return manifest[ref];
  const slug = slugify(ref).toLowerCase();
  return Object.values(manifest).find((m) => m.slug === slug) ?? null;
};

export function picture(manifest, ref, { alt, eager = false, sizes = '(min-width: 900px) 48vw, 100vw' } = {}) {
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
    <a class="btn btn-sm" href="${KIT_PDF}" download>Download media kit</a>
  </div>
</header>`;
}

function hero(site, manifest) {
  const p = site.person ?? {};
  const h = site.hero ?? {};
  const metaLine = [p.location, nonEmpty(p.languages) ? p.languages.join(' / ') : '']
    .filter(Boolean)
    .map(esc)
    .join(CAPS_DOT);
  return `<section class="hero" aria-label="Introduction">
  <div class="hero-grid">
    <div class="hero-media">${picture(manifest, h.photo, {
      alt: `Portrait of ${p.name ?? 'the speaker'}`,
      eager: true,
      sizes: '(min-width: 900px) 48vw, 100vw',
    })}</div>
    <div class="hero-copy">
      <h1>${t(h.headline)}</h1>
      <p class="subhead">${t(h.subhead)}</p>
      <p class="hero-cta">${ctaButton(site)}</p>
      <p class="meta-line">${metaLine}</p>
    </div>
  </div>
</section>`;
}

function proof(site) {
  const pr = site.proof ?? {};
  const stats = nonEmpty(pr.stats)
    ? `<div class="stats">${pr.stats
        .map(
          (s) => `<div class="stat" data-reveal>
        <div class="stat-value">${t(s.value)}</div>
        <div class="stat-label">${t(s.label)}</div>
      </div>`,
        )
        .join('')}</div>`
    : '';
  const clients = nonEmpty(pr.clients)
    ? `<p class="clients-line" data-reveal><span class="clients-label">${esc(pr.clients_label ?? 'Selected clients')}</span>${pr.clients
        .map((c) => `<span class="client-name">${t(c)}</span>`)
        .join(' ')}</p>`
    : '';
  if (!stats && !clients) return '';
  return `<section class="section proof" aria-label="Key facts">
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
    const posterSrc = posterImg ? posterImg.poster ?? `img/${posterImg.slug}-${posterWidth(posterImg)}.jpg` : '';
    const posterAttr = posterSrc ? ` poster="${posterSrc}"` : '';
    media = `<video controls preload="metadata"${posterAttr} src="video/${esc(file)}"></video>`;
  } else if (/vimeo/i.test(file) || /^\d+$/.test(file.trim())) {
    const id = file.trim().match(/(\d+)\s*$/)?.[1] ?? file.trim();
    media = `<iframe src="https://player.vimeo.com/video/${esc(id)}" title="Video of ${esc(site.person.name)} speaking" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  } else {
    const id = file.trim().match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)?.[1] ?? file.trim();
    media = `<iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}" title="Video of ${esc(site.person.name)} speaking" loading="lazy" allow="fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  }
  const posterPrint = posterImg
    ? `<img src="${posterImg.poster ?? `img/${posterImg.slug}-${posterWidth(posterImg)}.jpg`}" alt="Still frame from the video">`
    : `<div class="img-placeholder"><span>Video still pending</span></div>`;
  const watchUrl = `${String(site.meta?.site_url ?? '').replace(/\/$/, '')}/#video`;
  return `<section id="video" class="section-video" aria-label="Video">
  <div class="container" data-reveal>
    <h2 class="sr-only">Video</h2>
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

function gallery(site, manifest) {
  const g = site.gallery;
  if (g?.enabled !== true || !nonEmpty(g.items)) return '';
  const cells = g.items
    .map((it) => {
      const alt = isTodo(it.caption) || !it.caption ? `Event photo: ${site.person?.name ?? ''}` : it.caption;
      return `<figure class="gallery-item" data-reveal>
      ${picture(manifest, it.image, { alt, sizes: '(min-width: 900px) 33vw, (min-width: 700px) 50vw, 100vw' })}
      <figcaption>${t(it.caption)}</figcaption>
    </figure>`;
    })
    .join('');
  return `<section id="gallery" class="section gallery">
  <div class="container">
    <h2>${t(g.title)}</h2>
    <div class="gallery-grid">${cells}</div>
  </div>
</section>`;
}

function highlights(site) {
  const h = site.highlights;
  if (h?.enabled !== true || !nonEmpty(h.items)) return '';
  const rows = h.items
    .map(
      (it) => `<li class="highlight-row" data-reveal>
      <span class="highlight-event">${t(it.event)}</span>
      <span class="highlight-meta">${[t(it.place), t(it.year)].filter(Boolean).join(CAPS_DOT)}</span>
    </li>`,
    )
    .join('');
  return `<section id="highlights" class="section highlights">
  <div class="container">
    <h2>${t(h.title)}</h2>
    <ul class="highlight-list">${rows}</ul>
  </div>
</section>`;
}

function faq(site) {
  const f = site.faq;
  if (f?.enabled !== true || !nonEmpty(f.items)) return '';
  const rows = f.items
    .map(
      (it) => `<div class="faq-item" data-reveal>
      <h3 class="faq-q">${t(it.q)}</h3>
      <p class="faq-a">${t(it.a)}</p>
    </div>`,
    )
    .join('');
  return `<section id="faq" class="section faq">
  <div class="container">
    <h2>${t(f.title)}</h2>
    <div class="faq-list">${rows}</div>
  </div>
</section>`;
}

function topics(site) {
  if (!nonEmpty(site.topics)) return '';
  const items = site.topics
    .map(
      (tp, i) => `<li class="topic" data-reveal>
      <div class="topic-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</div>
      <div class="topic-body">
        <h3>${t(tp.title)}</h3>
        <p class="topic-summary">${t(tp.summary)}</p>
        ${
          nonEmpty(tp.takeaways)
            ? `<p class="takeaways-label">What the audience takes away</p>
        <ul class="takeaways">${tp.takeaways.map((x) => `<li>${t(x)}</li>`).join('')}</ul>`
            : ''
        }
        ${nonEmpty(tp.formats) ? `<p class="topic-formats">${tp.formats.map((f) => t(f)).join(CAPS_DOT)}</p>` : ''}
      </div>
    </li>`,
    )
    .join('');
  return `<section id="topics" class="section topics">
  <div class="container">
    <h2>Speaking topics</h2>
    <ol class="topic-list">${items}</ol>
  </div>
</section>`;
}

function formats(site) {
  const f = site.formats;
  if (!f) return '';
  const row = (label, body) =>
    body
      ? `<div class="fact-row">
      <h3 class="fact-label">${label}</h3>
      <div class="fact-value">${body}</div>
    </div>`
      : '';
  const joined = (items) => (nonEmpty(items) ? items.map((x) => t(x)).join(CAPS_DOT) : '');
  const rows = [
    row('Delivery', joined(f.delivery)),
    row('Setting', joined(f.settings)),
    row('Languages', nonEmpty(f.languages) ? f.languages.map(esc).join(CAPS_DOT) : ''),
    row('Technical requirements', f.av_notes ? `<p>${t(f.av_notes)}</p>` : ''),
  ].join('');
  if (!rows) return '';
  return `<section id="formats" class="section formats">
  <div class="container">
    <h2>Formats and logistics</h2>
    <div class="fact-rows" data-reveal>${rows}</div>
  </div>
</section>`;
}

const initials = (name) =>
  String(name ?? '')
    .split(',')[0]
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .filter((c, i, arr) => i === 0 || i === arr.length - 1)
    .join('')
    .toUpperCase();

function avatar(q, manifest) {
  const img = findImage(manifest, q.photo);
  if (img) {
    return `<img class="avatar" src="img/${img.slug}-${img.widths[0]}.jpg" alt="" width="48" height="48" loading="lazy">`;
  }
  return `<span class="avatar avatar-initials" aria-hidden="true">${esc(initials(q.name))}</span>`;
}

function testimonials(site, manifest) {
  if (!nonEmpty(site.testimonials)) return '';
  const attribution = (q) => [t(q.name), t(q.role), t(q.company)].filter(Boolean).join(', ');
  const byline = (q) => `<figcaption class="quote-byline">${avatar(q, manifest)}<span>${attribution(q)}</span></figcaption>`;
  const [featured, ...rest] = site.testimonials;
  const featuredHtml = `<figure class="quote-featured" data-reveal>
    <blockquote>${isTodo(featured.quote) ? t(featured.quote) : `${esc(featured.quote)}&rdquo;`}</blockquote>
    ${byline(featured)}
  </figure>`;
  const restHtml = nonEmpty(rest)
    ? `<div class="quote-grid">${rest
        .map(
          (q) => `<figure class="quote-small" data-reveal>
      <blockquote>${quoted(q.quote)}</blockquote>
      ${byline(q)}
    </figure>`,
        )
        .join('')}</div>`
    : '';
  return `<section id="testimonials" class="section testimonials">
  <div class="container">
    <h2>Testimonials</h2>
    ${featuredHtml}
    ${restHtml}
  </div>
</section>`;
}

function about(site, manifest) {
  const a = site.about;
  if (!a) return '';
  const paragraphs = String(a.bio_long ?? '')
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p, i) => `<p${i === 0 ? ' class="lead"' : ''}>${t(p.trim())}</p>`)
    .join('');
  return `<section id="about" class="section about">
  <div class="about-grid">
    <div class="about-media" data-reveal>${picture(manifest, a.photo, {
      alt: `Portrait of ${site.person.name}`,
      sizes: '(min-width: 900px) 44vw, 100vw',
    })}</div>
    <div class="about-copy" data-reveal>
      <h2>About</h2>
      ${paragraphs}
    </div>
  </div>
</section>`;
}

function pressKit(site, manifest) {
  const pk = site.press_kit ?? {};
  const spacer = '<span class="press-thumb press-thumb-spacer" aria-hidden="true"></span>';
  const dlRow = (href, title, meta, thumb = spacer) => `<a class="dl-row" href="${esc(href)}" download>
      <span class="dl-left">${thumb}<span class="dl-title">${title}</span></span>
      <span class="dl-meta">${meta}<span class="dl-arrow" aria-hidden="true">&darr;</span></span>
    </a>`;
  const photoTitle = (m) => {
    const words = m.slug.replace(/^julia-krylova-?/, '').split('-').filter(Boolean);
    const label = words.length ? words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : 'Portrait';
    return `Photo: ${label}`;
  };
  const photoRows = Object.values(manifest)
    .map((m) =>
      dlRow(
        m.press,
        esc(photoTitle(m)),
        'JPEG',
        `<img class="press-thumb" src="img/${m.slug}-${m.widths[0]}.jpg" alt="" width="56" height="56" loading="lazy">`,
      ),
    )
    .join('');
  const bios = [
    ['One line bio', 'one_line'],
    ['Short bio (about 50 words)', 'short_50'],
    ['Medium bio (about 150 words)', 'medium_150'],
    ['Long bio (about 300 words)', 'long_300'],
  ];
  const bioParagraphs = (value) =>
    String(value ?? '')
      .split(/\n{2,}/)
      .filter((p) => p.trim())
      .map((p) => `<p>${t(p.trim())}</p>`)
      .join('');
  const bioBlocks = bios
    .map(([label, key]) => {
      const value = pk.bios?.[key];
      const copyBtn =
        !value || isTodo(value)
          ? ''
          : `<button type="button" class="btn btn-sm copy-btn" data-copy="bio-${key}" hidden>Copy</button>`;
      return `<div class="bio-block" data-reveal>
      <div class="bio-head"><h3>${label}</h3>${copyBtn}</div>
      <div id="bio-${key}">${bioParagraphs(value)}</div>
    </div>`;
    })
    .join('');
  const intro = pk.intro_script
    ? `<div class="bio-block" data-reveal>
      <div class="bio-head"><h3>Introduction script</h3>${
        isTodo(pk.intro_script)
          ? ''
          : '<button type="button" class="btn btn-sm copy-btn" data-copy="intro-script" hidden>Copy</button>'
      }</div>
      <div id="intro-script">${bioParagraphs(pk.intro_script)}</div>
    </div>`
    : '';
  return `<section id="press-kit" class="section press-kit">
  <div class="container">
    <h2>Press kit</h2>
    <div class="press-downloads" data-reveal>
      ${dlRow(KIT_PDF, 'Full media kit', 'PDF, A4')}
      ${dlRow(ONESHEET_PDF, 'Speaker one-sheet', 'PDF, A4')}
      ${photoRows}
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
  const email = p.email_speaking;
  const emailLine =
    !email || isTodo(email)
      ? `<p class="contact-big"><span class="todo">TODO: person.email_speaking</span></p>`
      : `<p class="contact-big"><a href="${esc(mailto(email, p.name))}">${esc(email)}</a></p>`;
  const podcastLine =
    site.podcast?.enabled === true && p.email_podcast && p.email_podcast !== p.email_speaking
      ? `<p class="overline">Podcast enquiries: ${
          isTodo(p.email_podcast)
            ? `<span class="todo">TODO: person.email_podcast</span>`
            : `<a href="mailto:${esc(p.email_podcast)}">${esc(p.email_podcast)}</a>`
        }</p>`
      : '';
  return `<section id="contact" class="contact">
  <div class="container" data-reveal>
    <h2 class="overline">Contact</h2>
    ${emailLine}
    <p>${ctaButton(site)}</p>
    ${podcastLine}
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

// Script one: copy buttons. Progressive enhancement only, buttons stay hidden without JS.
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

// Script two: section reveal plus the header hairline that appears after scroll.
// The hidden state is added here, not in CSS, so everything is visible without JS.
const revealScript = `<script>
(function () {
  if (!('IntersectionObserver' in window)) return;
  var header = document.querySelector('.site-header');
  var sentinel = document.getElementById('top-sentinel');
  if (header && sentinel) {
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-top', entries[0].isIntersecting);
    }).observe(sentinel);
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var targets = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  targets.forEach(function (el) { el.classList.add('will-reveal'); });
  var io = new IntersectionObserver(function (entries) {
    entries.filter(function (e) { return e.isIntersecting; }).forEach(function (entry, i) {
      entry.target.style.transitionDelay = (i * 60) + 'ms';
      entry.target.classList.add('is-revealed');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  targets.forEach(function (el) { io.observe(el); });
})();
</script>`;

export function renderPage(site, { manifest = {} } = {}) {
  const m = site.meta ?? {};
  const p = site.person ?? {};
  const published = m.published === true;
  const ogImg = findImage(manifest, m.og_image);
  const baseUrl = String(m.site_url ?? '').replace(/\/$/, '');
  const ogImgUrl = ogImg ? `${baseUrl}/img/${ogImg.slug}-${ogImg.widths[ogImg.widths.length - 1]}.jpg` : '';
  // person.positioning is meta material only: description tags and the share
  // preview. It never renders in the visible page.
  const description = m.description ?? p.positioning ?? '';
  const shareDescription = p.positioning ?? m.description ?? '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(m.title ?? p.name ?? '')}</title>
<meta name="description" content="${esc(description)}">
${published ? `<link rel="canonical" href="${esc(baseUrl)}/">` : '<meta name="robots" content="noindex, nofollow">'}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(m.title ?? '')}">
<meta property="og:description" content="${esc(shareDescription)}">
<meta property="og:url" content="${esc(baseUrl)}/">
${ogImgUrl ? `<meta property="og:image" content="${esc(ogImgUrl)}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Lora:ital,wght@0,500;0,600;1,500&display=swap">
<link rel="stylesheet" href="styles/tokens.css">
<link rel="stylesheet" href="styles/page.css">
<link rel="stylesheet" href="styles/print.css" media="print">
</head>
<body id="top">
<div id="top-sentinel" aria-hidden="true"></div>
<a class="skip-link" href="#speaking">Skip to content</a>
${header(site)}
<main>
<div id="speaking">
${hero(site, manifest)}
${proof(site)}
${videoSection(site, manifest)}
${gallery(site, manifest)}
${highlights(site)}
${topics(site)}
${formats(site)}
${testimonials(site, manifest)}
${faq(site)}
${about(site, manifest)}
${pressKit(site, manifest)}
${pressMentions(site)}
</div>
${podcast(site)}
${contact(site)}
</main>
${footer(site)}
${copyScript}
${revealScript}
</body>
</html>
`;
}
