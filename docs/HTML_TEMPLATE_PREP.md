# HTML Template Prep

DungeonDex keeps live game rendering in the existing JavaScript systems. The inert templates in `index.html` are small future-use shells only.

## Current templates

- `dd-panel-shell-template`: a generic `.panel` wrapper with a `stack-8` content slot.
- `dd-empty-state-card-template`: a small empty-state card with title and body slots.

## Usage contract

Renderers may clone these templates in a future patch only when doing so preserves existing behavior.

Safe future use means:

- clone the template explicitly from JavaScript
- fill only text/content slots needed by an existing renderer
- attach the cloned content to an already-owned renderer panel
- keep existing panel IDs and anchors intact
- keep existing save, reward, route, claim, unlock, combat, Talent, Debt Collector, and Revisit behavior unchanged

Do not use these templates to introduce new visible actions, buttons, routes, rewards, unlocks, claims, save writes, or gameplay state changes.

## Why templates are inert

HTML `<template>` content is not rendered by the browser until a script clones it. Keeping these templates inert lets DungeonDex document reusable shell shapes without moving dynamic game panels out of the current renderer system.

This file is intentionally about future renderer hygiene. It is not an activation plan for new gameplay behavior.
