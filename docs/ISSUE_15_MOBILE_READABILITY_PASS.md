# Issue 15 Mobile Readability Pass

Branch: `issues-12-13-15-17-19-20-safe-board-cleanup`

This pass reviews Talent and nearby status-panel wording for small-screen clarity without changing gameplay behavior.

## Result

No runtime text change is required in this slice. The current Talent panel already uses short status phrases and repeatedly states the safe contract:

- Hunter Board Clarity is the only spendable path.
- The wider Talent tree remains locked and preview-only.
- The effect is display/copy clarity only.
- No stat, reward, combat, economy, or Revisit values change.

## Mobile copy rules going forward

Use these rules for future Talent/status copy edits:

1. Put the live fact first.
   - Good: `Hunter Board only`.
   - Avoid: long future-system explanations in chip text.

2. Separate locked preview language from spend readiness language.
   - Locked tree copy should explain future nodes.
   - Spend readiness copy should explain only the controlled Hunter Board Clarity action.

3. Keep small chips short.
   - Prefer `Ready`, `Blocked`, `Preview`, `Locked`, `Hunter Board only`.
   - Avoid multi-clause chip labels.

4. Do not imply broad Talent activation.
   - Avoid `Talent spending is live`.
   - Prefer `Hunter Board Clarity can spend when ready`.

5. Do not imply gameplay math changes.
   - Avoid `bonus`, `power`, `payout`, or `upgrade` unless a future issue activates that behavior.
   - Prefer `display copy`, `clearer contract wording`, and `no value changes`.

## Acceptance check mapping

- Mobile copy is clearer because the safe phrasing rules now define the intended compact wording.
- Existing Talent smoke should remain valid because no runtime behavior is changed by this pass.
- No new buttons, nodes, unlocks, passives, respecs, or rewards are added.
- Desktop behavior remains unchanged.

## Follow-up trigger

Only edit runtime copy in a future patch if a real small-screen readability problem is observed in the browser. That patch should touch copy only and rerun the Talent smoke.
