# DungeonDex v1.27 Roadmap

## Release Identity

**Planned release:** `DungeonDex v1.27 - The Contract Board`

**Player-facing headline:**

> The Guild now posts clearer named hunts for dangerous elites. Choose a contract, descend with a purpose, recognize your mark in combat, and return with proof of the kill.

v1.27 is one complete player-facing Elite Contracts update. The roadmap issues below are development steps, not separate public releases. Keep the runtime, visible version, package version, and cache label at the current `v1.26.6 Ashen Anvil Reinforcements` baseline until the final release-authority issue is explicitly approved.

## Starting Baseline

- Branch: `main`
- Verified planning HEAD: `7cc64f771810b07ea8881c670bd7e17b6e6d5068`
- Version authority: `v1.26.6 Ashen Anvil Reinforcements`
- Build/cache label: `1.26.6-ashen-anvil-reinforcements`
- Working tree at roadmap creation: clean
- Live contract owner: `js/systems/03_town_contracts_market.js`
- Live combat owner: `js/systems/07_player_combat_runtime.js`
- Elite Contracts are already playable. v1.27 improves their choice, identity, combat recognition, and record presentation; it does not replace the existing system.

Always re-verify the real branch, HEAD, working tree, `VERSION.md`, and `origin/main` before starting an issue. This recorded planning HEAD is historical context, not authority for later work.

## Release Goals

Players should be able to:

1. Open Elite Contracts directly from the Town side-navigation shortcut.
2. Understand each available hunt at a glance.
3. Choose from a small set of distinct named contracts.
4. Carry one active contract into the normal dungeon run.
5. Immediately recognize the exact contract target when it appears in combat.
6. See a restrained completion signal when the target falls.
7. Return to Town, claim the established reward safely, and retain a readable Journal record.

## Release Guardrails

Unless a roadmap issue explicitly authorizes and verifies a narrow change, preserve:

- the normal `Enter Dungeon` / `Continue Run` entry path;
- combat action order and combat formulas;
- normal monster and boss scaling;
- existing Elite Contract reward currency, payout bounds, and claim protections;
- existing contract risk math and target-spawn rules;
- all Merchant Gear Upgrade values and the `+3` cap;
- save compatibility and existing contract history;
- Debt and Talent behavior;
- Trophy Echo as the only active Revisit lane;
- inactive Famous Gear Memory, Rival Trace, Board Echo, and Debt Pressure routes;
- public route IDs, side-navigation behavior, and script-load order;
- v1.26.6 version/cache labels until the final release-authority pass.

No new currency, daily timer, real-world timer, battle pass, hidden status, monster-affix framework, reward farming loop, or alternate dungeon-entry route belongs in v1.27.

## Work Order

### Completed #139 - Elite Contract Baseline and Save Contract Audit

**Patch category:** Audit / Smoke Hardening

**Goal:** Record the exact live Elite Contract lifecycle before changing its presentation.

**Required work:**

- Map offer generation, acceptance, active state, target spawn, failure/expiry, completion, claim, history, rival memory, and save normalization.
- Identify which fields are authoritative and which are presentation-only snapshots.
- Add or strengthen focused smoke coverage for:
  - an empty board state;
  - available offers;
  - accepting exactly one contract;
  - save/reload persistence;
  - target identity;
  - completion and one-time claim;
  - extraction, rest, guard, failure, and expiry clauses where already supported;
  - malformed historical state repair;
  - no duplicate reward claim.
- Document current payout and risk contracts without changing their values.

**Acceptance:**

- The existing lifecycle is protected before UI work begins.
- No runtime behavior, save schema, balance, version, or cache label changes.
- Focused smoke and compact verification pass.

**Completed result:**

- Added `tests/smoke/smoke_elite_contract_lifecycle_v127.mjs` and included it in the compact suite.
- The audit found and corrected one lifecycle defect: validation was discarding a completed but unclaimed active contract before the established claim action could pay it.
- Completed, unclaimed hunts now survive save normalization until claimed; invalid, failed, expired, and already-claimed active snapshots still clear safely.
- No payout value, target scaling, combat calculation, save field, or route changed.

### Completed #140 - Contract Board Choice and Readability Pass

**Patch category:** UI / Clarity

**Goal:** Make available contracts easy to compare and choose on mobile.

**Required work:**

- Present two or three available hunt cards when the existing offer model supports them.
- Give each card a concise hierarchy:
  - named target;
  - district or target location;
  - risk level with a non-color cue;
  - plain-language objective;
  - established reward preview;
  - optional bonus writ;
  - one clear accept action.
- Separate Available, Active, Completed, Failed, and Claimed states visually.
- Keep the existing Town hold-menu shortcut to Elite Contracts.
- Avoid dense diagnostic language and repeated summaries.

**Acceptance:**

- A player can compare the important differences without opening another panel.
- Only one active contract can be accepted.
- Disabled and unavailable states explain why without exposing internal terms.
- No payout, spawn, combat, save, route, or progression behavior changes.
- Phone layouts remain one-column, readable, and free of horizontal overflow.

**Completed result:**

- Existing cards now lead with target identity, explicit text risk, location, objective, bonus writ, current payout, and one action.
- The same `data-start-contract` controls, `claimEliteContractBtn`, contract IDs, and Town shortcut remain in place.
- No offer, payout, risk, spawn, save, or claim logic changed.

### Completed #141 - Named Hunt Identity Pass

**Patch category:** Content Expansion

**Goal:** Give the initial Elite Contract set distinct dark-fantasy identity without creating a new combat system.

**Required work:**

- Polish the three established contract templates into clearly differentiated named hunts.
- Reuse existing elite monsters, locations, contract clauses, and reward types.
- Give each hunt:
  - a memorable target name;
  - one short lore line;
  - a clear objective;
  - a clear risk label;
  - a truthful reward preview.
- Keep modifiers limited to established, understandable contract clauses.
- Do not add monster affixes, hidden statuses, new currencies, or new reward tables.

**Acceptance:**

- At least three complete hunt presentations feel different in theme and objective.
- Every displayed promise matches live behavior.
- Existing saves and historical contract IDs remain compatible through established aliases or normalization.
- Contract payout and combat balance remain within the existing protected contracts.

**Completed result:**

- Glassfang, Ash-Crowned, and Cinderjaw now have distinct hunt briefings, clauses, reward language, and lore-forward flavor.
- Contract IDs, target names, trophy links, payout values, payout caps, floor bonuses, risk values, and bonus-writ types are smoke-locked unchanged.

### Completed #142 - In-Combat Contract Target Indicator

**Patch category:** UI / Accessibility

**Goal:** Make the exact active contract target immediately recognizable during combat without cluttering the combat screen.

**Required behavior:**

- When, and only when, the current monster is the exact active contract target:
  - show a compact `CONTRACT TARGET` badge beside or above the monster name;
  - add a restrained ember-gold edge or highlight to the monster combat card;
  - show one short encounter message such as `Contract target encountered`;
  - play one brief entrance emphasis, then settle to a static state.
- Keep one concise objective line available during the fight.
- On target defeat, show a brief `Contract fulfilled - return to the Board` confirmation.
- Use text and shape as well as color so the state remains accessible.
- Respect reduced-motion preferences.

**Must not happen:**

- No pulsing screen, permanent animation, blocking modal, large banner, sound requirement, or repeated log spam.
- Ordinary elites, bosses, Trophy Echo enemies, rival history records, and inactive candidates must not receive the indicator.
- The indicator must not alter HP, damage, guard, speed, rewards, target spawning, action order, or combat timing.

**Acceptance:**

- The indicator follows `monster.contractTarget` plus the matching active contract identity, not elite tier alone.
- It appears on initial target render and remains correct after combat re-renders.
- It disappears for the next non-target encounter and after the contract is resolved.
- Mobile, contrast, non-color-cue, and reduced-motion checks pass.

**Completed result:**

- Combat now shows a compact text-and-shape `CONTRACT TARGET` cue and a concise defeat objective only when the current monster is marked as a contract target and its contract ID matches the live active contract.
- The matching target receives a restrained ember-gold combat edge and a one-time 460ms arrival emphasis that settles to a static state; reduced-motion preferences disable that animation.
- A fulfilled hunt now tells the player to return to the Board to claim the existing writ. Payouts, claim rules, target selection, monster stats, rewards, and combat timing remain unchanged.
- The Elite Contract lifecycle smoke locks the match rule, visible cue structure, reduced-motion declaration, completion guidance, save/reload, and one-time-claim behavior.

### Completed #143 - Fulfillment, Claim, and Guild Journal Polish

**Patch category:** UI / Clarity

**Goal:** Make the end of a hunt feel complete from target defeat through Town claim and historical record.

**Required work:**

- Clearly distinguish `Target defeated`, `Ready to claim`, and `Claimed`.
- Keep rewards secured through the existing claim path; do not add an automatic duplicate payout.
- Add a concise Guild Journal record using existing contract history.
- Record the named target, location, outcome, and bonus-writ result where those values already exist.
- Keep failed and expired hunts readable without turning them into active buttons.
- Remove internal terms from player-facing contract history.

**Acceptance:**

- Completion survives save/reload.
- Claim can succeed only once.
- Journal output is read-only and creates no new farming or Revisit path.
- Historical records remain compatible.
- Trophy Echo remains the only active Revisit lane.

**Completed result:**

- The active Board card now changes from `ACTIVE` to `TARGET DEFEATED`, shows `Ready to claim`, and uses the established `Claim Writ` action after the exact target falls.
- A read-only Elite Contract history projection presents ready-to-claim, claimed, failed, and expired outcomes without adding save fields, reward paths, or action controls.
- Guild Journal cards now record the named target, best available location, outcome, and Bonus Writ result when that result still exists in current save data.
- Older claimed-ID history remains compatible and readable; it does not invent a missing Bonus Writ result. Failed and expired records remain display-only.
- Focused lifecycle and Journal smoke coverage protects completion persistence, one-time claims, empty-save behavior, status labels, history copy, and the absence of Journal action buttons.

### Completed #144 - Mobile, Runtime, and Protected-System Release Audit

**Patch category:** Smoke Hardening / Audit

**Goal:** Prove the complete v1.27 feature does not disturb established DungeonDex systems.

**Required verification:**

- Focused Elite Contract lifecycle smoke.
- Initial render, acceptance, active target encounter, combat indicator, completion, claim, save/reload, and duplicate-claim blocking.
- Runtime console gate across Town, Elite Contracts, Dungeon, combat, Gear, Archive, Guild Journal, and Trophy Echo.
- Mobile layout and touch geometry at:
  - 390x844;
  - 430x932;
  - 768x1024.
- Contrast, non-color cue, focus, tap-target, and reduced-motion checks.
- Enter Dungeon runtime smoke.
- Merchant Gear Upgrade smoke.
- Debt and Talent compatibility smoke.
- Trophy Echo-only Revisit smoke.
- Boss-scaling matrix and compact suite.
- Source package audit.

**Acceptance:**

- No unauthorized change to combat, scaling, rewards, economy, saves, upgrades, Debt, Talent, Revisit, dungeon entry, routes, or script order.
- All required focused and broad checks pass.
- Any real defect becomes a separate narrow fix before release authority.

**Completed result:**

- The public Chromium gate now exercises the complete Elite Contract path from three-card initial render through acceptance, matching target cue, ordinary-elite exclusion, completion, save/reload, one-time claim, and read-only Guild Journal history.
- The audit found and fixed one narrow presentation defect: available offers now show their resolved Floor, Room, and Chapter instead of `Floor ?`.
- Public runtime passed 26/26; interface/accessibility 22/22; mobile layout 19/19; computed contrast 7/7; touch geometry passed at 390x844, 430x932, and 768x1024; source package audit passed 51 paths with zero warnings.
- Enter Dungeon passed 11/11; Debt/Talent 4/4; Merchant Gear Upgrades, Trophy Echo-only Revisit, Journal, Elite Contract lifecycle, and app-wiring authority passed.
- The boss matrix passed 20 bosses, 60 legal fixtures, and 36,000 fights. Temporary staged/extracted package verification passed 11/11, and the compact suite passed 51/51.
- Full evidence is recorded in `docs/status/PROTECTED_SYSTEM_REGRESSION_AUDIT_V127.md`.

### Planned #145 - v1.27 Release Authority and Package Pass

**Patch category:** Version Update / Release

**Goal:** Publish all completed roadmap work together as `DungeonDex v1.27 - The Contract Board`.

**Release gates:**

1. Planned #139 through #144 are complete.
2. The final diff contains no unauthorized protected-system drift.
3. Required focused and broad verification is green.
4. A clean staged and extracted public package passes strict validation.
5. The extracted build launches with no public runtime errors or missing assets.
6. Physical-device review is passed or any exception is explicitly documented and approved.
7. The user explicitly authorizes the version/cache update and release package.

**Only during this issue:**

- update `VERSION.md`;
- align runtime, visible, build-guard, manifest/package, and service-worker cache labels;
- update `AGENTS.md`, README, changelog, current notes, architecture notes, and patch notes;
- build the final itch-ready ZIP;
- strictly audit and launch the extracted ZIP;
- commit and push the exact release state;
- create a release tag or upload only with explicit authorization.

## Intended Final Patch Notes Shape

### Elite Contracts

- Refined the Lowfire Elite Board into a clearer contract-selection surface.
- Added three distinct named hunts using the established Elite Contract system.
- Improved mobile comparison of target, location, objective, risk, bonus writ, and reward.

### Contract Target Combat Cue

- Added a subtle `CONTRACT TARGET` badge and restrained ember highlight for the exact active target.
- Added a brief encounter cue and fulfillment confirmation.
- Added reduced-motion and non-color accessibility protection.

### Completion and Records

- Clarified target-defeated, ready-to-claim, and claimed states.
- Improved Elite Contract records in the Guild Journal.
- Preserved one-time claims and save/reload behavior.

### Gameplay Preserved

- No new currency, daily timer, alternate dungeon entry, monster-affix system, or Revisit lane.
- Existing combat formulas, boss scaling, economy, Merchant Gear Upgrades, Debt, Talent, and Trophy Echo behavior remain protected.

## Definition of Done

v1.27 is complete only when the board choice, named hunts, in-combat target recognition, completion/claim flow, Journal history, mobile presentation, protected-system regression audit, version alignment, and extracted public package all pass as one release.
