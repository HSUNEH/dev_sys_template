#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

export const REFERENCE_PROJECTS = Object.freeze({
  caveman: 'https://github.com/JuliusBrussee/caveman',
  rtk: 'https://github.com/rtk-ai/rtk',
});

export const REQUIRED_HANDOFF_FIELDS = Object.freeze([
  'plan',
  'currentPhase',
  'blockers',
  'phaseId',
  'status',
]);

function stableList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

function uniqueLines(lines) {
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const normalized = String(line).trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function renderSection(title, lines) {
  const body = uniqueLines(stableList(lines));
  if (body.length === 0) return `## ${title}\n- none`;
  return `## ${title}\n${body.map((line) => `- ${line}`).join('\n')}`;
}

function renderRawSection(title, lines) {
  const body = stableList(lines).map((line) => String(line).trim()).filter(Boolean);
  if (body.length === 0) return `## ${title}\n- none`;
  return `## ${title}\n${body.map((line) => `- ${line}`).join('\n')}`;
}

export function validatePhaseHandoff(handoff) {
  const missing = REQUIRED_HANDOFF_FIELDS.filter((field) => !(field in handoff));
  const invalid = [];

  if ('plan' in handoff && String(handoff.plan || '').trim() === '') invalid.push('plan');
  if ('currentPhase' in handoff && String(handoff.currentPhase || '').trim() === '') invalid.push('currentPhase');
  if ('phaseId' in handoff && String(handoff.phaseId || '').trim() === '') invalid.push('phaseId');
  if ('blockers' in handoff && !Array.isArray(handoff.blockers)) invalid.push('blockers');
  if ('status' in handoff && !['pending', 'active', 'blocked', 'complete'].includes(String(handoff.status))) {
    invalid.push('status');
  }

  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
}

export function buildLegacyPayload(input) {
  const repeated = stableList(input.repeatedPromptBlocks);
  const duplicateNoise = [
    ...repeated,
    ...repeated,
    ...repeated,
    ...stableList(input.workflowGuidance),
    ...stableList(input.workflowGuidance),
    ...stableList(input.referenceNotes),
    ...stableList(input.referenceNotes),
  ];
  const boilerplate = [
    'Always read PLAN.md, CONTEXT.md, and CHECKLIST.md in full before every Phase.',
    'Always repeat all constraints, all workflow instructions, and all verification guidance in the subagent prompt.',
    'Always include verbose command output unless the subagent summarizes it later.',
  ];
  return [
    '# CWM Build Payload',
    renderSection('Plan', input.plan),
    renderSection('Current Phase', input.currentPhase),
    renderSection('Blockers', input.blockers),
    renderRawSection('Workflow Guidance', duplicateNoise),
    renderRawSection('Repeated Boilerplate', [...boilerplate, ...boilerplate, ...boilerplate]),
    renderRawSection('Reference Notes', input.referenceNotes),
  ].join('\n\n');
}

export function buildCompactPayload(input) {
  const guidance = uniqueLines([
    ...stableList(input.repeatedPromptBlocks),
    ...stableList(input.workflowGuidance),
  ]);
  const references = [
    `Caveman reference: concise command/prompt style (${REFERENCE_PROJECTS.caveman})`,
    `RTK reference: compress verbose command output before it enters agent context (${REFERENCE_PROJECTS.rtk})`,
    ...stableList(input.referenceNotes),
  ];
  return [
    '# CWM Compact Handoff',
    renderSection('Plan', input.plan),
    renderSection('Current Phase', input.currentPhase),
    renderSection('Blockers', input.blockers),
    renderSection('Token-Saving Rules', guidance),
    renderSection('References', references),
  ].join('\n\n');
}

export function measureReduction(input) {
  const legacy = buildLegacyPayload(input);
  const compact = buildCompactPayload(input);
  const legacyBytes = Buffer.byteLength(legacy, 'utf8');
  const compactBytes = Buffer.byteLength(compact, 'utf8');
  return {
    legacyBytes,
    compactBytes,
    reductionPercent: Number((((legacyBytes - compactBytes) / legacyBytes) * 100).toFixed(2)),
    legacy,
    compact,
  };
}

export function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function printUsage() {
  console.error(`Usage:\n  token-compact.mjs measure <fixture.json>\n  token-compact.mjs compact <fixture.json>\n  token-compact.mjs validate-handoff <handoff.json>`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , command, file] = process.argv;
  if (!command || !file) {
    printUsage();
    process.exit(2);
  }

  const inputPath = path.resolve(file);
  const input = loadJson(inputPath);

  if (command === 'measure') {
    const { legacyBytes, compactBytes, reductionPercent } = measureReduction(input);
    console.log(JSON.stringify({ legacyBytes, compactBytes, reductionPercent }, null, 2));
  } else if (command === 'compact') {
    console.log(buildCompactPayload(input));
  } else if (command === 'validate-handoff') {
    const result = validatePhaseHandoff(input);
    if (!result.ok) {
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }
    console.log(JSON.stringify(result, null, 2));
  } else {
    printUsage();
    process.exit(2);
  }
}
