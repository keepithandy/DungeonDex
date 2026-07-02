import fs from "fs";
import path from "path";
import process from "process";
import { spawnSync } from "child_process";
import readline from "readline/promises";

const repoRoot =process.cwd();

const ignoredDirs = new Set([
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage"
]);

function toRepoPath(fullPath) {
  return path.relative(repoRoot, fullPath).replaceAll("\\", "/");
}

function runCommand(command, args =[]) {
    const result = spawnSync(command, args, {
        cwd: repoRoot,
        encoding: "utf-8",
        shell: false
    });

    return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout?.trim() || "",
    stderr: result.stderr?.trim() || ""
  };
}

function readVersion() {
  const versionPath = path.join(repoRoot, "VERSION.md");

  if (!fs.existsSync(versionPath)) {
    return "VERSION.md not found";
  }
  
  const text = fs.readFileSync(versionPath, "utf8");
  const firstUsefulLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return firstUsefulLine || "VERSION.md is empty";
}

function getGitinfo() {
    const branch = runCommand("git", ["branch", "--show-current"]);
    const status = runCommand("git", ["status", "--short"]);
    return {
        branch: branch.ok && branch.stdout ? branch.stdout : "unknown",
        clean: status.ok && status.stdout.length === 0,
        statusText: status.ok ? status.stdout : "git status unavailable"
    };
}

function findsSmokeTest (startDir = repoRoot) {
    const found = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          walk(fullPath);
        }
        continue;
      }
      if (
        entry.isFile() &&
        entry.name.startsWith("smoke_") &&
        entry.name.endsWith(".mjs")
      ) {
        found.push({
          name: entry.name,
          fullPath,
          repoPath: toRepoPath(fullPath)
        });
      }
    }
  }

  walk(startDir);

  return found.sort((a, b) => a.repoPath.localeCompare(b.repoPath));
}

function printHeader(smokeTests) {
    const version = readVersion();
    const git = getGitinfo();

    console.log("");
    console.log("DungeonDex Smoke Helper");
    console.log("=======================");
    console.log(`Version: ${version}`);
    console.log(`Branch: ${git.branch}`);
    console.log(`Working tree: ${git.clean ? "clean" : "has changes"}`);
  