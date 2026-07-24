# DungeonDex v1.26.5 Guild Journal + Mobile Reliability Roadmap

## Roadmap status

- This file is the active planning authority for the proposed v1.26.5 work order.
- v1.26.5 is a development direction only.
- `VERSION.md` remains the version authority.
- Do not change public/runtime/cache labels until the final release-authority issue is complete and the user explicitly authorizes the version pass.
- Planned issue numbers in this document are roadmap slots only until corresponding GitHub issues are explicitly created.

## Current execution snapshot

The roadmap is being completed in order. The release version and cache label remain
`v1.26.4.06` until #134 receives explicit release authorization.

- ~~#126 Package checker source-audit mode~~ - completed before roadmap execution.
- ~~#127 Browser-computed contrast verification~~ - completed, committed in
  `ae1621c221dc6e3f096090f51f192ac738a0a324`, and closed. Compact suite: 45/45.
- ~~#128 Touch-navigation geometry smoke~~ - completed, committed in
  `1ba2e64f2cb9e7c209278d7c3cb768293c5198a1`, and closed. Compact suite: 46/46.
- ~~#129 Guild Journal Chronicle Pass~~ - completed, committed in
  `94875e492b98d8ebc533c38510ba4870286cfb6a`, pushed to `main`, and closed.
  Focused Archive ledger smoke: 5/5. Compact suite: 46/46.
- **Next: #130 Public package build and extraction gate.**
- Then: #131 public runtime console gate, #132 real-device handoff,
  #133 protected-system regression audit, and #134 release authority pass.

## Starting baseline

- Source version: `v1.26.4.06 Mobile Interface Audit Closure`.
- Branch: `main`.
- Baseline commit before this roadmap update: `f24459f6b23c22c5067745387630ee7a29cd4cdd`.
- Release tag: `v1.26.4.06`.
- Compact suite: 43/43 passed at the published baseline.
- Interface/accessibility suite: 21/21 passed at the published baseline.
- Mobile-layout suite: 16/16 passed at the published baseline.
- Enter Dungeon runtime suite: 11/11 passed at the published baseline.
- Open runtime syntax, stale-label, silent-catch, TODO/FIXME, and console-error audit findings: none at the start of this roadmap.
- Build/cache labels remain `1.26.4.06-mobile-interface-audit-closure` until an explicitly authorized release pass.

## Release identity

### Proposed release name

`DungeonDex v1.26.5 — Guild Journal + Mobile Reliability`

### Player-facing centerpiece

Turn the existing Guild Journal from a dense technical ledger into a readable dark-fantasy chronicle of the player's trophies, memories, upgrades, and surviving records.

### Supporting release work

Protect that visible improvement with stronger mobile geometry checks, browser-computed contrast verification, public-runtime error detection, clean package extraction testing, real-device validation, and final protected-system regression review.

## Core release principle

v1.26.5 should contain:

1. one substantial player-facing improvement;
2. several invisible release safeguards supporting it;
3. no new gameplay system, reward loop, currency, farming path, or progression shortcut.

The release should feel better to play and inspect without changing the established gameplay balance.

## Playable loop to preserve

```text
Town -> Dungeon -> Combat -> Loot -> Return -> Gear Upgrades -> Archive / Journal -> Repeat
```

Archive and Journal are active parts of the loop. They are not planning-only or optional developer surfaces.

## Work order

### 1. #126 — Package checker source-audit mode

- Status: completed and verified.
- Category: Smoke Hardening.
- Goal: keep strict staged-package rejection while allowing useful, low-noise source-tree audits.
- Result at roadmap start:
  - source mode checks 51 paths with zero warnings;
  - focused two-mode regression passes 8/8;
  - strict package mode still rejects repository-only content.
- Protected behavior: all runtime, gameplay, save, combat, economy, progression, Revisit, and version contracts.

### 2. #127 — Browser-computed contrast verification

- Status: completed and verified; GitHub issue closed.
- Category: Smoke Hardening.
- Goal: measure effective computed foreground, background, alpha, and opacity values after the full CSS cascade.
- Required surfaces:
  - Town panels and controls;
  - combat actions and warnings;
  - Gear cards and Gear inspection modal;
  - Archive and Guild Journal records;
  - intro modal;
  - disabled controls;
  - rarity indicators.
- Acceptance:
  - effective browser styles are used instead of hardcoded surface assumptions;
  - alpha and element opacity are composed before measurement;
  - failures identify the selector, surface, and measured result;
  - existing structural contrast audit remains useful or is narrowed appropriately;
  - compact verification remains green.
- Guardrail: do not change player-facing colors unless a separate confirmed defect is found and explicitly authorized.
- Result: added Chromium-computed contrast verification to the compact suite.
  The smoke reports the selector, surface, and measured effective contrast for a
  failed state. No player-facing color change was needed.
- Commit: `ae1621c221dc6e3f096090f51f192ac738a0a324`.

### 3. #128 — Touch-navigation geometry smoke

- Status: completed and verified; GitHub issue closed.
- Category: Smoke Hardening.
- Goal: prove with browser geometry that the closed touch toggle does not overlap Town headings or active controls.
- Required profiles:
  - 390x844;
  - 430x932;
  - 768x1024.
- Acceptance:
  - touch/coarse media state is verified before measurement;
  - bounding rectangles cover the closed toggle, Town district title, nearest heading, and nearest interactive control;
  - safe-area-inclusive source behavior remains protected;
  - failures report viewport and conflicting rectangles.
- Guardrails:
  - preserve route order;
  - preserve touch drawer behavior;
  - preserve combat navigation hiding;
  - preserve safe-area rules;
  - preserve public route and screen IDs.
- Result: added repeatable browser geometry assertions at all three required
  profiles. The check found and the patch corrected a real 390x844 overlap
  between the closed drawer toggle and the Town action row.
- Commit: `1ba2e64f2cb9e7c209278d7c3cb768293c5198a1`.

### 4. #129 — Guild Journal Chronicle Pass

- Status: completed and verified; GitHub issue closed.
- Category: Clarity / UI.
- Primary system: Archive and Guild Journal presentation.
- Goal: turn existing earned records into a compact, readable chronicle without adding new saved progression.

#### Player-facing requirements

##### Chronicle header

Add a compact Guild Journal summary using existing records only:

- total meaningful records;
- latest meaningful record;
- one short lore-forward summary;
- no new saved counter or timestamp requirement.

Example direction:

> Seven records endure. Latest: The Ash Warden Trophy, recovered from the Hollow Stair.

##### Semantic record cards

Present existing data through clear card types rather than uniform ledger rows:

- Boss Trophies;
- Trophy Echo;
- Merchant Gear Upgrades;
- Debt Record, only while debt is active;
- Historical Memories, only when compatible older save records already exist.

Each card should expose:

- one recognizable heading;
- one concise status badge;
- one primary result;
- one supporting detail;
- no developer terminology.

##### Remove player-facing system slop

Do not expose diagnostic phrases such as:

- `duplicate-safe`;
- `legacy trace detected`;
- `Memory Key`;
- internal route states;
- helper, fixture, normalization, canonical shape, or renderer-wiring terminology.

Diagnostic metadata may remain available to tests or internal helpers, but the visible Journal should use player-facing dark-fantasy copy.

##### Inactive Revisit protection

- Trophy Echo remains the only active Revisit lane.
- Existing historical Famous Gear or Rival records may appear as read-only historical records when compatible save data exists.
- Famous Gear Memory, Rival Trace, Board Echo, and Debt Pressure must not be presented as currently playable lanes.
- No inactive lane may expose Start, Continue, Claim, Complete, Unlock, Reward, or route-entry controls.
- No historical save data should be deleted.

##### Mobile presentation

At phone widths:

- use one-column cards;
- keep headings short;
- prevent horizontal overflow;
- allow long monster, gear, and district names to wrap;
- keep status badges readable;
- maintain accessible spacing and tap behavior;
- do not add a new permanent navigation control.

#### Likely implementation owners to inspect

- `js/systems/38_journal_v1.js`;
- established Archive renderer ownership;
- loaded Archive/Journal CSS;
- `tests/smoke/smoke_journal_v1233.mjs`;
- `tests/smoke/smoke_revisit_routes_v173.mjs`;
- interface/accessibility smoke;
- mobile-layout smoke and screenshot helper.

#### Explicitly forbidden

- no new Journal save fields;
- no new reward or claim loop;
- no Revisit activation;
- no Trophy Echo mechanic or reward change;
- no Debt calculation or wallet mutation change;
- no Gear Upgrade cost, cap, stat, or persistence change;
- no combat, monster, boss, economy, dungeon-entry, Talent, or progression change;
- no Archive record deletion;
- no restoration of the removed combat atmosphere strip.

#### Required verification

- empty-save Archive and Journal rendering;
- Boss Trophy record rendering;
- Trophy Echo record rendering;
- historical Famous Gear or Rival records remain read-only;
- inactive Revisit lanes expose no controls;
- Merchant Gear Upgrade information stays accurate;
- active Debt information remains display-only;
- mobile cards wrap without overflow;
- save/reload preserves all existing records;
- compact suite remains green.

#### Completed result

- Guild Journal now renders an empty-state Chronicle header and derives its
  record total and latest record from existing save data.
- Boss Trophies, Trophy Echo, Merchant Upgrades, active Debt, and compatible
  Famous Gear or Rival history render as semantic cards with no action controls.
- Historical Famous Gear and Rival records are explicitly read-only; Trophy Echo
  remains the only active Revisit lane.
- The Journal and Archive renderers now resolve the live state correctly, so
  existing saved records appear in the actual UI.
- Commit: `94875e492b98d8ebc533c38510ba4870286cfb6a`.

### 5. Planned #130 — Public package build and extraction gate

- Status: next in sequence; planned issue not yet created.
- Category: Release / Smoke Hardening.
- Goal: prove that the actual itch-ready package is clean, complete, and launchable outside the source repository.
- Acceptance:
  - build the staged public package;
  - run strict package validation against the staged output;
  - confirm repository-only content is absent;
  - extract the ZIP into a clean directory;
  - launch the extracted `index.html`;
  - verify required scripts, styles, assets, and service-worker references;
  - confirm the Guild Journal Chronicle Pass is present in the extracted build;
  - confirm the core loop still launches and remains navigable.
- Guardrails:
  - do not publish automatically;
  - do not bump version labels in this issue;
  - do not include tests, tools, internal docs, Git metadata, old archives, or development-only runtime files.

### 6. Planned #131 — Public runtime console gate

- Status: planned only; not yet created as a GitHub issue.
- Category: Smoke Hardening.
- Goal: exercise the public runtime and fail on browser-level errors that source inspection may miss.
- Required surfaces:
  - Town;
  - Dungeon;
  - Gear;
  - Archive;
  - Guild Journal;
  - Trophy Echo;
  - intro modal;
  - Gear inspection modal.
- Detect:
  - uncaught JavaScript errors;
  - unhandled promise rejections;
  - missing assets;
  - failed local requests;
  - development-only scripts loaded in public mode.
- Acceptance:
  - zero unexpected runtime errors;
  - zero missing public assets;
  - failures identify active route, message, and source location where available.
- Guardrail: do not turn this issue into a general error-handling refactor.

### 7. Planned #132 — Real-device release handoff

- Status: planned only; not yet created as a GitHub issue.
- Category: Audit / Release Validation.
- Goal: verify the release candidate on the physical iPhone/Textastic workflow rather than treating desktop emulation as final proof.
- Required checks:
  - open and close navigation repeatedly;
  - select every public route;
  - scroll Town with the rail open and closed;
  - enter the dungeon;
  - use all four combat actions;
  - return to Town;
  - open Archive and Guild Journal;
  - open and close Gear inspection;
  - rotate the device and recover;
  - reload and confirm saved state;
  - confirm controls do not sit beneath browser or application chrome.
- Each result must be recorded as:
  - Pass;
  - Fail;
  - Blocked.
- Guardrail: a discovered failure becomes a separate focused issue. Do not hide a device defect inside the release-authority commit.

### 8. Planned #133 — Final protected-system regression audit

- Status: planned only; not yet created as a GitHub issue.
- Category: Audit / Smoke Hardening.
- Goal: prove that the v1.26.5 presentation and release work did not alter established gameplay contracts.
- Protected targets:
  - combat math;
  - player damage and HP;
  - monster scaling;
  - boss scaling;
  - rewards and drop rates;
  - economy and Merchant prices;
  - Merchant Gear Upgrade costs, caps, bonuses, save fields, and persistence;
  - save schema and normalization behavior;
  - dungeon-entry behavior;
  - Debt mechanics;
  - Talent behavior;
  - Trophy Echo mechanics and rewards;
  - inactive Revisit availability;
  - public route IDs;
  - script-load ordering.
- Required evidence:
  - focused Journal smoke;
  - Revisit smoke;
  - Merchant Gear Upgrade smoke;
  - Debt smoke;
  - Enter Dungeon runtime smoke;
  - interface/accessibility smoke;
  - mobile-layout smoke;
  - package checker source mode;
  - strict package checker against staged output;
  - compact suite.
- Do not perform broad smoke-suite organization or cleanup unless an actual ownership ambiguity blocks diagnosis.

### 9. Planned #134 — v1.26.5 release authority pass

- Status: planned only; not yet created as a GitHub issue.
- Category: Version Update / Release.
- Goal: perform the final label, documentation, package, and release alignment only after all selected gates pass.

#### Hard release conditions

Do not begin the version/cache pass until:

1. #127 is complete;
2. #128 is complete;
3. the Guild Journal Chronicle Pass is complete;
4. the extracted public package passes;
5. the public-runtime console gate passes;
6. physical-device validation passes or has explicit documented approval for a blocked check;
7. the protected-system audit finds no unauthorized drift;
8. focused checks pass;
9. the compact suite passes;
10. the user explicitly authorizes the release/version/cache update.

#### Final authority work

Only after authorization:

- update `VERSION.md`;
- align visible game version labels;
- align runtime/build labels;
- align service-worker cache label and cache queries;
- align the build-label guard;
- update README, CHANGELOG, current notes, release notes, and package references;
- build and validate the final public package;
- tag the exact release commit when explicitly requested.

## Global protected systems

Unless a focused issue explicitly authorizes a protected system, do not change:

- combat math;
- player damage or HP;
- normal monster or boss scaling;
- rewards, drops, XP, or gold formulas;
- economy or Merchant prices;
- Gear Upgrade values, costs, caps, or save behavior;
- save compatibility or schema;
- dungeon-entry behavior;
- Debt mechanics;
- Talent earning, spending, learned state, or passive effects;
- Trophy Echo start, completion, rewards, or history behavior;
- inactive Revisit lane availability;
- public route IDs;
- script-load ordering.

## Intended patch-note shape

The final public notes should lead with the visible Journal improvement:

> The Guild Journal now presents your trophies, memories, upgrades, and surviving records as a clearer chronicle of the descent.

Supporting line:

> Mobile navigation, accessibility verification, runtime stability, and itch.io package safeguards have also been strengthened.

The patch notes should not imply that v1.26.5 adds a new progression system, new rewards, new combat content, or newly active Revisit lanes.

## Deferred work

Keep these outside v1.26.5 unless separately authorized:

- additional Revisit lane activation;
- Board Echo;
- Debt Pressure gameplay;
- new Talent effects;
- new currencies or reward loops;
- new combat statuses or monster affixes;
- combat atmosphere strip restoration;
- broad architecture modernization;
- smoke-suite reorganization that does not directly block the release.

## Roadmap completion definition

v1.26.5 is complete only when the player-facing Guild Journal improvement is packaged and verified alongside the mobile, accessibility, runtime, device, and protected-system release gates, with no unauthorized gameplay drift and with an explicitly authorized version/cache pass.
