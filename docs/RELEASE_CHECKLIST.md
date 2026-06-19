# DungeonDex Release Checklist

Use this checklist when a patch changes the public version, cache label, release notes, or build metadata.

## 1. Confirm Version Authority
- Read VERSION.md first.
- Treat VERSION.md as the only current source of truth.
- Do not infer the current version from README, CHANGELOG, zip names, old notes, or cached runtime labels.

## 2. Locate Version Strings
Search all likely public/build/cache label locations before editing:

```powershell
Select-String -Path VERSION.md,README.md,CHANGELOG.md,DUNGEONDEX_CURRENT_NOTES.md,app.js,index.html,sw.js -Pattern "v1\."
Select-String -Path VERSION.md,README.md,CHANGELOG.md,DUNGEONDEX_CURRENT_NOTES.md,app.js,index.html,sw.js -Pattern "1\."
```

Also check any smoke file touched by the patch.

## 3. Required Version Files
Update only when the patch explicitly requires a version bump:

```text
VERSION.md
README.md
CHANGELOG.md
DUNGEONDEX_CURRENT_NOTES.md
app.js
index.html
sw.js
js/systems/21_build_label_guard.js
```

Some patches may also require updates to:

```text
js/systems/27_interface_density_cleanup.js
smoke_talent_v150b.mjs
smoke_debt_collector_v169.mjs
smoke_revisit_routes_v173.mjs
```

## 4. Label Rules
- Visible public label must stay short, for example: `DungeonDex v1.20.20`.
- Long patch names belong in docs, changelog entries, smoke notes, or internal comments.
- Cache/query strings may include a concise patch slug when needed.
- Keep VERSION.md, runtime labels, cache labels, README, CHANGELOG, and current notes aligned.

## 5. No-Drift Confirmation
Before finishing, explicitly confirm whether the patch changed any of these systems:

```text
Revisit activation / route entry / route start / rewards / completion / unlocks / progression
Talent earning / spending / learned nodes / unlocks / bonuses
Combat / monsters / gear generation / scaling / economy / debt math
Contracts / trophies / Famous Gear / Elite Board / save progression
Main dungeon entry flow
```

If the answer is yes, the final report must explain why that was in scope.

## 6. Validation
Run applicable checks:

```powershell
git status --short
git diff --check
node --check app.js
node smoke_talent_v150b.mjs
node smoke_debt_collector_v169.mjs
node smoke_revisit_routes_v173.mjs
```

For docs-only patches, at minimum run or request:

```powershell
git status --short
git diff --check
```

## 7. Commit Format
Use a terse commit message:

```text
Add workflow documentation
Harden talent smoke contract
Clarify Revisit planning guardrails
```

## 8. Final Report Format
```text
Result:

Version:
- Final version from VERSION.md:
- Commit hash:
- Branch:
- Repo status:
- Pushed to origin/main:

Files changed:
-

What changed:
-

What intentionally did not change:
-

Validation:
-

Risks / follow-up:
-
```
