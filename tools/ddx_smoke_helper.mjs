#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = process.cwd();
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  'build',
  'coverage',
  'dist',
  'node_modules'
]);

function toRepoPath(fullPath) {
  return path.relative(REPO_ROOT, fullPath).replaceAll('\\', '/');
}

function walkFiles(startDir, includeFile) {
  const found = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) walk(fullPath);
        continue;
      }
      if (entry.isFile() && includeFile(entry.name)) found.push(fullPath);
    }
  }

  walk(startDir);
  return found.sort((left, right) => toRepoPath(left).localeCompare(toRepoPath(right)));
}

function runCommand(command, args = []) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: false
  });
  return {
    ok: result.status === 0,
    stderr: result.stderr?.trim() || '',
    stdout: result.stdout?.trim() || ''
  };
}

function readVersion() {
  const versionPath = path.join(REPO_ROOT, 'VERSION.md');
  if (!fs.existsSync(versionPath)) return 'VERSION.md not found';
  const text = fs.readFileSync(versionPath, 'utf8');
  const match = text.match(/^## Current Public\/Live Version\s*\r?\n([^\r\n]+)/m);
  return match?.[1]?.trim() || 'Current public version not found';
}

function getGitInfo() {
  const branch = runCommand('git', ['branch', '--show-current']);
  const status = runCommand('git', ['status', '--short']);
  return {
    branch: branch.ok && branch.stdout ? branch.stdout : 'unknown',
    clean: status.ok && status.stdout.length === 0
  };
}

function findSmokeTests() {
  return walkFiles(REPO_ROOT, name => name.startsWith('smoke_') && name.endsWith('.mjs'));
}

function printHeader() {
  const git = getGitInfo();
  console.log('DungeonDex Smoke Helper');
  console.log(`Version: ${readVersion()}`);
  console.log(`Branch: ${git.branch}`);
  console.log(`Working tree: ${git.clean ? 'clean' : 'has changes'}`);
}

function runSyntaxGate() {
  const files = walkFiles(REPO_ROOT, name => /\.(?:js|mjs)$/i.test(name));
  const failures = [];

  for (const fullPath of files) {
    const result = runCommand(process.execPath, ['--check', fullPath]);
    if (!result.ok) {
      failures.push({ path: toRepoPath(fullPath), output: result.stderr || result.stdout || 'Node syntax check failed.' });
    }
  }

  if (failures.length) {
    console.error(`FAIL: JavaScript syntax failed in ${failures.length}/${files.length} files.`);
    failures.forEach(failure => {
      console.error(`- ${failure.path}`);
      console.error(failure.output);
    });
    process.exitCode = 1;
    return;
  }

  console.log(`PASS: JavaScript syntax clean for ${files.length} files.`);
}

function printSmokeTests() {
  const smokeTests = findSmokeTests();
  console.log(`Smoke tests: ${smokeTests.length}`);
  smokeTests.forEach(fullPath => console.log(`- ${toRepoPath(fullPath)}`));
}

function printUsage() {
  console.log('Usage: node tools/ddx_smoke_helper.mjs [--syntax|--list]');
}

const args = new Set(process.argv.slice(2));
if (args.has('--help') || args.has('-h')) {
  printUsage();
} else {
  printHeader();
  if (args.has('--syntax')) runSyntaxGate();
  else printSmokeTests();
}
