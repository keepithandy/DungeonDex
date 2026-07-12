'use strict';

// Trophy Echo v1.1 completed-result detail polish.
// UI-only enhancement: reads existing Trophy Echo lastResult and expands the visible Town result block.
(function(){
  if (window.DDTrophyEchoResultDetail) return;

  function clean(value, fallback){
    var text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    return text || String(fallback || '').trim();
  }

  function escapeHtml(value){
    return clean(value, '').replace(/[&<>"']/g, function(ch){
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[ch] || ch;
    });
  }

  function numberOr(value, fallback){
    var num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function formatInt(value){
    var num = Math.max(0, Math.floor(numberOr(value, 0)));
    try { return num.toLocaleString(); }
    catch (err) { return String(num); }
  }

  function formatDate(value){
    var num = Math.max(0, Math.floor(numberOr(value, 0)));
    if (!num) return '';
    try { return new Date(num).toLocaleString(); }
    catch (err) { return ''; }
  }

  function trophyEchoResult(){
    var state = window.S || {};
    var player = state && typeof state === 'object' ? state.player || {} : {};
    var revisitState = player && typeof player === 'object' ? player.revisitState || {} : {};
    var trophyEcho = revisitState && typeof revisitState === 'object' ? revisitState.trophyEcho || {} : {};
    var result = trophyEcho && typeof trophyEcho === 'object' ? trophyEcho.lastResult : null;
    return result && typeof result === 'object' ? result : null;
  }

  function detailMarkup(result){
    var bossName = clean(result.bossName, 'Unknown Boss');
    var trophyName = clean(result.trophyName, 'Boss Trophy');
    var memoryTitle = clean(result.memoryTitle, bossName + ' Echo');
    var summary = clean(result.summary, bossName + ' settles into record.');
    var reflection = clean(result.reflection, 'The memory has been recorded in the Trophy Echo archive.');
    var recordId = clean(result.recordId || result.trophyId, '');
    var bestDepth = Math.max(0, Math.floor(numberOr(result.bestDepth, 0)));
    var rewardMark = Math.max(0, Math.floor(numberOr(result.rewardMark, 0)));
    var completedAt = formatDate(result.completedAt);
    var meta = [
      'Boss: ' + bossName,
      'Trophy: ' + trophyName
    ];
    if (bestDepth > 0) meta.push('Best depth: ' + formatInt(bestDepth));
    if (recordId) meta.push('Record: ' + recordId);
    meta.push(rewardMark > 0 ? 'Memory Mark recorded' : 'Memory Mark already recorded');
    if (completedAt) meta.push('Resolved: ' + completedAt);

    return [
      '<strong>Last Trophy Echo:</strong> ' + escapeHtml(memoryTitle),
      '<div class="small">' + escapeHtml(summary) + '</div>',
      '<div class="small muted">' + escapeHtml(meta.join(' • ')) + '</div>',
      '<div class="small muted">' + escapeHtml(reflection) + '</div>'
    ].join('');
  }

  function enhanceTrophyEchoResult(){
    var result = trophyEchoResult();
    if (!result) return false;
    var node = document.querySelector('.revisit-echo-card .revisit-echo-result');
    if (!node) return false;
    var hash = [result.completionKey, result.completedAt, result.summary, result.recordId, result.trophyId].map(function(part){
      return clean(part, '');
    }).join('|');
    if (node.getAttribute('data-dd-trophy-echo-v11') === hash) return true;
    node.setAttribute('data-dd-trophy-echo-v11', hash);
    node.innerHTML = detailMarkup(result);
    return true;
  }

  function scheduleEnhance(){
    if (scheduleEnhance.pending) return;
    scheduleEnhance.pending = true;
    window.requestAnimationFrame(function(){
      scheduleEnhance.pending = false;
      enhanceTrophyEchoResult();
    });
  }

  window.DDTrophyEchoResultDetail = {
    version: 1,
    enhance: enhanceTrophyEchoResult
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleEnhance);
  } else {
    scheduleEnhance();
  }

  window.setTimeout(scheduleEnhance, 120);
  window.setTimeout(scheduleEnhance, 500);
  window.setTimeout(scheduleEnhance, 1200);

  try {
    var observer = new MutationObserver(scheduleEnhance);
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  } catch (err) {}
})();
