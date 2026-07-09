'use strict';

// v1.23.3 Famous Gear Memory flavor pack.
// Text-only: expands archive-memory copy without changing combat, rewards,
// economy, Talent, debt, gear stats, or dungeon progression.
(function() {
	if (window.DDFamousGearMemoryFlavorPack) return;
	window.DDFamousGearMemoryFlavorPack = true;

	function obj(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }

	function clean(value, fallback = '') {
		const raw = String(value || fallback || '').trim();
		if (typeof window.cleanDisplayText === 'function') return window.cleanDisplayText(raw, fallback);
		return raw || fallback;
	}

	function hashText(value) {
		const text = String(value || 'famous-gear-memory');
		let hash = 0;
		for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
		return Math.abs(hash);
	}

	function pick(pool, seed, fallback = '') {
		const list = Array.isArray(pool) ? pool.filter(Boolean) : [];
		if (!list.length) return fallback;
		return list[hashText(seed) % list.length] || fallback;
	}

	function itemFrom(source) { return obj(source?.item); }

	function recordKey(source) {
		const item = itemFrom(source);
		return clean(source?.recordId || source?.id || source?.itemId || item.id || source?.itemName || item.name || 'famous-gear-memory', 'famous-gear-memory');
	}

	function itemName(source) {
		const item = itemFrom(source);
		return clean(source?.itemName || source?.gearName || item.name || 'Famous Gear', 'Famous Gear');
	}

	function itemSlot(source) {
		const item = itemFrom(source);
		return clean(source?.slot || item.slot || 'gear', 'gear').toLowerCase();
	}

	function itemRarity(source) {
		const item = itemFrom(source);
		return clean(source?.rarity || item.rarity || 'common', 'common').toLowerCase();
	}

	function archiveSource(source) {
		return clean(source?.sourceLabel || source?.source || 'Retired Gear Archive', 'Retired Gear Archive');
	}

	function archiveNote(source) {
		const item = itemFrom(source);
		return clean(source?.note || source?.summary || item.summary || '', '');
	}

	function slotLine(slot) {
		if (/weapon|blade|sword|axe|mace|staff|bow|wand/i.test(slot)) return 'Its edge remembers timing, not damage.';
		if (/helm|head|crown|mask/i.test(slot)) return 'The old helm keeps the shape of the last hard choice.';
		if (/chest|armor|mail|robe|plate/i.test(slot)) return 'The armor remembers pressure without returning protection.';
		if (/ring|amulet|charm|trinket|neck/i.test(slot)) return 'The small relic hums once, then goes quiet again.';
		if (/boot|feet|greave/i.test(slot)) return 'Its old steps point toward the archive shelf, not a new road.';
		if (/glove|hand|gauntlet/i.test(slot)) return 'The grip remembers discipline, then releases it.';
		return 'The retired record answers as memory, not equipment.';
	}

	function rarityLine(rarity) {
		if (/mythic/i.test(rarity)) return 'The mythic note is loud, but still safely sealed.';
		if (/legendary/i.test(rarity)) return 'The legendary tag glows like a label under glass.';
		if (/epic/i.test(rarity)) return 'The epic mark throws a brief ember across the shelf.';
		if (/rare/i.test(rarity)) return 'The rare mark catches enough light to be remembered.';
		if (/uncommon/i.test(rarity)) return 'The uncommon stamp stays neat and legible.';
		return 'The common record holds because it was used, not because it was powerful.';
	}

	function safeFlavor(source) {
		const name = itemName(source);
		const slot = itemSlot(source);
		const rarity = itemRarity(source);
		const archive = archiveSource(source);
		const note = archiveNote(source);
		const seed = `${recordKey(source)}:${name}:${slot}:${rarity}`;
		const openers = [
			`${name} wakes as an archive memory, not a returned item.`,
			`${name} gives the shelf a small, clean answer.`,
			`${name} remembers the run that retired it, then stays retired.`,
			`${name} opens like a page from the old kit log.`
		];
		const closers = [
			'No stats move. No reward path opens. The memory simply becomes readable.',
			'The item remains retired, and the dungeon math stays untouched.',
			'The archive keeps the shape of the story without handing back power.',
			'It leaves a record in town and nothing extra in combat.'
		];
		return {
			memoryTitle: `${name} Memory`,
			summaryLine: `${name} rests as a ${rarity} ${slot} record from ${archive}.`,
			reflection: `${pick(openers, seed)} ${rarityLine(rarity)} ${slotLine(slot)} ${pick(closers, `${seed}:close`)}${note ? ` Archive note: ${note}` : ''}`
		};
	}

	function hydrateActiveMemory(state) {
		const active = obj(state?.player?.revisitState?.famousGear?.active);
		if (!Object.keys(active).length) return false;
		const flavor = safeFlavor(active);
		active.memoryTitle = flavor.memoryTitle;
		active.summaryLine = flavor.summaryLine;
		active.reflection = flavor.reflection;
		active.flavorPack = 'v1.23.3-guild-journal-memory-board';
		return true;
	}

	function hydrateLastResult(state) {
		const result = obj(state?.player?.revisitState?.famousGear?.lastResult);
		if (!Object.keys(result).length) return false;
		const flavor = safeFlavor(result);
		result.memoryTitle = flavor.memoryTitle;
		result.reflection = flavor.reflection;
		result.flavorPack = 'v1.23.3-guild-journal-memory-board';
		return true;
	}

	function patchApi(attempts = 0) {
		const api = window.DungeonDexEliteContracts;
		if (!api || typeof api !== 'object' || typeof api.startFamousGear !== 'function' || typeof api.completeFamousGear !== 'function') {
			if (attempts < 40) window.setTimeout(function() { patchApi(attempts + 1); }, 100);
			return false;
		}
		if (api.__famousGearFlavorPack1232) return true;
		const originalStart = api.startFamousGear.bind(api);
		const originalComplete = api.completeFamousGear.bind(api);
		api.startFamousGear = function startFamousGearWithFlavor(state) {
			const result = originalStart(state);
			if (result) hydrateActiveMemory(state || window.S || {});
			return result;
		};
		api.completeFamousGear = function completeFamousGearWithFlavor(state) {
			const result = originalComplete(state);
			if (result) hydrateLastResult(state || window.S || {});
			return result;
		};
		api.famousGearFlavorPreview = function famousGearFlavorPreview(source) {
			return safeFlavor(source || {});
		};
		api.__famousGearFlavorPack1232 = true;
		return true;
	}

	patchApi(0);
})();