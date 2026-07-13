'use strict';

// v1.26.2 Revisit surface: Trophy Echo only.
// Revisit placement is owned by source renderers. This module does not move DOM
// nodes, observe mutations, or install timing placement loops. It narrows the
// player-facing Revisit surface and hard-gates public mutation paths to the one
// finished lane: Trophy Echo.
(function(){
	const DD_PUBLIC_REVISIT_ALLOWED_ROUTE = 'trophy_echo_route';
	const DD_PUBLIC_REVISIT_BLOCKED_ROUTES = Object.freeze([
		'famous_gear_route',
		'rival_trace_route',
		'debt_pressure_route',
		'board_echo_route'
	]);
	const DD_PUBLIC_REVISIT_BLOCKED_COMPLETERS = Object.freeze({
		completeFamousGearRoute: 'famous_gear_route',
		completeRivalTraceRoute: 'rival_trace_route',
		completeBoardEchoRoute: 'board_echo_route'
	});
	const H = value => typeof escapeHtml === 'function'
		? escapeHtml(value)
		: String(value ?? '').replace(/[&<>\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[c]));
	const C = (value, fallback = '') => typeof cleanDisplayText === 'function'
		? cleanDisplayText(value, fallback)
		: String(value || fallback || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
	const N = value => Math.max(0, Math.floor(Number(value) || 0));

	function trophyStatus(){
		const api = window.DungeonDexEliteContracts || {};
		return typeof api.trophyEchoStatus === 'function' ? api.trophyEchoStatus(S) : null;
	}

	function blockInactiveRoute(routeKey){
		return Object.freeze({
			ok: false,
			blocked: true,
			routeKey: String(routeKey || '').trim(),
			reason: 'DungeonDex v1.26.2 public Revisit surface only allows Trophy Echo.'
		});
	}

	function isPublicRevisitRoute(routeKey){
		return String(routeKey || '').trim() === DD_PUBLIC_REVISIT_ALLOWED_ROUTE;
	}

	function wrapPublicRevisitGate(name, allowedRouteKey){
		const original = window[name];
		if (typeof original !== 'function' || original.__ddPublicTrophyOnlyGate) return;
		const wrapped = function(state, routeKey){
			const safeRouteKey = String(routeKey || '').trim();
			if (safeRouteKey && safeRouteKey !== allowedRouteKey) return blockInactiveRoute(safeRouteKey);
			return original.apply(this, arguments);
		};
		wrapped.__ddPublicTrophyOnlyGate = true;
		wrapped.__ddPublicAllowedRouteKey = allowedRouteKey;
		try { window[name] = wrapped; } catch (_) {}
	}

	function wrapPublicCanStartGate(name, allowedRouteKey){
		const original = window[name];
		if (typeof original !== 'function' || original.__ddPublicTrophyOnlyGate) return;
		const wrapped = function(state, routeKey){
			const safeRouteKey = String(routeKey || '').trim();
			if (safeRouteKey && safeRouteKey !== allowedRouteKey) return false;
			return original.apply(this, arguments);
		};
		wrapped.__ddPublicTrophyOnlyGate = true;
		wrapped.__ddPublicAllowedRouteKey = allowedRouteKey;
		try { window[name] = wrapped; } catch (_) {}
	}

	function installBlockedCompleter(name, routeKey){
		const original = window[name];
		if (typeof original !== 'function' || original.__ddPublicTrophyOnlyBlock) return;
		const blocked = function(){
			return blockInactiveRoute(routeKey);
		};
		blocked.__ddPublicTrophyOnlyBlock = true;
		blocked.__ddPublicBlockedRouteKey = routeKey;
		blocked.__ddOriginalCompleter = original;
		try { window[name] = blocked; } catch (_) {}
	}

	function trophyOnlyRevisitMarkup(){
		const status = trophyStatus();
		const active = status?.activeEcho || null;
		const lastResult = status?.lastResult || null;
		const source = status?.source || active || null;
		const locked = !status || status.locked === true || status.available !== true;
		const bossName = C(source?.bossName || active?.bossName, 'Unknown Boss');
		const trophyName = C(source?.trophyName || active?.trophyName, 'Boss Trophy');
		const historyCount = N(status?.historyCount);
		const memoryMarks = N(status?.memoryMarks);
		const completedCount = N(status?.completedCount);
		const stateLabel = active ? 'Active' : locked ? 'Locked' : 'Playable';
		const cardClass = active ? 'active' : 'ready';
		const summaryLine = active
			? C(active.summaryLine || `${trophyName} stirs with a remembered weight.`, `${trophyName} stirs with a remembered weight.`)
			: locked
				? 'No boss echo is recorded yet. Defeat a boss and bring its trophy back to the board.'
				: `${bossName}'s record is ready to be revisited.`;
		const flavorLine = active
			? C(active.reflection || '', '')
			: locked
				? 'The board keeps one kind of memory: a boss trophy and the descent that earned it.'
				: `The ${trophyName} still remembers ${bossName}. Hear the echo in town before the next descent.`;
		const nextLine = active
			? 'Next: settle the active Trophy Echo in town.'
			: locked
				? 'Next: defeat a boss, earn a boss trophy or boss record, then return to this board.'
				: 'Next: start Trophy Echo from town; rewards stay memory-only.';
		const actionMarkup = active
			? '<button class="primary" type="button" data-complete-trophy-echo="1">Settle Echo</button>'
			: locked
				? '<button class="ghost" type="button" disabled aria-disabled="true">Trophy Echo Locked</button>'
				: '<button class="primary" type="button" data-start-revisit="trophy_echo_route">Start Trophy Echo</button>';
		const resultMarkup = lastResult
			? `<div class="small revisit-echo-result"><strong>Last Result:</strong> ${H(C(lastResult.summary || '', ''))}</div>`
			: '';

		return `
			<section class="panel revisit-foundation-panel revisit-trophy-echo-only" id="revisitPanel" aria-label="Trophy Echo Revisit panel">
				<div class="card-head">
					<div>
						<h2>Revisit</h2>
						<p>Trophy Echo is the only active Revisit lane for v1.26.2.</p>
					</div>
				</div>
				<article class="quest-card revisit-echo-card ${cardClass}">
					<div class="quest-topline">
						<strong>Trophy Echo</strong>
						<span class="small ${active ? '' : 'muted'}">${H(stateLabel)}</span>
					</div>
					<p class="small">${H(summaryLine)}</p>
					<p class="small muted">${H(flavorLine)}</p>
					<div class="small muted">Boss history ${historyCount} • Memory Marks ${memoryMarks} • Recorded echoes ${completedCount}</div>
					<div class="small muted">Trophy Echo is memory-only: no gear, coin, combat, debt, Talent, or dungeon-entry changes.</div>
					<div class="small muted">${H(nextLine)}</div>
					${active ? `<div class="small muted">Active Memory: ${H(C(active.memoryTitle || bossName, bossName))}</div>` : ''}
					<div class="inline-actions revisit-echo-actions">
						${actionMarkup}
					</div>
					${resultMarkup}
				</article>
			</section>`;
	}

	function trophyOnlyRoutes(routes){
		return Array.isArray(routes) ? routes.filter(route => String(route?.key || '') === DD_PUBLIC_REVISIT_ALLOWED_ROUTE) : [];
	}

	function installTrophyOnlyApiFilter(){
		const api = window.DungeonDexEliteContracts || null;
		if (!api || api.__ddTrophyEchoOnlyApi) return;
		if (typeof api.revisitRoutePreviews === 'function') {
			const originalRoutePreviews = api.revisitRoutePreviews;
			api.revisitRoutePreviews = function(){
				return trophyOnlyRoutes(originalRoutePreviews.apply(this, arguments));
			};
		}
		if (typeof api.revisitRouteSummary === 'function') {
			api.revisitRouteSummary = function(state){
				const routes = trophyOnlyRoutes(typeof api.revisitRoutePreviews === 'function' ? api.revisitRoutePreviews(state) : []);
				const finishedRoutes = routes.filter(route => route.completed === true || route.active === true || route.playable === true);
				const unfinishedRoutes = routes.filter(route => route.completed !== true && route.active !== true && route.playable !== true);
				return {
					total: routes.length,
					finished: finishedRoutes.length,
					unfinished: unfinishedRoutes.length,
					planned: 0,
					active: routes.filter(route => route.active === true).length,
					playable: routes.filter(route => route.playable === true).length,
					future: 0,
					locked: routes.filter(route => route.locked).length,
					finishedRoutes,
					unfinishedRoutes
				};
			};
		}
		api.__ddTrophyEchoOnlyApi = true;
	}

	function installPublicRevisitMutationGate(){
		wrapPublicCanStartGate('canStartRevisitRoute', DD_PUBLIC_REVISIT_ALLOWED_ROUTE);
		wrapPublicCanStartGate('canEnterRevisitRoute', DD_PUBLIC_REVISIT_ALLOWED_ROUTE);
		wrapPublicRevisitGate('startRevisitRoute', DD_PUBLIC_REVISIT_ALLOWED_ROUTE);
		Object.keys(DD_PUBLIC_REVISIT_BLOCKED_COMPLETERS).forEach(name => {
			installBlockedCompleter(name, DD_PUBLIC_REVISIT_BLOCKED_COMPLETERS[name]);
		});
		const api = window.DungeonDexEliteContracts || null;
		if (api && typeof api === 'object') {
			api.__publicRevisitSurface = 'trophy-echo-only';
			api.__publicRevisitAllowedRouteKey = DD_PUBLIC_REVISIT_ALLOWED_ROUTE;
			api.__publicRevisitBlockedRouteKeys = DD_PUBLIC_REVISIT_BLOCKED_ROUTES.slice();
			api.startFamousGear = () => blockInactiveRoute('famous_gear_route');
			api.startRivalTrace = () => blockInactiveRoute('rival_trace_route');
			api.startBoardEcho = () => blockInactiveRoute('board_echo_route');
			api.completeFamousGear = () => blockInactiveRoute('famous_gear_route');
			api.completeRivalTrace = () => blockInactiveRoute('rival_trace_route');
			api.completeBoardEcho = () => blockInactiveRoute('board_echo_route');
		}
		window.DDPublicRevisitTrophyOnlyGate = {
			allowedRouteKey: DD_PUBLIC_REVISIT_ALLOWED_ROUTE,
			blockedRouteKeys: DD_PUBLIC_REVISIT_BLOCKED_ROUTES.slice(),
			blockInactiveRoute,
			isPublicRevisitRoute
		};
	}

	function installTrophyOnlyRevisitSurface(){
		try { earlierDungeonRevisitMarkup = trophyOnlyRevisitMarkup; } catch(_) {}
		window.earlierDungeonRevisitMarkup = trophyOnlyRevisitMarkup;
		installTrophyOnlyApiFilter();
		installPublicRevisitMutationGate();
		window.__dungeondexRevisitSourceRendered = true;
		window.__dungeondexRevisitTrophyEchoOnly = true;
	}

	installTrophyOnlyRevisitSurface();
})();
