#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const oldPath = path.join(__dirname, 'planwithme-old.json');
const newPath = path.join(__dirname, 'planwithme-new.json');
const comparisonPath = path.join(__dirname, 'planwithme-comparison.json');

function fail(message) {
  console.error(`planwithme verification failed: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`cannot read ${path.basename(filePath)}: ${error.message}`);
  }
}

function usageTotal(run) {
  const usage = run?.usage ?? {};
  return usage.total_tokens
    ?? ((usage.input_tokens ?? 0)
      + (usage.cache_creation_input_tokens ?? 0)
      + (usage.cache_read_input_tokens ?? 0)
      + (usage.output_tokens ?? 0));
}

function assertRealSuccessfulRun(label, run) {
  if (run?.verification_metadata?.real_claude_code_plugin_run !== true) {
    fail(`${label} run is not marked as a real Claude Code plugin run`);
  }
  if (run?.verification_metadata?.exit_code !== 0) {
    fail(`${label} run exit_code is ${run?.verification_metadata?.exit_code}`);
  }
  if (run?.subtype !== 'success' || run?.is_error !== false) {
    fail(`${label} run did not complete successfully`);
  }
  const stderr = run?.verification_metadata?.stderr ?? '';
  if (stderr.trim().length > 0) {
    fail(`${label} run emitted stderr: ${stderr.trim().slice(0, 200)}`);
  }
  if (usageTotal(run) <= 0) {
    fail(`${label} run did not capture usage.total_tokens`);
  }
  if (!(run.total_cost_usd > 0)) {
    fail(`${label} run did not capture total_cost_usd`);
  }
  if (!(run.num_turns > 0)) {
    fail(`${label} run did not capture assistant turn count`);
  }
}

const oldRun = readJson(oldPath);
const newRun = readJson(newPath);
const comparison = readJson(comparisonPath);

assertRealSuccessfulRun('old', oldRun);
assertRealSuccessfulRun('new', newRun);

const oldTokens = usageTotal(oldRun);
const newTokens = usageTotal(newRun);
const oldCost = oldRun.total_cost_usd;
const newCost = newRun.total_cost_usd;
const oldTurns = oldRun.num_turns;
const newTurns = newRun.num_turns;

if (newTokens > oldTokens * 0.80) {
  fail(`usage.total_tokens gate failed: new=${newTokens}, old=${oldTokens}, limit=${oldTokens * 0.80}`);
}
if (newCost > oldCost * 1.03) {
  fail(`total_cost_usd gate failed: new=${newCost}, old=${oldCost}, limit=${oldCost * 1.03}`);
}
if (newTurns > oldTurns + 1) {
  fail(`assistant_turn_count gate failed: new=${newTurns}, old=${oldTurns}, limit=${oldTurns + 1}`);
}

const gates = comparison.telemetry_gates ?? {};
for (const [name, passed] of Object.entries({
  usage_total_tokens_under_80_percent: gates.usage_total_tokens_under_80_percent,
  total_cost_usd_under_103_percent: gates.total_cost_usd_under_103_percent,
  assistant_turn_count_within_old_plus_1: gates.assistant_turn_count_within_old_plus_1,
  no_nonzero_exits: gates.no_nonzero_exits,
  no_new_stderr_errors: gates.no_new_stderr_errors,
})) {
  if (passed !== true) {
    fail(`comparison telemetry_gates.${name} is not true`);
  }
}

console.log(JSON.stringify({
  ok: true,
  old: {
    usage_total_tokens: oldTokens,
    total_cost_usd: oldCost,
    assistant_turn_count: oldTurns,
  },
  new: {
    usage_total_tokens: newTokens,
    total_cost_usd: newCost,
    assistant_turn_count: newTurns,
  },
  gates: comparison.telemetry_gates,
}, null, 2));
