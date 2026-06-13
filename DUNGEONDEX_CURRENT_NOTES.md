# DungeonDex Current Notes

## Source of Truth
- GitHub folder is the active source of truth.
- VERSION.md is the active version authority.
- CHANGELOG.md is the permanent update history.
- Do not use old zip names, old release-note filenames, old cache labels, or old smoke-test files as version authority.

## Current Baseline
- DungeonDex v1.7.8 - Revisit Checkpoint Planning Pass

## v1.7.8 Revisit Checkpoint
- Current baseline: v1.7.8.
- Revisit routes remain display-only, locked, and read-only.
- Verified safe: candidate hooks, candidate summary, route previews, route summary, readiness labels, criteria strings, and detail panel copy remain preview surfaces.
- Intentionally not implemented: route entry, route buttons, revisit rewards, teleporting, rerun combat, route completion, route scaling, or any replacement for Enter Dungeon / Continue Run.
- Recommended next step: v1.7.9 Revisit Unlock Gate Model. Define inert unlock-gate data structures, keep routes locked, and show why each route is locked without adding entry, rewards, or combat.

## Current Workflow
- Inspect files before editing.
- Keep updates small and reviewable.
- Do not create a new zip/package unless explicitly requested.
- Do not rename the project folder.
- Preserve save compatibility whenever possible.
- Summarize changed files after every pass.
- Include smoke-test steps before commit.

## Player-Facing Labels
- Keep visible labels short and clean.
- Use labels like “DungeonDex v1.4.11”.
- Do not show long internal pass names in the game UI.
- Long names belong only in changelog notes, commit messages, or internal comments.

## UI Direction
- Mobile-first.
- Compact panels.
- Fast repeat play.
- Clear gear readability.
- Less repeated combat text.
- Stable town/combat layout.
- Avoid clutter.

## Release Notes
- Add finished update notes to CHANGELOG.md.
- Do not create new PATCH_NOTES_1_4_X files.
- Keep VERSION.md updated when starting a new version target.

## Current Roadmap

### Stable Baseline
- v1.6.16 is the stable post-theme, post-audit, post-archive baseline.
- Active screens: town, run/combat, gear, Trophy Hall/Dex, and Archive.
- Active foundations: talents, debt collector, Famous Gear memory, retired gear, boss trophies, and Elite Board/rival contracts.
- Save/load repair, DevTools helpers, smoke scripts, service worker/cache, and Lowfire ember theme are active.
- Repository clutter is archived, and the runtime root is easier to review.

### Near-Term Patch Priorities
- Keep patches small, targeted, and smoke-tested.
- Harden save repair, labels, cache strings, and optional UI panels.
- Improve compact mobile readability without broad theme churn.
- Add or refresh smoke coverage around changed surfaces only.
- Avoid balance changes unless backed by focused testing.

### Next System Candidates
- Talent expansion with clearer passive player choice.
- Debt collector visibility and risk/reward pressure built from the existing foundation.
- Boss trophy and Dex identity improvements.
- Famous Gear memory readability and attachment polish.
- Retired Gear Hall depth within the existing archive flow.
- Early dungeon revisit ledger pass: candidate display was structured for clearer read-only planning while travel and rewards remain absent.
- Revisit candidate ledger hardening: candidate shape and empty-state behavior were protected while travel and rewards remain absent.
- Revisit rule lock: revisits are side routes only, anchored to trophies, Famous Gear/archive memory, rivals, debt pressure, and Elite Board/contract history.
- Revisit rules stay read-only for now: no route previews, no travel, no rewards, no route selection, and no interruption to Enter/Continue.
- Revisit smoke guard: the read-only candidate ledger and empty-state copy are now regression-protected in smoke coverage.
- Revisit route previews now group candidate hooks into locked future return-route cards.
- Route previews stay read-only; no travel, rewards, route selection, or rematches were added.
- Revisit checkpoint planning pass: v1.7.8 keeps route previews display-only and recommends inert unlock-gate data as the next safest step.
- Elite Board and rival contract clarity/polish.
- District and dungeon-world identity expansion.

### Larger Direction
- Move v1.7/v2 planning toward stronger world identity and collection-game feel.
- Build emotional attachment to gear, bosses, rival elites, and districts.
- Add reasons to revisit earlier dungeons without bloating combat.
- Improve progression arcs while keeping normal monsters Common / Elite / Boss.
- Preserve the mobile-first, one-hand-friendly interface.

### Deferred / Guardrails
- Do not reintroduce monster affixes or status effects.
- Do not make combat mechanically complex or text-heavy.
- Do not bloat the mobile UI or restart broad theme churn.
- Do not rewrite save structure casually.
- Do not change combat, loot, enemy scaling, economy, talent, debt, board, or archive behavior without a clear bug.
- Revisit guardrail: avoid infinite farming loops, best-in-slot low-floor farming, mandatory revisit grind, forced district choice before combat, and new affix/status complexity.
- Treat roadmap items as candidates unless explicitly promoted into a patch plan.
