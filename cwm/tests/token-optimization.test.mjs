#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCompactPayload,
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

  assert.equal(plugin.name, 'cwm');
  assert.equal(plugin.skills, './skills/');
  assert.equal(marketplace.name, 'cwm');
  assert.equal(marketplace.plugins[0].name, 'cwm');
  assert.equal(packageJson.name, 'cwm');
  assert.ok(packageJson.files.includes('scripts/'), 'package must include scripts/ for token compaction utility');
}

function testCliMeasure() {
  const cli = runNode(['scripts/token-compact.mjs', 'measure', 'tests/fixtures/token-payload.json']);
  assert.equal(cli.status, 0, cli.stderr);
  const parsed = JSON.parse(cli.stdout);
  assert.ok(parsed.reductionPercent >= 20, `expected CLI reduction >=20%, got ${parsed.reductionPercent}%`);
}

const tests = [
  testTokenReduction,
  testCompactionPreservesRequiredFields,
  testReferenceDocumentation,
  testHandoffValidation,
  testPackagingCommandNamesUnchanged,
  testCliMeasure,
];

for (const test of tests) {
  test();
  console.log(`✓ ${test.name}`);
}

console.log(`All ${tests.length} token optimization checks passed.`);
