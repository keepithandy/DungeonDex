# Codex Prompt — DungeonDex Monster Model System v2

## Goal
Improve the existing DungeonDex CSS monster model system without replacing it with image assets or a new rendering pipeline.

The current combat enemy visuals are CSS-built silhouettes inside the combat stage. That system is good and should be preserved. The problem is that the current enemies read too much like abstract blobs/icons: one rounded silhouette, fake horns, simple limb pseudo-elements, and a glowing core glyph. This pass should evolve the system so enemies start reading as actual dark-fantasy monsters while staying lightweight, CSS-driven, and compatible with the current combat renderer.

## Repo context
Primary files to inspect first:

- `js/systems/11_ui_run_gear_dex_archive.js`
- `styles.css`
- `js/systems/06_scaling_generation_audits.js`
- `js/systems/07_player_combat_runtime.js`

Current rendered structure in `renderRun()` includes:

```html
<div class="monster-aura"></div>
<div class="monster-silhouette">
  <span class="monster-horns" aria-hidden="true"></span>
  <span class="monster-core" aria-hidden="true">...</span>
</div>
<div class="stage-floor"></div>
```

Keep the broad idea, but expand it into a modular CSS monster model.

## Design direction
Do not make blob/slime monsters by default.

The desired direction is: recognizable dark-fantasy 2D monster silhouettes built from CSS parts.

The monsters should feel like real enemies from DungeonDex districts:

- Lowfire: ash ghouls, ember brutes, soot husks, cracked scavengers.
- Mireglass: wet crawlers, glass-eyed stalkers, venom spitters, swamp revenants.
- Bellforge / Veyruhn: furnace constructs, chained bailiffs, molten wardens, iron collectors.
- Red Chapel: candle acolytes, blood-rune penitents, chapel zealots, wax-covered ritualists.
- Noctis: shadow watchers, lanternless seers, void stalkers, crown-eyed shades.
- Bosses: larger named-feeling silhouettes with unique crowns, relics, armor plates, weapons, or extra appendages.

## Implementation constraints
- Keep everything browser-native and dependency-free.
- Do not introduce canvas, SVG sprite sheets, image assets, build tools, or external art files.
- Do not break the existing combat UI, save system, or action buttons.
- Keep mobile readability as the priority.
- Prefer additive classes and markup over risky rewrites.
- Keep normal / elite / boss tier styling working.
- Respect reduced-motion preferences where practical.
- Avoid changing combat math, reward math, monster generation balance, or save shape.

## Requested implementation

### 1. Add a monster visual profile helper
In `js/systems/11_ui_run_gear_dex_archive.js`, add a small helper that derives visual classes from the existing monster/district/depth data.

Suggested helper name:

```js
function monsterVisualProfile(monster, district, depth) { ... }
```

It should return an object like:

```js
{
  body: 'brute',
  head: 'skull',
  arms: 'claws',
  crest: 'horns',
  skin: 'lowfire',
  feature: 'ember-core'
}
```

Keep this simple and deterministic. Use existing monster fields:

- `monster.family`
- `monster.type`
- `monster.name`
- `monster.tier`
- district id/name/tone
- depth

Do not change monster generation yet. This pass should only change the visual interpretation of already-existing monster data.

### 2. Expand the combat monster markup
In `renderRun()`, replace the minimal silhouette internals with modular spans/divs while preserving the outer stage structure.

Suggested direction:

```html
<div class="monster-aura"></div>
<div class="monster-model monster-body--... monster-head--... monster-arms--... monster-crest--... monster-skin--... monster-feature--...">
  <span class="monster-shadow"></span>
  <span class="monster-back"></span>
  <span class="monster-arm monster-arm-left"></span>
  <span class="monster-arm monster-arm-right"></span>
  <span class="monster-body"></span>
  <span class="monster-head"></span>
  <span class="monster-face"></span>
  <span class="monster-crest"></span>
  <span class="monster-core" aria-hidden="true">...</span>
  <span class="monster-ornament"></span>
</div>
<div class="stage-floor"></div>
```

Compatibility note: either keep `.monster-silhouette` as an alias class on the new monster root or add CSS fallback so existing hit reactions still work.

### 3. Add CSS body archetypes
In `styles.css`, add a new section near the current `v1.3.45 — Monster Visual Pass` section.

Create readable CSS archetypes:

- `brute` — broad, heavy, hunched, thick arms.
- `stalker` — lean, crouched, long arms.
- `crawler` — low, wide, many-limb feeling.
- `construct` — rigid, armored, squared plates.
- `ritualist` — upright cloak/hood silhouette.
- `shade` — floating, smoky, dissolving lower body.

These should still fit inside the existing combat stage and not overflow badly on small screens.

### 4. Add district skins
Create district skin classes that alter color/material:

- `monster-skin--lowfire`
- `monster-skin--mireglass`
- `monster-skin--veyruhn`
- `monster-skin--red-chapel`
- `monster-skin--salt-forge`
- `monster-skin--sunken-court`
- `monster-skin--rookery`
- `monster-skin--noctis`
- `monster-skin--generic`

Keep the palette consistent with the current combat backdrop logic.

### 5. Add feature/ornament classes
Add visual details that make enemies feel like monsters instead of blobs:

- skull face
- furnace visor
- glass eyes
- candle crown
- chain ornament
- smoke tendrils
- claw arms
- hook arms
- antler/horn crown
- chapel sigil
- void eye
- iron plates

Use pseudo-elements where possible.

### 6. Preserve tier upgrades
Normal enemies should be readable but not too large.

Elite should add:
- sharper silhouette
- stronger accent color
- extra ornament or second glow

Boss should add:
- larger root model
- crown/crest intensity
- more dramatic arms/back silhouette
- stronger core/face glow

Do not make all bosses identical. Bosses may still share the same boss tier enhancement, but they should retain their family/district profile.

### 7. Keep scope tight
This should be a visual system pass only.

Avoid:
- changing monster stats
- changing save/load
- changing combat action behavior
- changing district progression
- adding asset files
- changing unrelated UI panels

## Acceptance checks
After the change:

- The app still loads without console errors.
- Combat screen still renders normal, elite, and boss monsters.
- Attack/skill hit reaction still affects the monster model.
- Monster models no longer read as one generic abstract blob.
- Different monster families/districts produce visibly different silhouettes.
- Mobile combat stage remains readable.
- No save shape or gameplay balance changes are introduced.

## Suggested commit message

```text
feat: evolve CSS monster model visuals
```

## Notes for reviewer
This is the first pass toward a CSS-driven monster model renderer. It intentionally keeps the current no-assets approach and avoids gameplay changes. Future passes can add named visual recipes per monster family once the modular body/head/skin system is stable.
