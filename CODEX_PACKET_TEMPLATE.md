# CODEX_PACKET_TEMPLATE.md

## Purpose

Use this template when asking Codex or another repo agent to inspect, modify, review, or verify DungeonDex.

The goal is to keep every agent task narrow, safe, reviewable, and easy to commit. A good packet should tell the agent exactly what to do, what not to touch, what checks to run, and how to report back.

This template should be copied into a Codex prompt, GitHub issue, or patch-planning note and filled in for the specific task.

## Required First Instruction

Always begin a Codex task with this instruction:

```text
Read AGENTS.md first and follow it as the repo operating contract. Then read VERSION.md and DUNGEONDEX_CURRENT_NOTES.md before planning edits. If docs/CURRENT_ARCHITECTURE.md, docs/PATCH_TEMPLATE.md, or docs/RELEASE_CHECKLIST.md are relevant to this task, read them before editing.
```

## Packet Header

```text
Repo: DungeonDex
Branch: main
Task type: [docs-only | smoke-only | contract/helper | activation | release-label/cache-label | bugfix | review-only]
Target version: [leave unchanged unless explicitly requested]
Primary goal: [one sentence]
Expected commit: [yes/no]
```

## Full Codex Packet Template

```text
Read AGENTS.md first and follow it as the repo operating contract. Then read VERSION.md and DUNGEONDEX_CURRENT_NOTES.md before planning edits. If docs/CURRENT_ARCHITECTURE.md, docs/PATCH_TEMPLATE.md, or docs/RELEASE_CHECKLIST.md are relevant to this task, read them before editing.

Repo: DungeonDex
Branch: main
Task type: [docs-only | smoke-only | contract/helper | activation | release-label/cache-label | bugfix | review-only]
Target version: [leave unchanged unless explicitly requested]
Primary goal: [write one sentence]
Expected commit: [yes/no]

## Goal

[Describe the intended change in plain language. Keep this narrow.]

Example:
Add smoke coverage for Debt Collector clarity remaining locked without activating renderer behavior.

## Current Context

[Summarize the relevant current project state. Include known version, recent patch context, locked systems, or prior helper behavior if relevant.]

Example:
DungeonDex already has an active Talent foundation. Hunter Board Clarity exists as copy-only behavior. Debt Collector clarity is prepared but must not be live-renderer activated. Revisit remains locked and planning-only.

## Allowed Scope

You may inspect the repo as needed, but edits are limited to:

- [file or folder]
- [file or folder]
- [file or folder]

If you believe another file must be edited, stop and explain why before editing it.

## Forbidden Changes

Do not change:

- Combat math
- Monster scaling
- HP, damage, XP, gold, drops, or reward economy
- Save schema or save migration behavior
- Dungeon entry flow
- Revisit activation, rewards, claims, progression, currency, or farming behavior
- Talent earning rates, spending costs, unlock rules, learned-state behavior, or new Talent branches unless explicitly requested
- Passive gameplay bonuses unless the task type is explicitly activation
- Debt Collector clarity `liveRendererWired` status unless explicitly requested
- Service worker/cache labels unless this is a release-label/cache-label task
- Public version labels unless a version bump is explicitly requested
- External dependencies
- Build tooling or project architecture

## Required Patch Classification

Before editing, classify the patch as one of:

1. Docs-only
2. Smoke-only
3. Contract/helper
4. Activation
5. Release-label/cache-label
6. Bugfix
7. Review-only

Then explain what that classification allows and forbids for this task.

## Required Investigation

Before editing, inspect:

- Current branch and repo status if available
- `AGENTS.md`
- `VERSION.md`
- `DUNGEONDEX_CURRENT_NOTES.md`
- Any files directly named in Allowed Scope
- Any existing helper, smoke, renderer, or copy function related to this task

Report any surprising findings before making broad changes.

## Implementation Rules

- Make the smallest safe change that satisfies the goal.
- Prefer explicit helpers, clear return objects, and smoke coverage over hidden side effects.
- Preserve existing behavior unless the goal explicitly says to change it.
- Do not modernize, reformat, or refactor unrelated code.
- Do not rename functions unless required.
- Do not delete comments or documentation unless they are incorrect and directly related to the task.
- Keep public-facing wording short, clear, and consistent with DungeonDex tone.
- Avoid adding UI that implies inactive behavior is playable.

## Testing / Verification Requirements

Run the checks that match the patch type.

For docs-only:
- Verify the edited markdown is readable.
- Verify no runtime files changed.

For smoke-only:
- Run the relevant smoke command if available.
- Confirm the smoke test fails before the fix if practical, then passes after the fix if this is a bugfix smoke.
- Confirm runtime behavior was not changed.

For contract/helper:
- Run the relevant smoke command if available.
- Confirm helpers are read-only or non-mutating unless mutation was explicitly requested.
- Confirm helpers are not wired into live gameplay unless activation was explicitly requested.

For activation:
- Run all directly relevant smoke checks.
- Confirm the activated behavior is intentionally wired.
- Confirm locked systems remain locked.
- Include rollback notes.

For release-label/cache-label:
- Search for version strings in all files listed by AGENTS.md.
- Report every relevant version string found before editing.
- Verify public/runtime/cache labels match the requested version after editing.

If a check cannot be run, say exactly why.

## Required Final Response

Use this exact report structure:

Summary:
- [one to three bullets]

Patch classification:
- [classification]
- [why this classification was chosen]

Files changed:
- [path] — [what changed]

Behavior changed:
- [runtime behavior changes, or "None"]

Behavior intentionally not changed:
- [locked systems preserved]

Checks run:
- [command or verification]
- [result]

Checks not run:
- [command/check]
- [reason]

Risks:
- [risk or "Low"]

Follow-up recommendations:
- [next issue or "None"]

Suggested commit message:
- [type: concise message]
```

## Short Packet Template

Use this for small patches.

```text
Read AGENTS.md first and follow it as the repo operating contract. Then read VERSION.md and DUNGEONDEX_CURRENT_NOTES.md before planning edits.

Repo: DungeonDex
Branch: main
Task type: [docs-only | smoke-only | contract/helper | activation | release-label/cache-label | bugfix | review-only]
Goal: [one sentence]

Allowed files:
- [path]
- [path]

Forbidden changes:
- No combat, economy, save schema, dungeon entry, Revisit activation, Talent expansion, passive gameplay activation, dependency, build tooling, service worker, or version-label changes unless explicitly listed above.

Required checks:
- [check]
- [check]

Final report must include:
- Summary
- Patch classification
- Files changed
- Behavior changed
- Behavior intentionally not changed
- Checks run
- Checks not run
- Risks
- Follow-up recommendations
- Suggested commit message
```

## Review-Only Packet Template

Use this when asking Codex to inspect the repo without editing.

```text
Read AGENTS.md first and follow it as the repo operating contract. Then read VERSION.md and DUNGEONDEX_CURRENT_NOTES.md.

Review only. Do not edit files and do not commit.

Question:
[write the specific thing to inspect]

Scope:
- [file/system]
- [file/system]

Report:
- What you inspected
- What you found
- Any risks
- Whether a patch is needed
- Recommended next issue if a patch is needed
```

## Package / Dependency Review Packet

Use this before adding any dependency.

```text
Read AGENTS.md first and follow it as the repo operating contract.

Review only. Do not install anything yet. Do not edit files.

Package under review:
- Name: [package]
- Reason requested: [why it might be useful]
- Intended use inside DungeonDex: [specific use]

Evaluate:
- Whether DungeonDex actually needs this dependency
- Whether a native/browser-only solution is safer
- Maintenance status if available
- Dependency size and dependency chain risk
- Install scripts or postinstall behavior if available
- Whether it touches network, file system, storage, crypto, auth, or secrets
- Whether it conflicts with mobile-first vanilla browser direction

Return:
- Recommendation: approve / avoid / investigate more
- Safer alternative if available
- Risk notes
- Exact next step
```

## Commit Guidance

Only commit when the user or task explicitly requests a commit.

Good commit message examples:

```text
docs: add Codex packet template
smoke: lock Debt Collector clarity renderer state
fix: preserve Talent learned state after reload
docs: update release checklist for cache labels
```

Avoid vague commit messages such as:

```text
update files
fix stuff
changes
work
```

## Quality Bar

A good Codex packet is complete when a repo agent can answer all of these before editing:

- What is the goal?
- What type of patch is this?
- Which files may be edited?
- Which systems must not change?
- Which checks prove the patch is safe?
- What should the final report include?
- Should the agent commit or only report?

If any of those are unclear, tighten the packet before starting work.
