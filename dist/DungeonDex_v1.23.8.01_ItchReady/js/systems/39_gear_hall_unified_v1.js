'use strict';

/**
 * Gear Hall v1: Unified gear view
 * 
 * Replaces: 11_ui_run_gear_dex_archive.js tab switching
 * 
 * Single vertical flow:
 * 1. Equipped now (can unequip)
 * 2. In backpack (can equip)
 * 3. Retired gear (locked, shows kill stats)
 * 4. Famous gear (trophy view, locked)
 * 
 * No internal tabs. Scrolling reveals context.
 */

(function() {
	if (window.DD_GEAR_HALL_V1) return;
	window.DD_GEAR_HALL_V1 = true;

	const DOMReady = (fn) => {
		if (document.readyState !== 'loading') fn();
		else document.addEventListener('DOMContentLoaded', fn);
	};

	function buildGearHall() {
		const container = document.getElementById('gear');
		if (!container) return;

		// Get current state
		const state = window.gameState || window.G || {};
		const player = state.player || {};
		const equipped = player.equipment || {};
		const inventory = player.inventory || [];
		const retiredGear = state.retiredGear || [];
		const famousGear = state.famousGear || [];

		let html = `
      <div style="padding: 12px; background: #06070a;">
        <!-- EQUIPPED -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(240,234,222,0.50); margin-bottom: 12px; font-family: var(--font);">Equipped now</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
    `;

		// Equipped items
		Object.entries(equipped).forEach(([slot, item]) => {
			if (item) {
				html += renderGearItem(item, true, true);
			}
		});

		html += `
          </div>
        </div>

        <!-- BACKPACK -->
        <div style="margin-bottom: 24px; padding-top: 12px; border-top: 1px solid rgba(255,162,70,0.12);">
          <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(240,234,222,0.50); margin-bottom: 12px; font-family: var(--font);">In backpack</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
    `;

		// Inventory items
		inventory.forEach(item => {
			html += renderGearItem(item, false, true);
		});

		if (inventory.length === 0) {
			html += `<div style="grid-column: 1 / -1; text-align: center; color: rgba(240,234,222,0.35); font-size: 0.8rem; padding: 20px;">Empty</div>`;
		}

		html += `
          </div>
        </div>

        <!-- RETIRED GEAR -->
        <div style="margin-bottom: 24px; padding-top: 12px; border-top: 1px solid rgba(255,162,70,0.12);">
          <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(240,234,222,0.50); margin-bottom: 12px; font-family: var(--font);">Retired gear</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
    `;

		// Retired gear
		retiredGear.forEach(item => {
			const memory = item.gearMemory || {};
			html += `
        <div style="padding: 10px; background: rgba(255,162,70,0.08); border: 1px solid rgba(255,162,70,0.15); border-radius: 4px; cursor: default; opacity: 0.75;">
          <div style="font-size: 0.8rem; font-weight: bold; color: ${getRarityColor(item.rarity)}; margin-bottom: 4px; font-family: var(--font);">${item.name}</div>
          <div style="font-size: 0.65rem; color: rgba(240,234,222,0.50); font-family: var(--font);">
            ${memory.kills ? `${memory.kills} kills<br/>` : ''}
            ${memory.bossKills ? `${memory.bossKills} boss kills` : ''}
          </div>
        </div>
      `;
		});

		if (retiredGear.length === 0) {
			html += `<div style="grid-column: 1 / -1; text-align: center; color: rgba(240,234,222,0.35); font-size: 0.8rem; padding: 20px;">No retired gear yet</div>`;
		}

		html += `
          </div>
        </div>

        <!-- FAMOUS GEAR (TROPHY) -->
        <div style="margin-bottom: 24px; padding-top: 12px; border-top: 1px solid rgba(255,162,70,0.12);">
          <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(240,234,222,0.50); margin-bottom: 12px; font-family: var(--font);">Famous gear (trophy)</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
    `;

		// Famous gear
		famousGear.forEach(item => {
			const memory = item.gearMemory || {};
			html += `
        <div style="padding: 10px; background: rgba(255,162,70,0.15); border: 2px solid rgba(255,162,70,0.35); border-radius: 4px; cursor: default;">
          <div style="font-size: 0.8rem; font-weight: bold; color: #ffa246; margin-bottom: 4px; font-family: var(--font);">${item.name}</div>
          <div style="font-size: 0.65rem; color: rgba(240,234,222,0.60); font-family: var(--font);">
            ${memory.title ? `<em>${memory.title}</em><br/>` : ''}
            ${memory.notes ? memory.notes.join(', ') : 'Legendary'}
          </div>
        </div>
      `;
		});

		if (famousGear.length === 0) {
			html += `<div style="grid-column: 1 / -1; text-align: center; color: rgba(240,234,222,0.35); font-size: 0.8rem; padding: 20px;">No famous gear yet</div>`;
		}

		html += `
          </div>
        </div>
      </div>
    `;

		container.innerHTML = html;
		attachGearHallListeners();
	}

	function renderGearItem(item, isEquipped, canInteract) {
		const memory = item.gearMemory || {};
		const rarity = item.rarity || 'common';
		const borderColor = isEquipped ? 'rgba(255,162,70,0.35)' : 'rgba(255,162,70,0.15)';
		const bgColor = isEquipped ? 'rgba(255,162,70,0.12)' : 'rgba(255,162,70,0.06)';

		return `
      <div class="ddx-gear-item" data-item-id="${item.id}" style="padding: 10px; background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
        <div style="font-size: 0.8rem; font-weight: bold; color: ${getRarityColor(rarity)}; margin-bottom: 4px; font-family: var(--font);">${item.name}</div>
        <div style="font-size: 0.65rem; color: rgba(240,234,222,0.50); font-family: var(--font); margin-bottom: 6px;">
          Lvl ${item.level || 1} • ${item.slot || 'item'}
        </div>
        <div style="font-size: 0.7rem; color: rgba(240,234,222,0.40); font-family: var(--font);">
          ${item.stats?.power ? `+${item.stats.power} PWR ` : ''}
          ${item.stats?.guard ? `+${item.stats.guard} GRD ` : ''}
          ${item.stats?.wit ? `+${item.stats.wit} WIT ` : ''}
        </div>
      </div>
    `;
	}

	function getRarityColor(rarity) {
		const colors = {
			'common': '#a8a8a8',
			'uncommon': '#a8f0b3',
			'rare': '#74b0ff',
			'epic': '#c083ff',
			'legendary': '#ffa246',
			'mythic': '#ff6b6b'
		};
		return colors[rarity] || '#a8a8a8';
	}

	function attachGearHallListeners() {
		document.querySelectorAll('.ddx-gear-item').forEach(el => {
			el.addEventListener('click', (e) => {
				const itemId = e.currentTarget.dataset.itemId;
				const state = window.gameState || window.G || {};

				// Try to toggle equip/unequip or show details
				if (window.toggleEquipItem) {
					window.toggleEquipItem(itemId);
				} else if (window.selectItem) {
					window.selectItem(itemId);
				}

				// Rebuild UI
				setTimeout(buildGearHall, 100);
			});
		});
	}

	// Watch for screen changes
	const originalSwitchScreen = window.switchScreen;
	window.switchScreen = function(screen) {
		if (originalSwitchScreen) originalSwitchScreen(screen);
		if (screen === 'gear') {
			setTimeout(buildGearHall, 50);
		}
	};

	// Initial build
	DOMReady(() => {
		buildGearHall();

		// Rebuild on state change
		setInterval(buildGearHall, 1000);
	});

})();