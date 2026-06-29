# PATCH_REVIEW_CHECKLIST.md

## Purpose

Use this checklist after Codex, Claude, ChatGPT, or any repo agent produces a patch for DungeonDex.

The goal is to decide whether the patch is safe to commit, needs revision, or should be rejected. This checklist is intentionally strict because DungeonDex relies on small, versioned, guardrail-heavy patches.

A patch should not be committed just because it appears to work. It should be committed only when the scope, changed files, behavior, checks, and risks are understood.

## Review Verdicts

Every patch review should end with one of these verdicts:

```text
APPROVE — safe to commit as-is.
APPROVE WITH NOTES — safe to commit, but include follow-up notes.
REQUEST CHANGES — do not commit until specific fixes are made.
REJECT — patch violates scope, guardrails, or project direction.
REVIEW ONLY — no commit requested or no file changes were made.
```

## Required First Step

Before reviewing a patch, read or confirm:

- `AGENTS.md`
- `VERSION.md`
- `DUNGEONDEX_CURRENT_NOTES.md`
- The issue, prompt, or work packet that authorized the patch
- The changed-file list
- The diff or complete modified sections
- Any reported smoke-test output

If the patch does not include a clear goal, changed-file list, and test/check report, mark it `REQUEST CHANGES` unless it is explicitly review-only.

## Patch Identity

Fill this out before reviewing:

```text
Patch title:
Repo:
Branch:
Issue / packet:
Patch type:
Expected version change:
Commit requested: yes/no
Reviewer:
Review date:
```

## 1. Scope Review

Confirm the patch has one narrow purpose.

### Pass Criteria

- The goal is clear in one sentence.
- The patch matches the requested issue or packet.
- The changed files are expected for the patch type.
- No unrelated cleanup, formatting, renaming, or architecture work was included.
- No opportunistic feature work was added.

### Red Flags

Mark `REQUEST CHANGES` or `REJECT` if the patch:

- Mixes multiple unrelated fixes.
- Rewrites large sections without authorization.
- Refactors files that were not part of the task.
- Changes behavior while claiming to be docs-only or smoke-only.
- Edits generated, dependency, or build files without a clear reason.
- Touches service worker/cache/version labels without release-label scope.

## 2. Patch Type Review

Classify the patch before judging it.

```text
Docs-only
Smoke-only
Contract/helper
Activation
Release-label/cache-label
Bugfix
Review-only
```

### Docs-only Requirements

- Only documentation or markdown files changed.
- No runtime JavaScript, CSS, save, service worker, or manifest edits.
- No version bump unless explicitly requested.
- Wording is accurate and does not imply inactive systems are playable.

### Smoke-only Requirements

- Smoke/test files changed only.
- Runtime behavior did not change.
- The smoke test protects a specific expected behavior.
- The test does not encode incorrect assumptions about locked systems.

### Contract/helper Requirements

- Helper logic is explicit and easy to inspect.
- Helper is read-only or non-mutating unless mutation was requested.
- Helper is not wired into live gameplay unless activation was requested.
- Smoke or contract checks exist when behavior needs to remain locked.

### Activation Requirements

- Activation was explicitly requested.
- Activated behavior is named clearly.
- Locked systems are still locked.
- Smoke coverage was added or updated.
- Risks and rollback notes are included.

### Release-label / Cache-label Requirements

- `VERSION.md` was checked first.
- Version strings were searched in all required files from `AGENTS.md`.
- Public, runtime, and cache labels match the requested version.
- No gameplay behavior changed.

### Bugfix Requirements

- Bug is described clearly.
- Cause is identified or reasonably isolated.
- Fix is minimal.
- No unrelated behavior changed.
- Existing save data remains compatible.
- Regression checks are included or skipped with a reason.

## 3. DungeonDex Guardrail Review

Confirm these systems were not changed unless the issue explicitly authorized them.

### Core Gameplay Locks

- `Enter Dungeon` / `Continue Run` remains the only active dungeon entry path.
- No new dungeon entry mode was added.
- No combat math changed.
- No monster scaling changed.
- No HP, damage, XP, gold, drop, or reward economy changed.
- No monster affixes, hidden statuses, or new combat complexity added.

### Save Compatibility

- No save schema changed unless explicitly authorized.
- No save migration changed unless explicitly authorized.
- Existing save fields are not renamed or removed.
- New state, if added, has safe defaults.
- Reload behavior is considered when persistent state changes.

### Revisit Locks

- Revisit remains locked, read-only, and planning-only.
- No Revisit start, entry, claim, complete, unlock, reward, progression, currency, or farming behavior was added.
- Revisit helpers were not re-exported unless explicitly requested.
- Trophy Echo, Famous Gear Memory, and Rival Trace naming remains consistent.

### Talent Locks

- Existing Talent foundation is preserved.
- Talent earning rates did not change unless requested.
- Talent spending costs did not change unless requested.
- Learned-state behavior did not change unless requested.
- No new Talent branches or currencies were added unless requested.
- Passive effects remain copy-only/read-only unless activation was explicitly requested.
- Hunter Board Clarity remains copy-only unless explicitly changed.
- Debt Collector clarity did not set `liveRendererWired: true` unless explicitly unlocked.

### Economy / Debt / Gear / Elite Board

- Debt behavior remains unchanged unless targeted.
- Gear behavior remains unchanged unless targeted.
- Elite Board behavior remains unchanged unless targeted.
- Contract behavior remains unchanged unless targeted.
- Trophy/Famous Gear behavior remains unchanged unless targeted.

## 4. File-Level Review

For each changed file, answer:

```text
File:
Expected for this patch: yes/no
What changed:
Runtime behavior changed: yes/no
Risk level: low/medium/high
Needs follow-up: yes/no
```

### File Review Questions

- Is this file allowed by the packet?
- Does the change match the task?
- Are there unrelated formatting changes?
- Are old comments now inaccurate?
- Are any duplicate helpers/functions introduced?
- Are references still valid?
- Are public labels, button text, and UI claims truthful?
- Are exported names still intentional?

## 5. Diff Review

Inspect the actual diff, not just the agent summary.

### Required Checks

- No hidden broad refactor.
- No unrelated deletion.
- No accidental behavior change.
- No dead button or dead UI label.
- No duplicate function name.
- No broken reference.
- No dependency or lockfile noise.
- No secrets, keys, tokens, or private data.
- No service worker/cache edits unless expected.
- No version-label edits unless expected.

### Dangerous Diff Patterns

Treat these as high-risk:

- Large replacement of a working function.
- Broad search-and-replace across runtime files.
- New state fields without save/reload review.
- UI button added without handler.
- Handler added without visible UI state.
- Helper added and silently wired into live renderer.
- Test altered to fit broken behavior instead of protecting correct behavior.
- Version labels changed in only some places.
- `liveRendererWired` changed from `false` to `true` without explicit activation.

## 6. Test / Smoke Review

A patch report must say what was run and what was not run.

### Acceptable Check Report

```text
Checks run:
- npm run smoke:talent — passed
- Manual grep for liveRendererWired — Debt Collector remains false

Checks not run:
- Full browser manual test — not run because this was smoke-only and no runtime behavior changed
```

### Unacceptable Check Report

```text
Looks good.
Should work.
No issues found.
Tests probably pass.
```

### Review Questions

- Were the right checks run for the patch type?
- Were skipped checks explained?
- Does smoke coverage protect the behavior that matters?
- Did the patch change tests without changing runtime behavior, or vice versa?
- If checks failed, did the agent stop and explain?

## 7. Version / Release Review

Use this section only when version labels, release notes, cache labels, public package labels, or release documentation changed.

Confirm:

- `VERSION.md` was checked first.
- Current version and target version are clear.
- All required version strings were searched.
- `index.html`, `app.js`, `styles.css`, `manifest.json`, `sw.js`, `patch-log.md`, release notes, smoke-test notes, and current notes were considered if relevant.
- Public label is short and player-facing.
- Cache/service-worker labels match the intended release.
- No old version string remains accidentally.

If version authority was not followed, mark `REQUEST CHANGES`.

## 8. Documentation Review

For docs and notes changes, confirm:

- The wording is accurate.
- The wording is not overpromising future systems.
- The wording distinguishes planned, preview, read-only, copy-only, and active behavior.
- The docs match the actual repo behavior.
- The docs do not say a smoke check passed unless it actually passed.
- The docs do not imply Revisit or passive gameplay effects are active unless they are explicitly active.

## 9. Commit Readiness

A patch is commit-ready only when all are true:

- Scope is narrow.
- Changed files are expected.
- Runtime behavior is understood.
- Locked systems remain locked.
- Version authority is respected.
- Tests/checks were run or skipped with clear reasons.
- Risks are low or documented.
- Commit message is specific.
- Final report is complete.

## 10. Commit Message Review

Good examples:

```text
docs: add patch review checklist
smoke: lock Debt Collector clarity renderer state
fix: preserve Talent learned state after reload
docs: tighten DungeonDex agent workflow rules
```

Avoid:

```text
updates
fixes
more changes
misc
work
```

Commit message format:

```text
[type]: [specific change]
```

Useful types:

```text
docs
smoke
fix
feat
refactor
chore
```

Only use `feat` when actual player-facing functionality is intentionally added.

## 11. Final Review Report Template

Use this after reviewing a patch:

```text
Review verdict:
- [APPROVE | APPROVE WITH NOTES | REQUEST CHANGES | REJECT | REVIEW ONLY]

Patch classification:
- [classification]

Scope:
- [pass/fail notes]

Files reviewed:
- [file] — [notes]

Behavior changed:
- [runtime behavior changes or None]

Behavior intentionally not changed:
- [locked systems preserved]

Checks reviewed:
- [checks run and results]

Checks missing:
- [missing checks or None]

Risks:
- [risk notes]

Required changes before commit:
- [required changes or None]

Suggested commit message:
- [message]

Suggested next issue:
- [next issue or None]
```

## 12. Fast Review Checklist

Use this when the patch is very small.

```text
[ ] Matches the issue/packet
[ ] Correct patch type
[ ] Changed files are expected
[ ] No unrelated refactor
[ ] No version bump unless requested
[ ] No service worker/cache change unless requested
[ ] No dependency added
[ ] No save compatibility risk
[ ] No combat/economy/reward change unless requested
[ ] Revisit remains locked
[ ] Talent expansion remains locked unless requested
[ ] Debt Collector clarity did not become live-renderer active unless requested
[ ] Smoke/check report is specific
[ ] Skipped checks are explained
[ ] Commit message is specific
[ ] Final report is complete
```

## 13. Automatic Rejection Conditions

Reject or request a rewrite if the patch:

- Changes gameplay while claiming to be docs-only or smoke-only.
- Adds dependencies without explicit approval.
- Changes save schema without explicit approval.
- Activates Revisit without explicit approval.
- Activates passive gameplay effects without explicit approval.
- Sets Debt Collector clarity `liveRendererWired: true` without explicit approval.
- Changes combat, economy, rewards, or monster scaling without explicit approval.
- Performs a broad refactor without explicit approval.
- Hides failed or skipped checks.
- Claims tests passed without evidence.
- Includes secrets, tokens, or private data.

## Review Principle

Do not ask, "Did the patch work?"

Ask:

```text
Did the patch do only the requested thing, prove it safely, and preserve every locked system?
```

If the answer is not clearly yes, do not commit yet.
