#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildLegacyPayload,
  buildCompactPayload,
  loadJson,
  measureReduction,
  REFERENCE_PROJECTS,
  validatePhaseHandoff,
} from '../scripts/token-compact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/token-payload.json'), 'utf8'));

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function runNode(args) {
  return spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
  });
}

function testTokenReduction() {
  const result = measureReduction(fixture);
  assert.ok(result.reductionPercent >= 20, `expected >=20% reduction, got ${result.reductionPercent}%`);
  assert.ok(result.compactBytes < result.legacyBytes, 'compact payload must be smaller than legacy payload');
}

function testCompactionPreservesRequiredFields() {
  const compact = buildCompactPayload(fixture);
  assert.match(compact, /Implement CWM token optimization without changing command names\./);
  assert.match(compact, /Phase 2: compact phase handoff and verify payload reduction/);
  assert.match(compact, /## Blockers\n- None/);
  assert.equal(count(compact, 'Read PLAN.md, CONTEXT.md, and CHECKLIST.md before editing.'), 1);
  assert.equal(count(compact, 'Return only concise YAML summary to the parent context.'), 1);
}

function testReferenceDocumentation() {
  const compact = buildCompactPayload(fixture);
  assert.equal(REFERENCE_PROJECTS.caveman, 'https://github.com/JuliusBrussee/caveman');
  assert.equal(REFERENCE_PROJECTS.rtk, 'https://github.com/rtk-ai/rtk');
  assert.match(compact, /JuliusBrussee\/caveman/);
  assert.match(compact, /rtk-ai\/rtk/);
}

function testHandoffValidation() {
  const valid = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/valid-handoff.json'), 'utf8'));
  const invalid = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/invalid-handoff.json'), 'utf8'));
  assert.deepEqual(validatePhaseHandoff(valid), { ok: true, missing: [], invalid: [] });
  const invalidResult = validatePhaseHandoff(invalid);
  assert.equal(invalidResult.ok, false);
  assert.ok(invalidResult.invalid.includes('plan'));
  assert.ok(invalidResult.invalid.includes('blockers'));
  assert.ok(invalidResult.invalid.includes('phaseId'));
  assert.ok(invalidResult.invalid.includes('status'));

  const cliFail = runNode(['scripts/token-compact.mjs', 'validate-handoff', 'tests/fixtures/invalid-handoff.json']);
  assert.equal(cliFail.status, 1, `invalid handoff should exit 1, stderr=${cliFail.stderr}`);
  assert.match(cliFail.stderr, /"ok": false/);

  const cliPass = runNode(['scripts/token-compact.mjs', 'validate-handoff', 'tests/fixtures/valid-handoff.json']);
  assert.equal(cliPass.status, 0, `valid handoff should exit 0, stderr=${cliPass.stderr}`);
}

function testPackagingCommandNamesUnchanged() {
  const plugin = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/plugin.json'), 'utf8'));
  const marketplace = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/marketplace.json'), 'utf8'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const planwithme = fs.readFileSync(path.join(root, 'skills/planwithme/SKILL.md'), 'utf8');

  assert.equal(plugin.name, 'cwm');
  assert.equal(plugin.skills, './skills/');
  assert.equal(marketplace.name, 'cwm');
  assert.equal(marketplace.plugins[0].name, 'cwm');
  assert.equal(packageJson.name, 'cwm');
  assert.ok(packageJson.files.includes('scripts/'), 'package must include scripts/ for token compaction utility');
  assert.match(planwithme, /^name: planwithme$/m);
  assert.match(planwithme, /^user-invocable: true$/m);
  assert.match(planwithme, /Skill\("cwm:interviewwithme"/);
}

async function testPublicApiImportableFromDocumentedModulePath() {
  const modulePath = '../scripts/token-compact.mjs';
  const api = await import(modulePath);
  for (const symbol of [
    'REFERENCE_PROJECTS',
    'REQUIRED_HANDOFF_FIELDS',
    'buildCompactPayload',
    'buildLegacyPayload',
    'loadJson',
    'measureReduction',
    'validatePhaseHandoff',
  ]) {
    assert.ok(symbol in api, `${symbol} must be importable from ${modulePath}`);
  }
}

function testPublicApiPrimarySuccessPaths() {
  const loaded = loadJson(path.join(__dirname, 'fixtures/token-payload.json'));
  assert.deepEqual(loaded.plan, fixture.plan, 'loadJson should parse a JSON fixture');

  const legacy = buildLegacyPayload(fixture);
  const compact = buildCompactPayload(fixture);
  assert.match(legacy, /^# CWM Build Payload/);
  assert.match(legacy, /## Repeated Boilerplate/);
  assert.match(compact, /^# CWM Compact Handoff/);
  assert.match(compact, /## Token-Saving Rules/);
  assert.ok(legacy.length > compact.length, 'legacy payload should be larger than compact payload');

  const measured = measureReduction(fixture);
  assert.equal(measured.legacy, legacy);
  assert.equal(measured.compact, compact);
  assert.equal(measured.legacyBytes, Buffer.byteLength(legacy, 'utf8'));
  assert.equal(measured.compactBytes, Buffer.byteLength(compact, 'utf8'));

  assert.deepEqual(validatePhaseHandoff({
    plan: 'Add a CLI option',
    currentPhase: 'Phase 1',
    blockers: [],
    phaseId: 'phase-1',
    status: 'active',
  }), { ok: true, missing: [], invalid: [] });
}

function testPlanwithmeHotPathCompactedWithReachableReferences() {
  const skillPath = path.join(root, 'skills/planwithme/SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');
  const skillBytes = Buffer.byteLength(skill, 'utf8');
  assert.ok(skillBytes < 8000, `planwithme hot-path SKILL.md should stay compact, got ${skillBytes} bytes`);

  for (const rel of ['references/document-templates.md', 'references/workflow-details.md']) {
    assert.ok(skill.includes(rel), `${rel} must be linked from planwithme/SKILL.md`);
    const refPath = path.join(path.dirname(skillPath), rel);
    assert.ok(fs.existsSync(refPath), `${rel} must be reachable from planwithme/SKILL.md`);
    assert.ok(Buffer.byteLength(fs.readFileSync(refPath), 'utf8') > 500, `${rel} should contain the moved details`);
  }
}

function testCliMeasure() {
  const cli = runNode(['scripts/token-compact.mjs', 'measure', 'tests/fixtures/token-payload.json']);
  assert.equal(cli.status, 0, cli.stderr);
  const parsed = JSON.parse(cli.stdout);
  assert.ok(parsed.reductionPercent >= 20, `expected CLI reduction >=20%, got ${parsed.reductionPercent}%`);
}

function testPlanwithmeRealPluginTelemetryArtifacts() {
  const oldRun = JSON.parse(fs.readFileSync(path.resolve(root, '../verify/planwithme-old.json'), 'utf8'));
  const newRun = JSON.parse(fs.readFileSync(path.resolve(root, '../verify/planwithme-new.json'), 'utf8'));
  const comparison = JSON.parse(fs.readFileSync(path.resolve(root, '../verify/planwithme-comparison.json'), 'utf8'));

  for (const [label, run] of [['old', oldRun], ['new', newRun]]) {
    assert.equal(run.subtype, 'success', `${label} real Claude Code plugin run should succeed`);
    assert.equal(run.is_error, false, `${label} run should not be an error`);
    assert.ok(run.total_cost_usd > 0, `${label} run should capture total_cost_usd`);
    assert.ok(run.num_turns > 0, `${label} run should capture turn count`);
    assert.ok(run.usage.input_tokens > 0, `${label} run should capture usage.input_tokens`);
    assert.match(run.result, /📋 \*\*?계획 수립 완료 — 검토 요청\*\*?|📋 계획 수립 완료 — 검토 요청/);
    assert.match(run.result, /승인 전까지 코드를 작성하지 않습니다/);
  }

  assert.equal(comparison.old.total_cost_usd, oldRun.total_cost_usd);
  assert.equal(comparison.new.total_cost_usd, newRun.total_cost_usd);
  assert.equal(comparison.old.turns, oldRun.num_turns);
  assert.equal(comparison.new.turns, newRun.num_turns);
  assert.ok(comparison.new.total_cost_usd <= comparison.old.total_cost_usd, 'new run should not cost more than old run');
  assert.ok(Number.isInteger(comparison.old.turns) && comparison.old.turns > 0, 'old run should compare assistant turn count');
  assert.ok(Number.isInteger(comparison.new.turns) && comparison.new.turns > 0, 'new run should compare assistant turn count');
  assert.ok(Object.values(comparison.semantic_checks).every(Boolean), 'semantic comparison checks should all pass');
}

const tests = [
  testTokenReduction,
  testCompactionPreservesRequiredFields,
  testReferenceDocumentation,
  testHandoffValidation,
  testPackagingCommandNamesUnchanged,
  testPublicApiImportableFromDocumentedModulePath,
  testPublicApiPrimarySuccessPaths,
  testPlanwithmeHotPathCompactedWithReachableReferences,
  testPlanwithmeRealPluginTelemetryArtifacts,
  testCliMeasure,
];

for (const test of tests) {
  await test();
  console.log(`✓ ${test.name}`);
}

console.log(`All ${tests.length} token optimization checks passed.`);
