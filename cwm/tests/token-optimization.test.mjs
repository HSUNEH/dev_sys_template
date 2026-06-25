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
  const evidencePath = path.resolve(root, '../verify/planwithme-hotpath.json');
  const skill = fs.readFileSync(skillPath, 'utf8');
  const skillBytes = Buffer.byteLength(skill, 'utf8');
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

  assert.equal(evidence.skill_name, 'planwithme');
  assert.equal(evidence.hot_path_file, 'cwm/skills/planwithme/SKILL.md');
  assert.equal(evidence.compacted_bytes, skillBytes);
  assert.ok(evidence.baseline_bytes > skillBytes, 'baseline SKILL.md bytes must exceed compacted bytes');
  assert.ok(
    evidence.reduction_percent >= 30,
    `planwithme hot-path SKILL.md reduction must be >=30%, got ${evidence.reduction_percent}%`,
  );

  for (const rel of ['references/document-templates.md', 'references/workflow-details.md']) {
    assert.ok(skill.includes(rel), `${rel} must be linked from planwithme/SKILL.md`);
    const refPath = path.join(path.dirname(skillPath), rel);
    assert.ok(fs.existsSync(refPath), `${rel} must be reachable from planwithme/SKILL.md`);
    assert.ok(Buffer.byteLength(fs.readFileSync(refPath), 'utf8') > 500, `${rel} should contain the moved details`);
  }

  for (const moved of evidence.moved_references) {
    assert.ok(moved.linked_from_hot_path, `${moved.path} must be marked as linked from hot path`);
    assert.ok(moved.reachable, `${moved.path} must be marked as reachable`);
    assert.ok(fs.existsSync(path.resolve(root, '..', moved.path)), `${moved.path} must exist`);
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
  const hardGateCheck = spawnSync(process.execPath, [path.resolve(root, '../verify/planwithme-hard-gates.mjs')], {
    cwd: path.resolve(root, '..'),
    encoding: 'utf8',
  });

  assert.equal(hardGateCheck.status, 0, hardGateCheck.stderr || hardGateCheck.stdout);

  assert.equal(
    comparison.verification_project.same_copied_temporary_mini_project,
    true,
    'old/new runs must come from the same copied temporary mini project template',
  );
  assert.match(comparison.verification_project.template_tree_sha256, /^[a-f0-9]{64}$/);
  assert.equal(comparison.verification_project.old_project_copied_from_template, true);
  assert.equal(comparison.verification_project.new_project_copied_from_template, true);

  for (const [label, run] of [['old', oldRun], ['new', newRun]]) {
    assert.equal(run.subtype, 'success', `${label} real Claude Code plugin run should succeed`);
    assert.equal(run.is_error, false, `${label} run should not be an error`);
    assert.ok(run.total_cost_usd > 0, `${label} run should capture total_cost_usd`);
    assert.ok(run.num_turns > 0, `${label} run should capture turn count`);
    assert.ok(run.usage.input_tokens > 0, `${label} run should capture usage.input_tokens`);
    assert.ok(run.usage.total_tokens > 0, `${label} run should capture derived usage.total_tokens`);
    assert.equal(run.verification_metadata.real_claude_code_plugin_run, true, `${label} run should be real Claude Code output`);
    assert.equal(run.verification_metadata.exit_code, 0, `${label} real Claude Code plugin run should exit 0`);
    assert.equal(run.verification_metadata.stderr, '', `${label} real Claude Code plugin run should not emit stderr`);
    assert.match(run.result, /📋 \*\*?계획 수립 완료 — 검토 요청\*\*?|📋 계획 수립 완료 — 검토 요청/);
    assert.match(run.result, /승인 전까지 코드를 작성하지 않습니다/);
  }

  assert.equal(comparison.old.total_cost_usd, oldRun.total_cost_usd);
  assert.equal(comparison.new.total_cost_usd, newRun.total_cost_usd);
  assert.equal(comparison.old.usage_total_tokens, oldRun.usage.total_tokens);
  assert.equal(comparison.new.usage_total_tokens, newRun.usage.total_tokens);
  assert.equal(comparison.old.turns, oldRun.num_turns);
  assert.equal(comparison.new.turns, newRun.num_turns);
  assert.equal(comparison.old.assistant_turn_count, oldRun.num_turns);
  assert.equal(comparison.new.assistant_turn_count, newRun.num_turns);
  assert.equal(
    comparison.telemetry_delta.total_cost_usd,
    newRun.total_cost_usd - oldRun.total_cost_usd,
    'comparison should record observed cost delta without hiding run-to-run variance',
  );
  assert.equal(
    comparison.telemetry_delta.usage_total_tokens,
    newRun.usage.total_tokens - oldRun.usage.total_tokens,
    'comparison should record observed usage.total_tokens delta',
  );
  assert.ok(Number.isInteger(comparison.old.turns) && comparison.old.turns > 0, 'old run should compare assistant turn count');
  assert.ok(Number.isInteger(comparison.new.turns) && comparison.new.turns > 0, 'new run should compare assistant turn count');
  assert.ok(
    newRun.usage.total_tokens <= oldRun.usage.total_tokens * 0.80,
    `usage.total_tokens hard gate failed: new=${newRun.usage.total_tokens}, old=${oldRun.usage.total_tokens}`,
  );
  assert.ok(
    newRun.total_cost_usd <= oldRun.total_cost_usd * 1.03,
    `total_cost_usd hard gate failed: new=${newRun.total_cost_usd}, old=${oldRun.total_cost_usd}`,
  );
  assert.ok(
    newRun.num_turns <= oldRun.num_turns + 1,
    `assistant_turn_count hard gate failed: new=${newRun.num_turns}, old=${oldRun.num_turns}`,
  );
  assert.deepEqual(comparison.telemetry_gates, {
    usage_total_tokens_under_80_percent: true,
    total_cost_usd_under_103_percent: true,
    assistant_turn_count_within_old_plus_1: true,
    no_nonzero_exits: true,
    no_new_stderr_errors: true,
  });
  assert.ok(Object.values(comparison.semantic_checks).every(Boolean), 'semantic comparison checks should all pass');

  const semantic = comparison.semantic_outputs;
  assert.ok(semantic, 'comparison must capture structured semantic outputs, not only token telemetry');
  assert.deepEqual(semantic.workflow_phases, ['Phase 1', 'Phase 2', 'Phase 3']);
  assert.deepEqual(semantic.task_ordering, [
    'add or export a parseName argv parser before wiring the CLI entry point',
    'wire parseName into src/cli.mjs without changing greet behavior',
    'verify positional, --name value, --name=value, missing-name/default behavior, then run npm test',
  ]);
  assert.deepEqual(semantic.acceptance_criteria, [
    'positional name input works',
    '--name value input works',
    '--name=value input works',
    'missing input falls back to world',
    'greet() behavior remains stable',
    'npm test passes',
  ]);
  assert.deepEqual(semantic.commands, ['npm test']);
  assert.deepEqual(semantic.required_artifacts, ['PLAN.md', 'CONTEXT.md', 'CHECKLIST.md', '.status pending']);
  assert.match(oldRun.result, /Phase 1[\s\S]*Phase 2/, 'old run should preserve ordered phases');
  assert.match(newRun.result, /Phase 1[\s\S]*Phase 2/, 'new run should preserve ordered phases');
  assert.ok(comparison.generated_artifacts.old['PLAN.md'].text.includes('src/cli.mjs'));
  assert.ok(comparison.generated_artifacts.new['PLAN.md'].text.includes('src/cli.mjs'));
  for (const required of ['src/cli.mjs', 'greet', '--name', 'positional', 'npm test']) {
    assert.ok(
      oldRun.result.includes(required) || semantic.old_plan_output_summary.mentions.includes(required),
      `old run should mention ${required}`,
    );
    assert.ok(
      newRun.result.includes(required) || semantic.new_plan_output_summary.mentions.includes(required),
      `new run should mention ${required}`,
    );
  }
  assert.ok(/world|기본값/.test(oldRun.result), 'old run should mention default-name fallback');
  assert.ok(/world|기본값/.test(newRun.result), 'new run should mention default-name fallback');
  for (const artifact of ['PLAN.md', 'CONTEXT.md', 'CHECKLIST.md', '.status']) {
    assert.ok(oldRun.result.includes(artifact), `old run should mention ${artifact}`);
    assert.ok(newRun.result.includes(artifact), `new run should mention ${artifact}`);
  }
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
