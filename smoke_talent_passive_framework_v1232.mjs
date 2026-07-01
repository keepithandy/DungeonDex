#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const SYSTEM_FILES = [
  './js/systems/19_warden_talents_lowfire_board.js',
  './js/systems/32_talent_award_claim_repair_contract.js',
  './js/systems/33_talent_hunter_board_clarity_spend.js',
  './js/systems/30_passive_activation_gate_hotfix.js'
];

function numberOr(value, fallback = 0, min = -Infinity, max = Infinity) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : fallback;
  return Math.max(min, Math.min(max, safe));
}

function createContext() {
  const context = {
    console,
    setTimeout(fn) {
      if (typeof fn === 'function') fn();
      return 0;
    },
    clearTimeout() {},
    addEventListener() {},
    document: {
      getElementById() { return null; },
      createElement() { return { id: '', textContent: '' }; },
      head: { appendChild() {} }
    },
    numberOr,
    asArray(value, fallback = []) {
      return Array.isArray(value) ? value : fallback;
    },
    escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
    },
    format(value) {
      return String(Math.round(Number(value) || 0));
    },
    coins(gold = 0, silver = 0, copper = 0) {
      return Math.max(0, Math.round((Number(gold) || 0) * 10000 + (Number(silver) || 0) * 100 + (Number(copper) || 0)));
    },
    formatMoney(value) {
      return `${Math.max(0, Math.floor(Number(value) || 0))}c`;
    },
    cleanDisplayText(value, fallback = '') {
      return String(value || fallback || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  };
  context.window = context;
  context.globalThis = context;
  return vm.createContext(context);
}

function baseTalentState() {
  return {
    player: {
      talentLedger: {
        version: 1,
        unlocked: false,
        previewOnly: true,
        lifetimePoints: 1,
        availablePoints: 1,
        spentPoints: 0,
        earnedSources: [{ sourceId: 'boss_depth_milestone', points: 1 }],
        awardClaims: {},
        notes: []
      },
      talentLearnedIds: {},
      talentUnlockIds: [],
      talents: { unlocked: {}, spent: {}, unlockedIds: [] },
      talentEarning: {
        enabled: true,
        sourceId: 'boss_depth_milestone',
        milestonesReached: { first_boss: true },
        pointsAwarded: 1
      }
    }
  };
}

async function loadRuntime() {
  const context = createContext();
  for (const file of SYSTEM_FILES) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  return context;
}

const context = await loadRuntime();
const api = context.DungeonDexTalents;
function vmValue(value) {
  return vm.runInContext(`(${JSON.stringify(value)})`, context);
}

assert.equal(typeof api?.passiveInventory, 'function');
assert.equal(typeof api?.passiveContract, 'function');
assert.equal(typeof api?.applyHunterBoardClaritySpend, 'function');
assert.equal(typeof api?.talentAwardMutationPreview, 'function');
assert.equal(typeof api?.talentPassiveActivationGateDryRun, 'function');

const inventoryState = vmValue(baseTalentState());
const inventoryBefore = JSON.stringify(inventoryState);
const inventory = api.passiveInventory(inventoryState);
assert.equal(JSON.stringify(inventoryState), inventoryBefore, 'passive inventory must be read-only');
assert.equal(inventory.nodes.length, 13);
assert.equal(inventory.summary.total, 13);
assert.equal(inventory.summary.complete_copy_only, 1);
assert.equal(inventory.summary.complete_inactive_guarded, 1);
assert.equal(inventory.summary.placeholder, 11);
assert.equal(inventory.summary.appliesEffect, 0);
assert.equal(inventory.summary.liveRendererWired, 0);
assert.ok(inventory.nodes.every(node => [
  'nodeKey',
  'displayName',
  'branchId',
  'tier',
  'statusClassification',
  'appearsInUi',
  'previewable',
  'learned',
  'spendPathAvailable',
  'spendable',
  'passiveReady',
  'passiveEnabled',
  'appliesEffect',
  'appliesCopyEffect',
  'liveRendererWired',
  'contractHelperStatus',
  'rendererHelperStatus',
  'inactiveReason',
  'sourceData'
].every(field => Object.prototype.hasOwnProperty.call(node, field))));

const placeholder = api.passiveContract(inventoryState, 'survivor_sturdy_start');
assert.equal(placeholder.statusClassification, 'placeholder');
assert.equal(placeholder.passiveReady, false);
assert.equal(placeholder.passiveEnabled, false);
assert.equal(placeholder.appliesEffect, false);
assert.equal(placeholder.liveRendererWired, false);
assert.equal(placeholder.rendererHelperStatus, 'none');

const spendState = vmValue(baseTalentState());
const spendPreviewBefore = JSON.stringify(spendState);
const spendPreview = api.hunterBoardClaritySpendPreview(spendState);
assert.equal(JSON.stringify(spendState), spendPreviewBefore, 'spend preview must be read-only');
assert.equal(spendPreview.eligible, true);
assert.equal(spendPreview.mutatesSave, false);
const spend = api.applyHunterBoardClaritySpend(spendState);
assert.equal(spend.ok, true);
assert.equal(spend.availableBefore, 1);
assert.equal(spend.availableAfter, 0);
assert.equal(spend.spentAfter, 1);
assert.equal(spendState.player.talentLearnedIds.hunter_board_clarity, true);
const duplicate = api.applyHunterBoardClaritySpend(spendState);
assert.equal(duplicate.ok, false);
assert.equal(duplicate.blockedReason, 'already_learned');
assert.equal(duplicate.spendsPoints, false);

const learnedHunter = api.passiveContract(spendState, 'hunter_board_clarity');
assert.equal(learnedHunter.statusClassification, 'complete_copy_only');
assert.equal(learnedHunter.learned, true);
assert.equal(learnedHunter.passiveReady, true);
assert.equal(learnedHunter.passiveEnabled, true);
assert.equal(learnedHunter.appliesEffect, false);
assert.equal(learnedHunter.appliesCopyEffect, true);
assert.equal(learnedHunter.liveRendererWired, true);
assert.equal(learnedHunter.copyOnly, true);

const debtState = vmValue(baseTalentState());
debtState.player.talentLearnedIds = { debt_collector_clarity: true };
debtState.player.talentUnlockIds = ['debt_collector_clarity'];
const learnedDebt = api.passiveContract(debtState, 'debt_collector_clarity');
assert.equal(learnedDebt.statusClassification, 'complete_inactive_guarded');
assert.equal(learnedDebt.learned, true);
assert.equal(learnedDebt.passiveReady, true);
assert.equal(learnedDebt.passiveEnabled, false);
assert.equal(learnedDebt.liveRendererWired, false);
assert.equal(learnedDebt.appliesEffect, false);
assert.equal(learnedDebt.guarded, true);
assert.equal(learnedDebt.rendererHelperStatus, 'copy_model_only_not_live');

const debtSource = vmValue({
  statusLabel: 'Debt Active',
  balanceLabel: 'Owed 12 coin',
  pressureLabel: 'Pressure 2',
  termsLabel: 'Due on return',
  reminderLabel: 'Bring coin.',
  balanceCopper: 1200,
  pressure: 2
});
const debtSourceBefore = JSON.stringify(debtSource);
const debtCopy = api.applyDebtCollectorClarityCopy(debtState, debtSource);
assert.equal(JSON.stringify(debtSource), debtSourceBefore, 'Debt copy helper must not mutate source');
assert.equal(debtCopy.passiveSurface, 'Debt Collector copy-model preview only');
assert.equal(debtCopy.passiveApplied, false);
assert.equal(debtCopy.copyModelApplied, true);
assert.equal(debtCopy.copyModelRendererWired, true);
assert.equal(debtCopy.previewOnly, true);
assert.equal(debtCopy.liveRendererWired, false);
assert.equal(debtCopy.balanceCopper, 1200);
assert.equal(debtCopy.pressure, 2);

const awardState = vmValue({
  player: {
    bossTrophies: ['ashen_wyrm'],
    bossTrophyRecords: [],
    talentLedger: { awardClaims: {} }
  }
});
const awardBefore = JSON.stringify(awardState);
const awardPreview = api.talentAwardMutationPreview(awardState);
assert.equal(JSON.stringify(awardState), awardBefore, 'award preview must be read-only');
assert.equal(awardPreview.eligible, true);
assert.equal(awardPreview.wouldAwardPoints, true);
assert.equal(awardPreview.awardsPoints, false);
assert.equal(awardPreview.mutatesSave, false);
const awardApply = api.applyTalentAwardMutation(awardState, { liveGate: true });
assert.equal(awardApply.ok, true);
assert.equal(awardState.player.talentLedger.lifetimePoints, 1);
assert.equal(awardState.player.talentLedger.availablePoints, 1);
const awardDuplicateBefore = JSON.stringify(awardState);
const awardDuplicate = api.applyTalentAwardMutation(awardState, { liveGate: true });
assert.equal(awardDuplicate.ok, false);
assert.equal(awardDuplicate.blockedReason, 'already_claimed');
assert.equal(JSON.stringify(awardState), awardDuplicateBefore, 'duplicate award must not mutate');

const gate = api.talentPassiveActivationGateDryRun(spendState);
assert.equal(gate.passives.length, 13);
assert.equal(gate.canActivateAnyNow, false);
assert.equal(gate.mutatesSave, false);
assert.equal(gate.appliesGameplayEffect, false);
assert.equal(gate.hotfixVerified, true);
assert.equal(gate.debtCollectorRendererWired, false);
const gateHunter = gate.passives.find(entry => entry.nodeKey === 'hunter_board_clarity');
const gateDebt = gate.passives.find(entry => entry.nodeKey === 'debt_collector_clarity');
assert.equal(gateHunter.passiveEnabled, true);
assert.equal(gateHunter.liveRendererWired, true);
assert.equal(gateHunter.canActivateNow, false);
assert.equal(gateDebt.passiveReady, false);
assert.equal(gateDebt.passiveEnabled, false);
assert.equal(gateDebt.liveRendererWired, false);
assert.equal(gateDebt.canActivateNow, false);
assert.ok(gate.passives.filter(entry => entry.classification === 'placeholder').every(entry => entry.liveRendererWired === false && entry.canActivateNow === false));

console.log('PASS: talent passive framework smoke v1.23.2');
