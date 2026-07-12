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
    'Famous Gear Revisit flavor smoke retired for v1.26.2',
    surface.includes('v1.26.2 Revisit surface: Trophy Echo only'),
    'active Revisit surface is Trophy Echo-only'
  );

  record(
    'Famous Gear Memory is not described as an active Revisit lane',
    !readme.includes('**Famous Gear Memory:** Live Revisit lane')
      && !notes.includes('Famous Gear Memory: live town archive lane'),
    'legacy Famous Gear source may remain, but active panel does not expose it'
  );

  record(
    'Trophy Echo copy is the active Revisit flavor target',
    surface.includes('Trophy Echo is the only active Revisit lane for v1.26.2.')
      && surface.includes('Trophy Echo is memory-only'),
    'Trophy Echo flavor and guardrail copy'
  );

  const passed = results.filter(result => result.ok).length;
  const failed = results.length - passed;
  console.log(`\nRevisit Famous Gear flavor retirement smoke: ${passed}/${results.length} passed`);
  if (failed) process.exitCode = 1;
}

main().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exitCode = 1;
});
