# PACKAGE_REVIEW_CHECKLIST.md

## Purpose

Use this checklist before adding, updating, replacing, or removing any package, dependency, external script, CDN asset, build tool, plugin, framework, or third-party library in DungeonDex.

DungeonDex is currently guarded as a mobile-first browser game with a strong preference for small, dependency-light, reviewable changes. A package should be added only when it clearly solves a real problem, is safer than a native/local solution, and does not create unnecessary security, maintenance, performance, or architecture risk.

Default position: do not add a dependency unless the benefit is specific and the risk is understood.

## Review Verdicts

Every package review should end with one verdict:

```text
APPROVE — safe to install/use for the stated purpose.
APPROVE WITH LIMITS — acceptable only with listed constraints.
INVESTIGATE MORE — not enough information yet.
AVOID — risk or complexity is too high.
REPLACE — use a safer existing/native alternative instead.
REMOVE — existing dependency should be removed if practical.
```

## Required First Step

Before reviewing any package or dependency change, read or confirm:

- `AGENTS.md`
- `VERSION.md`
- `DUNGEONDEX_CURRENT_NOTES.md`
- The issue, prompt, or work packet requesting the package review
- Current project architecture and whether DungeonDex currently needs build tooling
- Existing package files if present, such as `package.json`, lockfiles, or config files

Do not install anything during review unless the user explicitly asks for installation.

## Package Identity

Fill this out before making a recommendation:

```text
Package name:
Package type: [npm | CDN | browser script | build tool | framework | plugin | asset | other]
Requested action: [add | update | replace | remove | review only]
Requested by:
Intended purpose:
Target files/systems:
Runtime impact: [browser runtime | dev-only | test-only | build-only | unknown]
Network use: [yes/no/unknown]
Storage use: [yes/no/unknown]
Security-sensitive: [yes/no/unknown]
Review date:
```

## 1. Need Review

Start by asking whether the package is actually needed.

### Pass Criteria

- The problem is real and specific.
- The package solves a clearly defined need.
- The same result is not already available in the repo.
- The same result is not easily solved with small vanilla JavaScript, CSS, or existing tooling.
- The package does not expand the project direction unnecessarily.

### Red Flags

Mark `AVOID`, `REPLACE`, or `INVESTIGATE MORE` if:

- The package is being added because it is interesting, not necessary.
- The package solves a problem DungeonDex does not currently have.
- The package duplicates existing project code.
- The package requires a framework migration.
- The package encourages broad architecture changes.
- The package is only needed for a one-time task that could be done manually or with a small script.

## 2. DungeonDex Fit Review

Confirm the package fits DungeonDex's project direction.

### DungeonDex Preferences

- Mobile-first browser behavior.
- Small targeted patches.
- Minimal dependencies.
- Stable save compatibility.
- Clear script-load behavior.
- No unnecessary build-tool complexity.
- No external runtime services unless explicitly approved.
- No secrets or private keys in frontend code.

### Reject or Investigate More If The Package Requires

- Converting the app to a new framework.
- Changing classic script-load ordering.
- Adding a backend service.
- Adding user accounts/auth.
- Storing secrets in the frontend.
- Sending gameplay/save data to a third party.
- Large bundle growth for a small UI convenience.
- Runtime network access that is not essential.

## 3. Security Review

Treat packages as executable code from another maintainer.

### Security Questions

- Does the package run install scripts, postinstall scripts, preinstall scripts, or prepare scripts?
- Does it access the file system?
- Does it access the network?
- Does it access browser storage such as `localStorage`, `sessionStorage`, IndexedDB, cookies, or caches?
- Does it handle auth, wallets, crypto, payments, API keys, tokens, or secrets?
- Does it modify HTML, inject scripts, or parse untrusted input?
- Does it require broad permissions?
- Does it add transitive dependencies that are hard to audit?
- Does it have known vulnerabilities from `npm audit`, Dependabot, GitHub security alerts, OSV, or similar sources?

### Automatic Rejection Conditions

Reject or request deeper review if the package:

- Requires secrets in frontend code.
- Handles private keys, wallet signing, or financial credentials.
- Sends save data or player data to third-party services without explicit approval.
- Runs install scripts without a clear reason.
- Obfuscates code or bundles hidden behavior.
- Has unresolved critical security vulnerabilities.
- Is abandoned and security-sensitive.
- Adds spyware, telemetry, analytics, tracking, or ads without explicit approval.

## 4. Maintenance Review

A package should be maintained enough that it will not become future cleanup debt.

### Review Questions

- Is the package actively maintained?
- Are recent releases reasonable and stable?
- Are issues and pull requests handled?
- Is documentation clear?
- Is the license compatible with the project?
- Is the API stable?
- Is the package widely used enough to trust?
- Is it a small utility or a large ecosystem commitment?
- Does it have many transitive dependencies?
- Does the package create lock-in?

### Red Flags

- No recent maintenance.
- Many unresolved security issues.
- Poor documentation.
- Unclear license.
- Large dependency tree for a small feature.
- Package author or ownership changed recently without clarity.
- Package is deprecated or points to a replacement.

## 5. Performance / Bundle Review

DungeonDex is mobile-first. Any package that affects runtime must be judged against mobile performance.

### Runtime Package Questions

- How much code does it add?
- Does it block load time?
- Does it require extra CSS, fonts, assets, workers, or network calls?
- Does it run continuously in the background?
- Does it affect battery, memory, or low-end mobile performance?
- Does it slow down save/load, combat, rendering, or panel updates?
- Does it require polyfills?

### Dev-Only Package Questions

- Does it affect production output?
- Does it change build commands?
- Does it require new onboarding steps?
- Does it create lockfile churn?
- Does it fit the current repo structure?

## 6. Save / Gameplay Risk Review

A package must not accidentally change core game behavior.

Confirm it does not alter:

- Save schema.
- Save migration.
- Save/load reliability.
- Local storage behavior.
- Dungeon entry flow.
- Combat math.
- Monster scaling.
- HP, damage, XP, gold, drop, or reward economy.
- Talent earning, spending, learned-state, or passive activation behavior.
- Revisit locked/planning-only behavior.
- Debt, gear, contract, trophy, Famous Gear, or Elite Board behavior.

If any of these are affected, the package review becomes a high-risk architecture review.

## 7. Native / Existing Alternative Review

Before approving a package, list safer alternatives.

### Possible Alternatives

- Vanilla JavaScript helper.
- Existing repo helper.
- CSS-only solution.
- Browser-native API.
- Small local script.
- GitHub Action or local dev script instead of runtime package.
- Manual process if the task is rare.
- Documentation/checklist instead of automation.

### Approval Standard

Approve the package only if it is clearly better than the safer alternative for this repo.

## 8. Install / Update Review

Use this section only if installation or update is explicitly requested.

### Before Install

Confirm:

- The user explicitly approved installation/update.
- The package name is exact.
- The desired version or version range is clear.
- The install target is clear: dependency, devDependency, peerDependency, CDN, or local asset.
- The expected changed files are clear.
- The rollback plan is clear.

### After Install

Report:

- Exact command run.
- Files changed.
- Package version installed.
- Lockfile changes.
- Audit output.
- Warnings.
- Any install scripts that ran.
- Any new commands added.
- Any behavior changed.

## 9. Update Review

Package updates can be riskier than new installs because they may silently change behavior.

Before updating, check:

- Current version.
- Target version.
- Major/minor/patch difference.
- Changelog or release notes.
- Breaking changes.
- Security fixes.
- Deprecated APIs.
- Required code changes.
- Lockfile impact.
- Test/smoke impact.

Prefer patch updates over major updates unless there is a clear reason.

## 10. Removal Review

Use this when removing a dependency.

Confirm:

- The package is unused or replaceable.
- Imports/references are removed.
- Commands/scripts depending on it are updated.
- Documentation is updated if needed.
- Lockfile/package files are consistent.
- Smoke checks still pass.

Removal should reduce complexity without breaking the project.

## 11. Required Review Report

Use this exact structure:

```text
Package review verdict:
- [APPROVE | APPROVE WITH LIMITS | INVESTIGATE MORE | AVOID | REPLACE | REMOVE]

Package identity:
- Name:
- Type:
- Requested action:
- Runtime impact:
- Security-sensitive:

Need:
- [why it is or is not needed]

DungeonDex fit:
- [fit notes]

Security notes:
- [security risks or none found]

Maintenance notes:
- [maintenance/license/docs notes]

Performance notes:
- [mobile/bundle/runtime notes]

Alternatives:
- [native/existing/local alternatives]

Expected changed files:
- [files likely to change]

Checks required before commit:
- [commands/checks]

Risks:
- [risk notes]

Recommendation:
- [exact next step]
```

## 12. Fast Package Review Checklist

Use this for quick decisions.

```text
[ ] Specific need is clear
[ ] Native/local alternative considered
[ ] Fits DungeonDex mobile-first browser direction
[ ] Does not require framework migration
[ ] Does not require backend/auth/secrets
[ ] Does not touch save data without explicit approval
[ ] Does not affect combat/economy/rewards unless explicitly approved
[ ] Does not activate Revisit or passive gameplay behavior
[ ] Package is maintained
[ ] License is acceptable or needs review
[ ] Dependency tree is reasonable
[ ] No critical known vulnerabilities
[ ] No suspicious install scripts
[ ] Runtime size/performance is acceptable
[ ] Install/update was explicitly approved if applicable
[ ] Rollback path is clear
```

## 13. Common Verdict Examples

### APPROVE

```text
APPROVE — dev-only markdown lint tool, no runtime impact, maintained, low dependency risk, install explicitly requested.
```

### APPROVE WITH LIMITS

```text
APPROVE WITH LIMITS — okay for local dev scripts only. Do not import into browser runtime and do not add production bundle dependency.
```

### INVESTIGATE MORE

```text
INVESTIGATE MORE — package appears useful, but install scripts and transitive dependencies need review before approval.
```

### AVOID

```text
AVOID — package requires runtime network access and adds third-party data flow that DungeonDex does not currently need.
```

### REPLACE

```text
REPLACE — use a small vanilla JavaScript helper instead of adding a dependency for one formatting function.
```

### REMOVE

```text
REMOVE — dependency appears unused and creates lockfile/security maintenance burden.
```

## 14. Automatic Rejection Conditions

Reject the package or dependency change if it:

- Requires API keys, private keys, wallet signing, or secrets in frontend code.
- Sends player save data to a third party without explicit approval.
- Adds analytics, tracking, ads, telemetry, or monitoring without explicit approval.
- Requires a framework migration not requested by the user.
- Requires backend/auth infrastructure not requested by the user.
- Changes save schema without explicit approval.
- Changes combat, economy, rewards, or monster scaling without explicit approval.
- Activates Revisit without explicit approval.
- Activates passive gameplay effects without explicit approval.
- Has known critical vulnerabilities without a mitigation plan.
- Is abandoned and security-sensitive.
- Runs suspicious install scripts.

## Review Principle

Do not ask, "Is this package popular?"

Ask:

```text
Does DungeonDex need this package badly enough to accept its security, maintenance, performance, and workflow cost?
```

If the answer is not clearly yes, do not add it.
