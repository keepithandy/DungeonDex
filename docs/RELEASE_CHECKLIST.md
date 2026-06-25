# DungeonDex Release Checklist

Use this short checklist before committing a DungeonDex patch.

## Version Authority
- `VERSION.md` is the public build authority.
- `CHANGELOG.md` is the permanent release history.
- `DUNGEONDEX_CURRENT_NOTES.md` is the current working summary.
- Runtime labels, cache labels, and internal module labels must not replace those files as the source of truth.
- Keep visible version labels short and aligned with the authority files.

## Quick Checks
Run the checks that match the patch scope:

```powershell
git status --short
git diff --check
node --check app.js
node --check sw.js
node --check smoke_talent_v150b.mjs
node .\smoke_talent_v150b.mjs
```

## Guardrails
- Preview-only systems must stay preview-only unless the issue explicitly activates them.
- Revisit routes are not playable yet.
- The broad Talent tree UI remains locked and preview-only.
- Do not add new Talent nodes, respec, passive stat effects, reward multipliers, combat effects, economy effects, or Revisit effects unless the issue explicitly says so.
- Service worker and cache label changes should only happen during versioned release patches.

## Final Pass
- Confirm the version label set is aligned before you commit.
- Keep the checklist short and practical.
- Do not add extra release process overhead unless the patch truly needs it.
