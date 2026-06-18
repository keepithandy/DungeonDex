# DungeonDex Current Notes

## Source of Truth
- GitHub folder is the active source of truth.
- VERSION.md is the active version authority.
- CHANGELOG.md is the permanent update history.
- Do not use old zip names, old release-note filenames, old cache labels, or old smoke-test files as version authority.

## Current Baseline
- DungeonDex v1.20.19 - Talent Earning Source Contract

## v1.20.19 Talent Earning Source Contract
- Current baseline: v1.20.19.
- Boss/depth milestones are now the documented primary Talent earning source; Elite Board sources remain undecided future secondary options.
- Added a read-only earning source contract with six future milestone examples worth one planned point each and a planned total of six.
- Expanded save shape with the inert feature-gated `player.talentEarning` field: earning remains disabled, milestone state remains empty, and awarded points remain zero.
- Added `earningSourceContract`, `earningEnabled`, and `earningStatus` inspection helpers. The contract helper is defensive and non-mutating.
- Added seven smoke records proving the contract, disabled gate, stable output, non-mutation, and zero Talent ledger availability.
- The Talent module retains its stable `v1.16.2` component provenance label; only active public/runtime/cache labels moved to v1.20.19.
- No milestone tracking, point awards, spending, unlocks, learned nodes, passive bonuses, UI actions, combat, economy, monsters, gear, or progression behavior changed.

## v1.20.18 Talent System Re-entry Audit
- Current baseline: v1.20.18.
- The Talent ruleset foundation remains stable and single-sourced through the deeply frozen `TALENT_RULESET_PREVIEW` export: four branches, three tiers, and twelve nodes.
- Talent runtime behavior remains locked, preview-only, and inert. Earning, spending, unlocks, learned nodes, and passive effects remain disabled and zero-state.
- Talent save repair remains safe: legacy point/unlock fields are cleared and malformed canonical ledgers normalize to a locked zero-state while retaining only sanitized notes and a minimum schema version of 1.
- Preview helpers derive from the single ruleset. The internal passive-preview map is closure-private and exposed only through defensive clones; it is not itself frozen.
- Legacy talent fields remain repair/devtools-only outside the Talent module. Combat, economy, progression, and unrelated UI modules do not read them.
- The Talent module retains its `v1.16.2` component provenance label. It is old but stable and is not the public build authority.
- Existing Talent smoke coverage is comprehensive; no new smoke record was needed.
- Recommended next Talent patch: feature-gate point earning from Elite Board contract completion while keeping spending, unlocks, learned nodes, and passive effects disabled.
- No Talent gameplay, combat, economy, contract rewards, save shape, UI interaction, or balance behavior changed.

## v1.20.17 Town Revisit UI No-Live-Affordance Smoke Hardening
- Current baseline: v1.20.17.
- Trophy Echo now has a read-only route detail foundation tied to remembered boss trophies and trophy records.
- The planned Revisit lane order remains Trophy Echo, Famous Gear Memory, then Rival Trace.
- Rival Trace remains named rival elite memory only.
- No gameplay, combat, economy, contracts, debt, Talent, Elite Board, trophy, Famous Gear, save-structure, or Revisit activation behavior changed.

## v1.20.8 Owed Money Text Fix
- Current baseline: v1.20.8.
- Debt Collector Owed summaries now render clean text such as `Owed 5s` instead of literal money span markup.
- Styled coin HTML remains limited to controlled money markup contexts; escaped text surfaces use plain coin text.
- Debt smoke coverage asserts the rendered Owed text contains the expected amount and no literal `<span class="money` markup.
- No gameplay, combat, economy, debt math, Talent, Elite Board, trophy, Famous Gear, save-structure, or Revisit behavior changed.

## v1.20.1 Monster Backdrop Canvas Foundation
- Current baseline: v1.20.1.
- Added `js/systems/29_monster_backdrops_canvas.js` as a deterministic, canvas-only combat backdrop runtime.
- Added visual-only helpers: `generateMonsterBackdrop(monster, state, options)`, `renderMonsterBackdrop(canvas, backdrop)`, `attachMonsterBackdropCanvas()`, and `window.DDMonsterBackdropCanvas`.
- The backdrop renderer mounts behind `.combat-monster-stage`, uses deterministic seeds, and maps district/monster/depth identity into Lowfire, Bellforge, Mireglass, Red Chapel, Salt Forge, Sunken Court, Rookery, Noctis, or generic Hollow Stair scenery.
- Added `smoke_monster_backdrops_v120.mjs` to prove the backdrop contract is deterministic, non-mutating, visual-only, and free of gameplay action fields.
- No Three.js dependency was added.
- No combat math, HP, rewards, route entry, route completion, scaling, economy, debt, Talent, Elite Board, trophy, Famous Gear, or main progression behavior changed.
- v1.20.0 second Revisit lane planning remains preserved: Trophy Echo is still lane 1 and Famous Gear Memory is still lane 2 as inert metadata only.

## v1.20.0 Second Revisit Lane Planning Contract
- Current baseline: v1.20.0.
- Added Famous Gear Memory as the second planned Revisit lane contract in read-only metadata.
- Extended smoke coverage to prove Trophy Echo remains the first planned lane when preview order changes and second-lane fixture data is present.
- Revisit routes remain locked, inactive, preview-only, and non-playable.
- No gameplay, combat, economy, talent, revisit activation, debt, trophy, Famous Gear, Elite Board, or scaling behavior changed.

## v1.19.9 Revisit First Lane Selection Contract
- Current baseline: v1.19.9.
- Selected Trophy Echo as the first planned revisit activation lane in a read-only contract.
- Extended smoke coverage to prove the lane stays planned-only and still exposes no live entry, reward, or completion surface.
- Revisit routes remain locked, inactive, and non-playable.
- No gameplay, combat, economy, talent, revisit, debt, or scaling behavior changed.
