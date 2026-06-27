# Issue 19 and 20 HTML Shell Notes

Branch: `issues-12-13-15-17-19-20-safe-board-cleanup`

This note records the intended safe scope for HTML shell semantics and inert template prep.

## Issue 19: HTML shell semantics

Safe semantic changes:

- Add `type="button"` to static app-shell buttons.
- Add a clear label to the primary tab navigation.
- Add tab IDs and screen relationships when they do not require renderer rewrites.
- Add panel labels to empty static mount points where useful.
- Preserve all existing IDs used by JavaScript renderers.
- Preserve current classic script order.
- Preserve current build query strings and service-worker registration behavior.

Out of scope:

- No visual redesign.
- No dynamic panel migration into static HTML.
- No new gameplay buttons or actions.
- No Talent, Revisit, Debt Collector, combat, reward, economy, or save behavior.

## Issue 20: inert template prep

Allowed inert templates:

- Panel shell template.
- Empty-state template.
- Compact status-row template.

Rules:

- Templates must remain inert by default.
- Templates must not create visible buttons, routes, unlocks, rewards, claim paths, completion records, or save mutations.
- Future JavaScript may clone templates only in a separate renderer patch.
- Existing dynamic panels continue to render from current JavaScript systems.

## Review checklist

Before closing these issues, confirm:

- `index.html` still loads through the same classic script order.
- Existing screen IDs remain unchanged.
- The primary tabs still use the same `data-screen` values.
- No cache labels or build labels were bumped.
- No new visible action surfaces were added.
- Existing smoke expectations do not need gameplay changes.
