// DungeonDex v1.4.2 Sootveil Mythic Set runtime pointer.
// Runtime code now lives in ./js/systems/*.js and is loaded from index.html in numeric order.
// See ./js/systems/README.md for the system map.


// v1.4.2 Sootveil Mythic Set Pass
window.DD_MONSTER_ARCHETYPES = [
  "Brute","Ritualist","Skulker","Ashbound",
  "Mireborn","Furnace Spawn","Hollowed","Warden"
];

window.ddGetMonsterCue = function(name){
  const cues = [
    "The creature watches silently.",
    "Ash drifts from the enemy's armor.",
    "A hostile presence fills the chamber.",
    "The monster prepares to strike."
  ];
  return cues[Math.floor(Math.random()*cues.length)];
};


// v1.4.2 — Sootveil Mythic Set Pass
(function(){
  if (window.DD_IMPACT_142) return;
  window.DD_IMPACT_142 = true;

  function ddQueryAny(selectors){
    for (var i = 0; i < selectors.length; i++){
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  }

  function ddPulse(el, cls, ms){
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    window.setTimeout(function(){ el.classList.remove(cls); }, ms || 260);
  }

  window.ddImpactFeedback = function(kind){
    var stage = ddQueryAny([".combat-stage", ".monster-stage", ".encounter-stage", "#combatStage", "#monsterStage"]);
    var enemy = ddQueryAny([".enemy-card", ".monster-card", ".monster-portrait", ".enemy-combatant", "#enemyPanel"]);
    var player = ddQueryAny([".player-card", ".warden-card", ".hero-card", "#playerPanel"]);
    var reward = ddQueryAny([".reward-card", ".loot-card", ".run-event-card", "#rewardPanel"]);

    if (kind === "enemy-hit" || kind === "hit"){
      ddPulse(enemy || stage, "enemy-hit", 220);
      return;
    }
    if (kind === "player-hit" || kind === "hurt"){
      ddPulse(player || stage, "player-hit", 260);
      return;
    }
    if (kind === "heavy" || kind === "crit"){
      ddPulse(stage, "heavy-impact", 220);
      ddPulse(enemy || stage, "enemy-hit", 220);
      return;
    }
    if (kind === "elite"){
      ddPulse(stage, "elite-stinger", 520);
      return;
    }
    if (kind === "reward" || kind === "loot"){
      ddPulse(reward, "reward-reveal", 340);
      return;
    }
  };

  // Safe, optional audio stub. No autoplay loops; only short oscillator blips after user interaction.
  window.ddPlayImpactTone = function(kind){
    try{
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      window.__ddAudioCtx142 = window.__ddAudioCtx142 || new Ctx();
      var ctx = window.__ddAudioCtx142;
      if (ctx.state === "suspended") return;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      var freq = kind === "reward" ? 620 : kind === "hurt" ? 150 : kind === "elite" ? 220 : 330;
      osc.frequency.value = freq;
      osc.type = "triangle";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }catch(e){}
  };
})();
