// Guard against invented content. Two categories live in content/site.yaml:
//   TODO        - the text does not exist yet. Shown as a yellow tag on the page,
//                 blocks the build once meta.published is true.
//   # confirm   - a draft we wrote that Julia has not approved yet. Marked with
//                 an inline "# confirm" comment on the value line. Renders as
//                 normal text, never blocks the build, listed separately here.
// The marker lives on the value line itself, so it cannot go stale: delete the
// comment and the entry disappears from the list.

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { load } from 'js-yaml';

export const SITE_FILE = new URL('../content/site.yaml', import.meta.url);

export async function loadSite(file = SITE_FILE) {
  return load(await readFile(file, 'utf8'));
}

export async function loadSiteRaw(file = SITE_FILE) {
  return readFile(file, 'utf8');
}

function walk(node, prefix, visit) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${prefix}[${i}]`, visit));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walk(v, prefix ? `${prefix}.${k}` : k, visit);
  } else {
    visit(prefix, node);
  }
}

export function findTodos(site) {
  const todos = [];
  walk(site, '', (p, v) => {
    if (typeof v === 'string' && v.includes('TODO')) todos.push(p);
  });
  return todos;
}

export function findEmptyLists(site) {
  const empty = [];
  const rec = (node, prefix) => {
    if (Array.isArray(node)) {
      if (node.length === 0) empty.push(prefix);
      else node.forEach((v, i) => rec(v, `${prefix}[${i}]`));
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) rec(v, prefix ? `${prefix}.${k}` : k);
    }
  };
  rec(site, '');
  return empty;
}

// Finds every value line marked with an inline "# confirm" comment and works
// out its path by tracking yaml indentation. The file is our own regular
// two-space yaml, so the tracker stays deliberately simple; every found path
// is verified against the parsed data, and unresolvable markers are reported
// loudly instead of being dropped.
export function findConfirms(raw, site) {
  const confirms = [];
  const problems = [];
  const stack = []; // { indent, seg }
  const counters = new Map(); // parent path -> next list index
  let blockSkipIndent = -1; // inside a | or > block scalar when >= 0

  const pathOf = () => stack.map((f) => f.seg).join('.').replace(/\.\[/g, '[');
  const resolve = (p) => {
    let node = site;
    for (const part of p.split(/[.[\]]+/).filter(Boolean)) {
      if (node == null) return undefined;
      node = node[/^\d+$/.test(part) ? Number(part) : part];
    }
    return node;
  };

  const lines = raw.split('\n');
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    if (!line.trim()) continue;
    let indent = line.match(/^ */)[0].length;
    if (blockSkipIndent >= 0) {
      if (indent > blockSkipIndent) continue;
      blockSkipIndent = -1;
    }
    let rest = line.slice(indent);
    if (rest.startsWith('#')) continue;

    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();

    if (rest.startsWith('- ')) {
      const parent = pathOf();
      const idx = counters.get(parent) ?? 0;
      counters.set(parent, idx + 1);
      stack.push({ indent, seg: `[${idx}]` });
      rest = rest.slice(2);
      indent += 2;
    }

    const marker = /#\s*confirm\b(?::?\s*(.*))?$/.exec(rest);
    const keyMatch = /^([A-Za-z_][\w-]*):(.*)$/.exec(rest);
    if (keyMatch) {
      const [, key, valuePart] = keyMatch;
      counters.delete(`${pathOf()}${stack.length ? '.' : ''}${key}`);
      stack.push({ indent, seg: key });
      // an anchor (&name) may precede a block scalar marker
      const value = valuePart.trim().replace(/^&\S+\s*/, '');
      if (value === '|' || value === '>' || value.startsWith('|') || value.startsWith('>')) {
        blockSkipIndent = indent;
      }
      if (marker) {
        const p = pathOf();
        const resolved = resolve(p);
        if (resolved === undefined) problems.push(`line ${n + 1}: confirm marker did not resolve to a value (${p})`);
        else confirms.push({ path: p, value: resolved, note: (marker[1] ?? '').trim() });
      }
    } else if (marker) {
      // scalar list item with a marker
      const p = pathOf();
      const resolved = resolve(p);
      if (resolved === undefined) problems.push(`line ${n + 1}: confirm marker did not resolve to a value (${p})`);
      else confirms.push({ path: p, value: resolved, note: (marker[1] ?? '').trim() });
    }
  }
  return { confirms, problems };
}

export function reportConfirms(raw, site) {
  const { confirms, problems } = findConfirms(raw, site);
  console.log(`Ждёт подтверждения (# confirm): ${confirms.length}`);
  for (const c of confirms) {
    const value = typeof c.value === 'string' ? `"${c.value}"` : JSON.stringify(c.value);
    console.log(`  ${c.path} = ${value}${c.note ? `  <- ${c.note}` : ''}`);
  }
  for (const p of problems) console.error(`  WARNING ${p}`);
  return confirms;
}

export function reportTodos(site) {
  const todos = findTodos(site);
  console.log(`TODO fields: ${todos.length}`);
  for (const p of todos) console.log(`  ${p}`);
  const empty = findEmptyLists(site);
  if (empty.length) {
    console.log(`Empty lists (their blocks stay hidden until filled): ${empty.length}`);
    for (const p of empty) console.log(`  ${p}`);
  }
  return todos;
}

export function assertPublishable(site, todos) {
  if (site?.meta?.published === true && todos.length > 0) {
    console.error(`\nmeta.published is true but ${todos.length} TODO field(s) remain. Refusing to build.`);
    process.exit(1);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const file = process.argv[2] ?? undefined;
  const site = await loadSite(file);
  const raw = await loadSiteRaw(file);
  const todos = reportTodos(site);
  reportConfirms(raw, site);
  assertPublishable(site, todos);
}
