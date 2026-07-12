# DungeonDex v1.24.0 Lore Layer – Integration & Context Note

## Historical Status

Archive notice: this integration note describes an older rewrite snapshot and is not current release or system authority.

**Historical itch.io reference:** v1.4.1
**This patch:** v1.24.0 (development rewrite branch)  
**Repo branch:** Designed for the `/rewrite` branch (v1.23.8+ systems)

The uploaded DungeonDex.zip contains the active development state from the rewrite branch, which includes:
- Systems 0–42+ (comprehensive infrastructure)
- Talent system (Systems 19, 32, 33)
- Revisit Echo, Famous Gear, Rival Trace routes (Systems 35, 36, 37, 38)
- Debt Collector (Systems 28, 34)
- Gear Hall Unified (System 39)
- Vow System (System 40)
- Debt Pressure (System 41)

This v1.24.0 lore-layer patch builds directly on top of that rewrite state without disrupting any of those systems.

---

## Patch Scope

**What this patch does:**
- Adds semantic lore-framed HTML wrapper classes (`.ddx-*`)
- Adds thematic CSS styling per region/card type
- Enhances ARIA accessibility (roles, labels)
- Updates UI copy (aria-labels only; no display text changes)
- Updates build version to v1.24.0

**What this patch does NOT do:**
- Modify any JS systems (all 42 system files untouched)
- Change gameplay, combat, rewards, or save data
- Rename existing IDs or data-attributes
- Add new features or systems
- Alter the 5-tab layout or navigation flow

---

## Integration with Rewrite Branch

This patch is designed as a **pure UI/styling layer** on top of v1.23.8+. It assumes:

✓ Systems 0–42 are present and functional  
✓ Talent system is active (System 19)  
✓ Revisit routes are locked/playable as per System 31  
✓ Debt Collector operates normally (System 28)  
✓ Gear Hall Unified is in place (System 39)  
✓ Journal system is live (System 38)  

The patch **does not interfere** with any of these. All system files render into the same IDs and selector hooks as before.

---

## Files to Update/Merge

When integrating into the rewrite branch:

### Definitely Replace
- `index.html` – Use the patched version (includes `.ddx-*` classes and improved ARIA)
- `app.js` – Use the patched version (build version updated to 1.24.0)

### Add as New
- `styles_lore_layer.css` – Include in the root directory
  - Link it in index.html after `styles.css` (both linked with build query strings)

### No Changes Needed
- All `js/systems/*.js` files
- `sw.js`, `manifest.json`
- `styles.css` (main stylesheet remains untouched)

---

## Verification After Merge

### Smoke Tests Should Still Pass
- All panel IDs present: `#questPanel`, `#combatPanel`, `#merchantPanel`, etc.
- All button IDs present: `#startRunBtn`, `#restBtn`, `#saveBtn`, etc.
- All screen IDs present: `#screen-town`, `#screen-run`, `#screen-gear`, `#screen-dex`, `#screen-archive`
- All data-attributes intact: `data-screen`, `data-action`, `data-start-revisit`
- Combat selector `.panel.combat-panel` still valid
- Section header selector `.panel.section-header` still valid

### Game State & Logic
- New character starts: progression unchanged
- Revisit lanes: locked/playable states unchanged
- Debt Collector: behavior unchanged
- Talent system: award/claim mechanics unchanged
- Save/Load: format and structure unchanged

### Visual Polish
- Town header displays as "Guild Ledger" (aria-label, no display text change)
- Navigation tabs show "Town", "Run", "Gear", "Archive", "Journal" (second and third tabs relabeled)
- All cards styled with lore-appropriate colors and borders
- Mobile responsive at ≤700px and ≤480px breakpoints

---

## Build Label Considerations

The build label has changed from:
- `1.23.8-merchant-gear-upgrades-replace-talent-system`

To:
- `1.24.0-lore-layer-interface-shell`

**Impact:**
- Build label guard (System 21) will recognize 1.24.0 on load
- Service worker will cache-bust properly with new query string
- No player save data is affected (build label is UI-only)

---

## Recommended Workflow

1. **Pull the rewrite branch locally** (contains v1.23.8 systems)
2. **Replace `index.html` and `app.js`** with the patched versions
3. **Add `styles_lore_layer.css`** to the root directory
4. **Run smoke tests** to confirm all selectors/IDs still valid
5. **Test locally** in browser (mobile viewport and desktop)
6. **Commit with message:**
   ```
   v1.24.0: Lore-Layer Interface Shell
   
   Add semantic lore-framed HTML structure and IP-themed CSS layer.
   All gameplay, systems, and selectors unchanged.
   ```
7. **Push to rewrite branch** (not main; main is still v1.4.1 stable)
8. **Consider a separate commit** to update CHANGELOG.md and VERSION.md if they exist

---

## Future Considerations

### Immediate Follow-ups (Optional, Future Patches)
- **Lore copy updates:** System files (10_ui_town_shop.js, etc.) could emit more lore-flavored display text
- **Icon layer:** Small SVG icons next to ledger/notice/contract/archive headings
- **Flavor cards:** Optional lore-text cards in Revisit routes (already seed data exists)
- **Responsive refinement:** Further polish of 480px and below layouts

### Long-term (v1.25+)
- **Revisit memory UI:** Already supports lore themes; could enhance with custom styling
- **Character name/title:** Add "Adventurer Record" with name display (if name system added)
- **Boss name theming:** "Boss Trophy Record: [BossName]" display
- **Seasonal themes:** Switch card colors/borders based on "season" or difficulty tier

---

## Notes for Johnny

This patch is **isolated from gameplay logic**. You can:
- Merge it immediately without affecting active systems
- Keep the rewrite in `v1.24.0-lore-layer-interface-shell` label while finalizing systems
- Continue adding systems (43, 44, etc.) without breaking this layer
- Use it as the visual foundation for future lore-heavy patches

The `.ddx-*` class layer is **open for expansion**. Feel free to:
- Add more specific subclasses (e.g., `.ddx-legendary-card`, `.ddx-sealed-lane`)
- Extend color themes if new card types emerge
- Refine mobile breakpoints based on real-world testing
- Swap class names (the system files don't reference them)

All existing smoke tests and gameplay validation should pass unchanged. 🎯

---

## File Sizes

- **index.html** – 25 KB (was 18 KB; added semantic classes & comments)
- **app.js** – 6.4 KB (unchanged; build version bumped)
- **styles_lore_layer.css** – 11 KB (new; gzips to ~4 KB)
- **Total addition:** ~13 KB (download overhead minimal; heavily gzips)

---

**Status:** ✅ Ready to integrate into `/rewrite` branch
