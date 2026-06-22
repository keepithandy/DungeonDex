#!/usr/bin/env node
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const TARGET = 'hunter_board_clarity';

function safeInt(value){
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function hasLearned(state){
  const player = state?.player || {};
  return player.talentLearnedIds?.[TARGET] === true || (player.talentUnlockIds || []).includes(TARGET) || player.talents?.unlocked?.[TARGET] === true;
}

function basePreview(state, nodeKey){
  const resolved = String(nodeKey || '').trim();
  const ledger = state?.player?.talentLedger || {};
  const lifetimePoints = safeInt(ledger.lifetimePoints);
  const spentPoints = safeInt(ledger.spentPoints);
  const availablePoints = Math.min(safeInt(ledger.availablePoints), Math.max(0, lifetimePoints - spentPoints));
  const inspectable = !!state && typeof state === 'object' && !Array.isArray(state) && !!state.player && typeof state.player === 'object' && !Array.isArray(state.player) && !!state.player.talentLedger && typeof state.player.talentLedger === 'object' && !Array.isArray(state.player.talentLedger);
  const alreadyLearned = hasLearned(state);
  let blockedReason = 'malformed_state';
  if (inspectable) {
    if (resolved !== TARGET) blockedReason = 'unknown_node';
    else if (alreadyLearned) blockedReason = 'already_learned';
    else if (availablePoints < 1) blockedReason = 'insufficient_points';
    else blockedReason = 'ready';
  }
  const eligible = inspectable && resolved === TARGET && !alreadyLearned && availablePoints >= 1;
  return {
    nodeKey: resolved,
    label: 'Hunter Board Clarity',
    status: 'spend_preview',
    eligible,
    blockedReason,
    cost: resolved === TARGET ? 1 : 0,
    availablePoints,
    lifetimePoints,
    spentPoints,
    alreadyLearned,
    wouldSpendPoints: eligible,
    wouldLearnNode: eligible,
    wouldEnablePassive: eligible,
    mutatesSave: false,
    spendsPoints: false,
    learnsNode: false,
    requiresLiveSpendPatch: true,
    notes: eligible ? ['Preview only. No spend is applied.'] : []
  };
}

function createApi(){
  return {
    talentSpendPreview: basePreview,
    talentSpendPreviewSummary(state, nodeKey){
      return { ...basePreview(state, nodeKey) };
    },
    hunterBoardClaritySpendPreview(state){
      return basePreview(state, TARGET);
    },
    hunterBoardClaritySpendPreviewSummary(state){
      return basePreview(state, TARGET);
    },
    hunterBoardClarityPassiveContract(state){
      const learned = hasLearned(state);
      return {
        nodeKey: TARGET,
        learned,
        passiveReady: learned,
        passiveEnabled: learned,
        appliesEffect: false,
        liveRendererWired: learned,
        mutatesSave: false
      };
    }
  };
}

const source = await readFile(new URL('./js/systems/33_talent_hunter_board_clarity_spend.js', import.meta.url), 'utf8');
const api = createApi();
const context = {
  console,
  window: {
    DungeonDexTalents: api,
    DungeonDexWardenTalents: api,
    addEventListener(){},
    setTimeout(fn){ fn(); }
  }
};
context.globalThis = context.window;
vm.createContext(context);

function vmValue(value){
  return vm.runInContext('JSON.parse(' + JSON.stringify(JSON.stringify(value)) + ')', context);
}

function eligibleState(){
  return vmValue({
    player: {
      talentLedger: {
        version: 1,
        previewOnly: true,
        unlocked: false,
        lifetimePoints: 1,
        availablePoints: 1,
        spentPoints: 0,
        earnedSources: [{ sourceId: 'boss_depth_milestone', points: 1 }],
        awardClaims: {
          'boss_trophy_milestone:ashen_wyrm': {
            key: 'boss_trophy_milestone:ashen_wyrm',
            source: 'boss_trophy_milestone',
            sourceId: 'ashen_wyrm',
            amount: 1,
            claimedAt: '2026-06-21T12:00:00.000Z',
            version: 1
          }
        },
        notes: []
      },
      talentLearnedIds: {},
      talentUnlockIds: [],
      talents: { unlocked: {}, spent: {}, unlockedIds: [] }
    }
  });
}

vm.runInContext(source, context, { filename: '33_talent_hunter_board_clarity_spend.js' });

assert.equal(typeof api.applyHunterBoardClaritySpend, 'function');
assert.equal(typeof api.applyTalentSpendMutation, 'function');
assert.equal(typeof api.hunterBoardClaritySpendResultSummary, 'function');

const previewState = eligibleState();
const previewBefore = JSON.stringify(previewState);
const preview = api.hunterBoardClaritySpendPreview(previewState);
assert.equal(preview.eligible, true);
assert.equal(preview.requiresLiveSpendPatch, false);
assert.equal(preview.liveSpendPatchReady, true);
assert.equal(JSON.stringify(previewState), previewBefore);

const spendState = eligibleState();
const result = api.applyHunterBoardClaritySpend(spendState);
assert.equal(result.ok, true);
assert.equal(result.mutatesSave, true);
assert.equal(result.spendsPoints, true);
assert.equal(result.learnsNode, true);
assert.equal(result.availableBefore, 1);
assert.equal(result.availableAfter, 0);
assert.equal(result.spentBefore, 0);
assert.equal(result.spentAfter, 1);
assert.equal(spendState.player.talentLedger.lifetimePoints, 1);
assert.equal(spendState.player.talentLedger.availablePoints, 0);
assert.equal(spendState.player.talentLedger.spentPoints, 1);
assert.equal(spendState.player.talentLearnedIds[TARGET], true);
assert.equal(spendState.player.talentUnlockIds.includes(TARGET), true);
assert.equal(spendState.player.talents.unlocked[TARGET], true);
assert.equal(result.affectsCombat, false);
assert.equal(result.affectsRewards, false);
assert.equal(result.affectsEconomy, false);
assert.equal(result.affectsDebt, false);
assert.equal(result.affectsRevisit, false);
assert.equal(result.unlockUiEnabled, false);
assert.equal(result.spendingUiEnabled, false);

const duplicateBefore = JSON.stringify(spendState);
const duplicate = api.applyHunterBoardClaritySpend(spendState);
assert.equal(duplicate.ok, false);
assert.equal(duplicate.blockedReason, 'already_learned');
assert.equal(JSON.stringify(spendState), duplicateBefore);

const noPoints = eligibleState();
noPoints.player.talentLedger.lifetimePoints = 1;
noPoints.player.talentLedger.availablePoints = 0;
noPoints.player.talentLedger.spentPoints = 0;
const noPointsBefore = JSON.stringify(noPoints);
const insufficient = api.applyHunterBoardClaritySpend(noPoints);
assert.equal(insufficient.ok, false);
assert.equal(insufficient.blockedReason, 'insufficient_points');
assert.equal(JSON.stringify(noPoints), noPointsBefore);

const malformed = vmValue({ player: { talentLedger: null } });
const malformedBefore = JSON.stringify(malformed);
const malformedResult = api.applyHunterBoardClaritySpend(malformed);
assert.equal(malformedResult.ok, false);
assert.equal(malformedResult.blockedReason, 'malformed_state');
assert.equal(JSON.stringify(malformed), malformedBefore);

const otherNode = api.applyTalentSpendMutation(eligibleState(), 'survivor_sturdy_start');
assert.equal(otherNode.ok, false);
assert.equal(otherNode.blockedReason, 'unknown_node');

const summary = api.hunterBoardClaritySpendResultSummary(result);
assert.equal(JSON.stringify(summary), JSON.stringify({
  ok: true,
  status: 'spent',
  blockedReason: '',
  nodeKey: TARGET,
  cost: 1,
  availableBefore: 1,
  availableAfter: 0,
  spentBefore: 0,
  spentAfter: 1,
  mutatesSave: true,
  spendsPoints: true,
  learnsNode: true,
  enablesPassive: true,
  unlockUiEnabled: false,
  spendingUiEnabled: false
}));

console.log('PASS: v1.20.48 controlled Hunter Board Clarity spend smoke');
