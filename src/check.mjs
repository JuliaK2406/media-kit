// Guard against invented content: lists every field in content/site.yaml that
// still contains TODO. While meta.published is false this is informational.
// Once meta.published is true, any remaining TODO fails the build.

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { load } from 'js-yaml';

export async function loadSite(file = new URL('../content/site.yaml', import.meta.url)) {
  return load(await readFile(file, 'utf8'));
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
  const site = await loadSite(process.argv[2] ?? undefined);
  const todos = reportTodos(site);
  assertPublishable(site, todos);
}
