# RELEASE_REPORT_TEMPLATE.md

## Purpose

Use this template after finishing a DungeonDex patch, especially after Codex or another repo agent makes changes.

The goal is to produce a clean, consistent, professional report that explains what changed, what did not change, what was checked, what was skipped, and what should happen next.

This report is useful for:

- GitHub issue comments
- ChatGPT/Codex handoff notes
- Commit summaries
- Release notes drafting
- Daily project notes
- Future audit trails

A good release report should be specific enough that the next session can understand the patch without re-reading the whole diff.

## When To Use This Template

Use this template after any of these:

- Docs-only patch
- Smoke-only patch
- Contract/helper patch
- Activation patch
- Bugfix
- Release-label/cache-label update
- README / CHANGELOG / VERSION update
- Agent workflow/documentation update

For very small patches, use the short report near the bottom of this file.

## Report Rules

- Do not claim tests passed unless they were actually run.
- Do not hide skipped checks.
- Do not claim runtime behavior changed unless it actually changed.
- Do not say a system is active if it is only planned, read-only, preview-only, or copy-only.
- Be explicit about locked systems that stayed locked.
- Mention the exact commit SHA after committing.
- Mention the branch.
- Mention whether the patch is already pushed.
- Keep the report factual and audit-friendly.

## Full Release Report Template

```text
# DungeonDex Patch Report

## Summary

- [One to three bullets summarizing the patch.]
- [Mention whether this was docs-only, smoke-only, contract/helper, activation, bugfix, or release-label/cache-label.]
- [Mention whether the patch was committed and pushed.]

## Repository State

- Repo: keepithandy/DungeonDex
- Branch: main
- Commit: [commit SHA or "not committed"]
- Commit message: [message or "not committed"]
- Pushed to origin/main: [yes/no/not checked]
- Working tree clean: [yes/no/not checked]

## Patch Classification

- Type: [docs-only | smoke-only | contract/helper | activation | release-label/cache-label | bugfix | review-only]
- Reason: [why this classification fits]

## Goal

[State the patch goal in one sentence.]

## Files Changed

- `[path]` — [specific change]
- `[path]` — [specific change]
- `[path]` — [specific change]

## What Changed

- [Specific change]
- [Specific change]
- [Specific change]

## Behavior Changed

- [Runtime behavior change, or "None"]

## Behavior Intentionally Not Changed

- [Locked system preserved]
- [Locked system preserved]
- [Locked system preserved]

Common DungeonDex examples:
- No combat math changed.
- No monster scaling changed.
- No HP, damage, XP, gold, drops, or reward economy changed.
- No save schema changed.
- No dungeon entry flow changed.
- Revisit remains locked/read-only/planning-only.
- Talent expansion remains locked unless explicitly requested.
- Passive gameplay effects remain copy-only/read-only unless explicitly activated.
- Debt Collector clarity did not become live-renderer active unless explicitly requested.
- No service worker/cache labels changed.
- No public version labels changed.
- No dependencies added.

## Checks Run

- [command or verification] — [result]
- [command or verification] — [result]
- [command or verification] — [result]

Examples:
- `npm run smoke:talent` — passed
- Read back changed markdown from `main` — passed
- Verified no runtime files changed — passed
- Verified `liveRendererWired` remains false for Debt Collector clarity — passed

## Checks Not Run

- [check] — [reason]
- [check] — [reason]

Examples:
- Full browser manual test — not run because this was docs-only.
- Full smoke suite — not run because this patch only changed documentation.

## Version / Release Notes

- Version changed: [yes/no]
- Previous version: [version or not applicable]
- New version: [version or not applicable]
- Version authority checked: [yes/no/not applicable]
- Public/runtime/cache labels changed: [yes/no]
- Release notes updated: [yes/no/not applicable]
- CHANGELOG updated: [yes/no/not applicable]
- README updated: [yes/no/not applicable]

## Risk Review

- Risk level: [low/medium/high]
- Main risk: [risk or "None identified"]
- Rollback path: [how to revert if needed]

Examples:
- Risk level: Low
- Main risk: Documentation may need future refinement as workflow changes.
- Rollback path: Revert commit [SHA].

## Follow-Up Recommendations

- [Next issue or cleanup]
- [Next issue or cleanup]
- [Next issue or cleanup]

If none:
- None.

## Suggested Next Issue

Title:
[Issue title]

Goal:
[One sentence]

Scope:
- [file/system]
- [file/system]

Guardrails:
- [guardrail]
- [guardrail]

Acceptance Checks:
- [check]
- [check]
```

## Short Release Report Template

Use this for small docs-only or smoke-only commits.

```text
Summary:
- [brief summary]

Commit:
- [SHA]
- [message]

Files changed:
- `[path]` — [change]

Behavior changed:
- [None or specific runtime change]

Behavior intentionally not changed:
- [locked systems preserved]

Checks run:
- [check] — [result]

Checks not run:
- [check] — [reason]

Risks:
- [risk level and note]

Suggested next issue:
- [next issue or None]
```

## Docs-Only Report Example

```text
Summary:
- Added a reusable package review checklist for DungeonDex dependency decisions.
- This was a docs-only workflow patch.
- Committed on main and pushed.

Commit:
- f90b21f8a75fade20c50c32c824cdbc5aacc0c77
- docs: add package review checklist

Files changed:
- `PACKAGE_REVIEW_CHECKLIST.md` — added dependency/package review rules, verdicts, risk categories, and report template.

Behavior changed:
- None.

Behavior intentionally not changed:
- No runtime JavaScript/CSS changed.
- No gameplay behavior changed.
- No save schema changed.
- No Revisit, Talent, combat, economy, service worker, version-label, or dependency changes.

Checks run:
- Confirmed file did not already exist — passed.
- Created file on main — passed.
- Read back file from main — passed.
- Confirmed commit metadata — passed.

Checks not run:
- Smoke tests — not run because this was docs-only.

Risks:
- Low. Documentation-only workflow addition.

Suggested next issue:
- Add release report template for consistent post-patch summaries.
```

## Smoke-Only Report Example

```text
Summary:
- Added smoke coverage for [behavior].
- This was a smoke-only guardrail patch.
- Runtime behavior was not changed.

Commit:
- [SHA]
- [message]

Files changed:
- `[smoke file]` — added/updated smoke coverage for [behavior].

Behavior changed:
- None.

Behavior intentionally not changed:
- No runtime behavior changed.
- Locked systems remain locked.
- No save, combat, economy, Revisit, Talent activation, or version-label changes.

Checks run:
- `[smoke command]` — passed.

Checks not run:
- [check] — [reason]

Risks:
- Low. Smoke-only change.

Suggested next issue:
- [next issue]
```

## Contract / Helper Report Example

```text
Summary:
- Added a read-only helper for [system].
- Helper does not mutate state and is not wired into live gameplay.
- Added/updated smoke coverage where relevant.

Commit:
- [SHA]
- [message]

Files changed:
- `[runtime/helper file]` — added helper [name].
- `[smoke file]` — added smoke coverage for [behavior].

Behavior changed:
- [None, or describe exact read-only/copy-only effect]

Behavior intentionally not changed:
- Helper is not live-renderer activated unless explicitly requested.
- No gameplay math changed.
- No save schema changed.
- Locked systems remain locked.

Checks run:
- `[smoke command]` — passed.

Checks not run:
- [check] — [reason]

Risks:
- [risk level and note]

Suggested next issue:
- [next issue]
```

## Activation Report Example

```text
Summary:
- Activated [specific behavior].
- Added/updated smoke coverage for activation and locked-system boundaries.
- Commit is on main.

Commit:
- [SHA]
- [message]

Files changed:
- `[file]` — [activation change]
- `[smoke file]` — [coverage]

Behavior changed:
- [Specific behavior now active]

Behavior intentionally not changed:
- [Systems that remain locked]
- [Economy/combat/save constraints preserved]

Checks run:
- `[smoke command]` — passed.
- `[additional check]` — passed.

Checks not run:
- [check] — [reason]

Risks:
- [risk level and note]

Rollback path:
- Revert commit [SHA].

Suggested next issue:
- [next issue]
```

## Release-Label / Cache-Label Report Example

```text
Summary:
- Updated release/version/cache labels for [version].
- No gameplay behavior changed.
- Commit is on main.

Commit:
- [SHA]
- [message]

Files changed:
- `VERSION.md` — [change]
- `index.html` — [change]
- `sw.js` — [change]
- `[other file]` — [change]

Behavior changed:
- None.

Behavior intentionally not changed:
- No gameplay behavior changed.
- No save, combat, economy, Talent, or Revisit behavior changed.

Version checks:
- `VERSION.md` checked first — passed.
- Version strings searched in required files — passed.
- Public/runtime/cache labels match [version] — passed.

Checks run:
- [check] — [result]

Checks not run:
- [check] — [reason]

Risks:
- Low/medium. [note]

Suggested next issue:
- [next issue]
```

## Required Final Line

End every report with one of these:

```text
Status: committed and pushed to main.
Status: committed locally, push not confirmed.
Status: patch complete, not committed.
Status: review only, no files changed.
Status: blocked, changes needed before commit.
```

## Quality Bar

A release report is complete when it answers:

- What changed?
- Why was it changed?
- Which files changed?
- Did runtime behavior change?
- What stayed intentionally locked?
- What checks were run?
- What checks were skipped and why?
- Was it committed?
- What commit SHA proves it?
- What should happen next?
