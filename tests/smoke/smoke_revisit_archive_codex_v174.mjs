#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ` - ${detail}` : ''}`);
}

async function main() {
  const [surface, readme, notes] = await Promise.all([
    readFile(path.join(ROOT, 'js/systems/44_revisit_lowfire_board_slot.js'), 'utf8'),
    readFile(path.join(ROOT, 'README.md'), 'utf8'),
    readFile(path.join(ROOT, 'docs/status/CURRENT_NOTES.md'), 'utf8')
  ]);

  record(
    'Archive Codex Revisit smoke retired for v1.26.4.06',
    surface.includes('v1.26.4.06 Revisit surface: Trophy Echo only'),
    'active Revisit surface is Trophy Echo-only'
  );

  record(
    'No Archive Codex requirement blocks compact smoke',
    !readme.includes('Revisit Archive Codex is required for v1.26.4.06')
      && !notes.includes('Revisit Archive Codex is required for v1.26.4.06'),
    'Archive Codex is not part of the active Trophy Echo-only release gate'
  );

  record(
    'Trophy Echo remains the active Revisit release target',
    readme.includes('Trophy Echo') && notes.includes('Trophy Echo'),
    'README.md and CURRENT_NOTES.md'
  );

  const passed = results.filter(result => result.ok).length;
  const failed = results.length - passed;
  console.log(`\nRevisit Archive Codex retirement smoke: ${passed}/${results.length} passed`);
  if (failed) process.exitCode = 1;
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exitCode = 1;
});
