# DungeonDex Lore-Layer Class Reference

Quick reference for the new `.ddx-*` semantic and styling classes introduced in v1.24.0.

## Class Hierarchy

### Layout & Containment
```
.ddx-shell                 Main app container
├── .ddx-guild-header      Header with build info
├── .ddx-nav-guild-bar     5-tab navigation
└── .ddx-main-viewport     Main content area
    └── .ddx-region        Screen region (town, run, gear, dex, archive)
        └── .ddx-view-stack Vertical stack of panels
```

### Card Type Classes (Inherit from .panel)

#### Guild Records (Gold/Orange Theme)
- `.ddx-ledger-card` – Base ledger styling
- `.ddx-guild-ledger` – Town header / Guild status
- `.ddx-gear-player-ledger` – Player gear status
- `.ddx-archive-summary` – Trophy hall summary
- `.ddx-settings-ledger` – Archive settings

#### Town Notices (Tan/Cream Theme)
- `.ddx-notice-board` – Base notice board
- `.ddx-quest-board` – Town contract board

#### Contracts (Purple/Violet Theme)
- `.ddx-contract-card` – Base contract styling
- `.ddx-dungeon-writ` – Dungeon entry status
- `.ddx-debt-card` – Debt pressure display

#### Merchant & Crafting (Green/Emerald Theme)
- `.ddx-merchant-card` – Base merchant styling
- `.ddx-merchant-ledger` – Shop / merchant goods
- `.ddx-forge-counter` – Crafting / upgrade counter
- `.ddx-gear-summary` – Upgrade receipt
- `.ddx-equipment-ledger` – Equipment loadout

#### Archive & Records (Blue Theme)
- `.ddx-archive-card` – Base archive styling
- `.ddx-combat-record` – Combat log records
- `.ddx-monster-archive` – Monster bestiary
- `.ddx-gear-trophy-archive` – Retired gear records
- `.ddx-filter-record` – Inventory filters

#### Journal & Memory (Purple/Lavender Theme)
- `.ddx-journal-card` – Base journal styling
- `.ddx-guild-journal` – Guild journal entries

### Semantic Content Classes

#### Record Structure
- `.ddx-record-title` – Title section wrapper
- `.ddx-record-name` – Primary heading (h2, h3)
- `.ddx-record-meta` – Metadata / flavor text
- `.ddx-record-body` – Body content

#### Actions & UI Elements
- `.ddx-action-row` – Horizontal action buttons
- `.ddx-action-strip` – Footer action strip (sticky)
- `.ddx-wallet-slot` – Currency display
- `.ddx-revisit-slot` – Revisit foundation display
- `.ddx-charter-display` – Charter/depth display
- `.ddx-cost-indicator` – Cost chips (rest, upgrades)

#### Semantic Modifiers
- `.ddx-muted-lore` – Flavor text (muted color/style)
- `.ddx-locked-lore` – Locked/unavailable (struck-through)
- `.ddx-danger-note` – Warning/danger text
- `.ddx-reward-note` – Success/reward text

### Region-Specific Classes
- `.ddx-region-town` – Town screen
- `.ddx-region-run` – Dungeon run screen
- `.ddx-region-gear` – Gear Hall screen
- `.ddx-region-dex` – Archive/Trophy Hall screen
- `.ddx-region-archive` – Guild Journal screen

### Grouping Classes
- `.ddx-merchant-pair` – Two-column merchant+forge layout (applies to `.grid-2`)

### Navigation & Headers
- `.ddx-nav-guild-bar` – Primary navigation tabs
- `.ddx-guild-header` – Top header
- `.ddx-header-title-slot` – Title area
- `.ddx-lore-kicker` – Lore-framed label/kicker

---

## Usage Examples

### Town Header (Guild Ledger)
```html
<header class="panel section-header ddx-ledger-card ddx-guild-ledger">
  <div class="ddx-record-title">
    <h2 id="districtName" class="ddx-record-name">Lowfire District</h2>
    <p id="districtLine" class="ddx-record-meta">Lowfire holds the line.</p>
  </div>
  <div class="inline-actions ddx-action-row">
    <button class="primary" id="startRunBtn">Enter Dungeon</button>
    <button class="ghost" id="restBtn">Rest</button>
    <span class="rest-cost-chip ddx-cost-indicator">Cost --</span>
  </div>
</header>
```

### Merchant Pair (Ledger + Forge)
```html
<div class="grid-2 ddx-merchant-pair">
  <section class="panel ddx-merchant-card ddx-merchant-ledger" id="merchantPanel">
    <!-- Merchant goods -->
  </section>
  <section class="panel ddx-merchant-card ddx-forge-counter" id="forgePanel">
    <!-- Forge/crafting -->
  </section>
</div>
```

### Combat Record (Archive)
```html
<section class="panel ddx-archive-card ddx-combat-record" id="combatLog">
  <div class="ddx-record-body">
    <!-- Combat log entries -->
  </div>
</section>
```

### Debt Pressure (Contract Card)
```html
<section class="panel ddx-contract-card ddx-debt-card" id="debtCollectorPanel">
  <!-- Debt status -->
</section>
```

---

## Color Themes

| Theme | Hex | Usage | Classes |
|-------|-----|-------|---------|
| **Gold/Orange** | `#f6d9a1`, `#ffc480` | Guild, Dungeon, Forge | `.ddx-guild-ledger`, `.ddx-dungeon-writ`, `.ddx-forge-counter` |
| **Green/Emerald** | `#a8f0b3` | Merchant, Equipment, Gear | `.ddx-merchant-ledger`, `.ddx-equipment-ledger`, `.ddx-gear-trophy-archive` |
| **Blue** | `#66c8ff` | Archive, Records | `.ddx-archive-card`, `.ddx-monster-archive` |
| **Purple/Lavender** | `#d9a8ff` | Journal, Memory | `.ddx-guild-journal` |
| **Red** | `#ff7878` | Monster Archive | `.ddx-monster-archive` |

---

## Responsive Breakpoints

- **Desktop:** Full layout, 2-column merchant pair
- **Tablet (≤700px):** Adjusted header, responsive tabs
- **Mobile (≤480px):** Compact mode, single-column, minimal padding

---

## No Changes To
- ID selectors (e.g., `#startRunBtn`, `#combatPanel`, `#inventoryPanel`)
- Data attributes (e.g., `data-screen`, `data-action`, `data-start-revisit`)
- Existing `.panel`, `.tab`, `.button` styling
- Combat, reward, save, or dungeon logic
- Gameplay mechanics or balance

---

## Integration Tips

### Adding New Content
When adding new sections to a screen:

1. **Determine card type:** Is it a ledger, notice, contract, merchant, archive, or journal?
2. **Apply base class:** `.ddx-ledger-card`, `.ddx-notice-board`, etc.
3. **Optional specialized:** Add subclass like `.ddx-guild-ledger` for theme override
4. **Use semantic wrappers:** `.ddx-record-title`, `.ddx-record-meta`, `.ddx-record-body`
5. **Preserve IDs/data:** Keep all existing selectors and attributes

### Updating Flavor Text
- Use `.ddx-record-meta` for metadata descriptions
- Use `.ddx-muted-lore` for light flavor text
- Use `.ddx-locked-lore` for unavailable/sealed content
- Use `.ddx-danger-note` for warnings
- Use `.ddx-reward-note` for success/gains

---

## CSS Customization

All lore-layer styles live in `styles_lore_layer.css`. Key customization points:

- **Border colors:** Edit `border-color: rgba(...)` per card type
- **Theme colors:** Update `color: #xxxx` values for h3/strong text
- **Gradients:** Modify `background: linear-gradient(...)` for card fills
- **Responsive:** Adjust breakpoints in `@media (max-width: ...)`

Do not override `.panel`, `.tab`, `.button` base styles in this file; keep it as a pure layer.
