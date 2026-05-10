#!/usr/bin/env node
/**
 * CWM HUD - folder, git branch, context bar, call counts, plan status, 5h rate limit
 * Compatible with Node.js 12+
 */

import { execSync } from "child_process";
import { basename } from "path";
import { existsSync, statSync, openSync, readSync, closeSync, readdirSync, readFileSync } from "fs";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { join } from "path";

var MAX_TAIL_BYTES = 512 * 1024;

var C_RESET = "\x1b[0m";
var C_ACCENT = "\x1b[38;5;173m";
var C_BAR_EMPTY = "\x1b[38;5;238m";
var C_GRAY = "\x1b[38;5;245m";
var C_GREEN = "\x1b[38;5;76m";
var C_YELLOW = "\x1b[33m";
var C_RED = "\x1b[38;5;203m";
var C_BLUE = "\x1b[38;5;75m";
var C_ORANGE = "\x1b[38;5;173m";

function getModelColor(modelName) {
  if (!modelName) return C_ACCENT;
  var lower = modelName.toLowerCase();
  if (lower.indexOf("opus") !== -1) return C_ORANGE;
  if (lower.indexOf("sonnet") !== -1) return C_BLUE;
  if (lower.indexOf("haiku") !== -1) return C_GREEN;
  return C_ACCENT;
}

function g(obj, path) {
  var keys = path.split(".");
  var v = obj;
  for (var i = 0; i < keys.length; i++) {
    if (v == null) return undefined;
    v = v[keys[i]];
  }
  return v;
}

function renderContextBar(pct, maxK, barColor) {
  var color = barColor || C_ACCENT;
  var barWidth = 10;
  var clamped = Math.min(pct, 100);
  var bar = "";
  for (var i = 0; i < barWidth; i++) {
    var barStart = i * 10;
    var progress = clamped - barStart;
    if (progress >= 8) {
      bar += color + "\u2588" + C_RESET;
    } else if (progress >= 3) {
      bar += color + "\u2584" + C_RESET;
    } else {
      bar += C_BAR_EMPTY + "\u2591" + C_RESET;
    }
  }
  return bar + " " + C_GRAY + pct + "% of " + maxK + "k" + C_RESET;
}

function getPlanStatus(cwd) {
  var plansDir = join(cwd, ".cwm", "docs", "plans");
  if (!existsSync(plansDir)) return "";

  var active = 0, pending = 0, complete = 0, activeName = "";
  try {
    var entries = readdirSync(plansDir, { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (!entry.isDirectory()) continue;
      var statusFile = join(plansDir, entry.name, ".status");
      if (!existsSync(statusFile)) continue;
      var status = readFileSync(statusFile, "utf-8").trim();
      if (status === "active") { active++; activeName = entry.name; }
      else if (status === "pending") pending++;
      else if (status === "complete") complete++;
    }
  } catch (_e) { return ""; }

  if (active > 0) {
    return C_YELLOW + "\uD83D\uDCCB " + activeName + C_RESET;
  } else if (pending > 0) {
    return C_RED + "\uD83D\uDCCB " + pending + " pending" + C_RESET;
  } else if (complete > 0) {
    return C_GREEN + "\u2713 " + complete + " done" + C_RESET;
  }
  return "";
}

async function countCalls(transcriptPath) {
  var toolCalls = 0, agentCalls = 0, skillCalls = 0;
  if (!transcriptPath || !existsSync(transcriptPath)) return { toolCalls: toolCalls, agentCalls: agentCalls, skillCalls: skillCalls };

  try {
    var stat = statSync(transcriptPath);
    var lines = stat.size > MAX_TAIL_BYTES
      ? readTailLines(transcriptPath, stat.size, MAX_TAIL_BYTES)
      : await readAllLines(transcriptPath);

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim()) continue;
      try {
        var entry = JSON.parse(line);
        var msg = entry.message;
        var content = msg && msg.content;
        if (!content || !Array.isArray(content)) continue;
        for (var j = 0; j < content.length; j++) {
          var block = content[j];
          if (block.type === "tool_use" && block.name) {
            toolCalls++;
            if (block.name === "Task" || block.name === "proxy_Task" || block.name === "Agent") {
              agentCalls++;
            } else if (block.name === "Skill" || block.name === "proxy_Skill") {
              skillCalls++;
            }
          }
        }
      } catch (_e) { /* skip malformed */ }
    }
  } catch (_e) { /* ignore */ }

  return { toolCalls: toolCalls, agentCalls: agentCalls, skillCalls: skillCalls };
}

function readTailLines(filePath, fileSize, maxBytes) {
  var startOffset = Math.max(0, fileSize - maxBytes);
  var bytesToRead = fileSize - startOffset;
  var fd = openSync(filePath, "r");
  var buffer = Buffer.alloc(bytesToRead);
  try { readSync(fd, buffer, 0, bytesToRead, startOffset); }
  finally { closeSync(fd); }
  var lines = buffer.toString("utf8").split("\n");
  if (startOffset > 0 && lines.length > 0) lines.shift();
  return lines;
}

async function readAllLines(filePath) {
  var lines = [];
  var rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (var line of rl) lines.push(line);
  return lines;
}

async function main() {
  var data = {};
  try {
    var chunks = [];
    for await (var chunk of process.stdin) chunks.push(chunk);
    data = JSON.parse(Buffer.concat(chunks).toString());
  } catch (_e) { /* no stdin data */ }

  var cwd = data.cwd || process.cwd();
  var folder = basename(cwd);

  // git branch
  var branch = "";
  try {
    branch = execSync("git branch --show-current 2>/dev/null", {
      cwd: cwd, encoding: "utf-8", timeout: 3000,
    }).trim();
    try {
      execSync("git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null", { cwd: cwd, timeout: 3000 });
    } catch (_e) { branch += "?"; }
  } catch (_e) { /* not a git repo */ }

  // model info
  var modelObj = data && data.model;
  var modelName = (modelObj && modelObj.display_name) || "";
  var modelColor = getModelColor(modelName);

  // context bar (colored by model)
  var ctxWin = data && data.context_window;
  var ctxPct = ctxWin && ctxWin.used_percentage;
  var ctxSize = (ctxWin && ctxWin.context_window_size) || 200000;
  var maxK = Math.round(ctxSize / 1000);
  var ctxBar = "";
  if (ctxPct != null) {
    ctxBar = renderContextBar(Math.round(ctxPct), maxK, modelColor);
  }

  // call counts
  var counts = await countCalls(data.transcript_path);
  var countParts = [];
  if (counts.toolCalls > 0) countParts.push("\uD83D\uDD27" + counts.toolCalls);
  if (counts.agentCalls > 0) countParts.push("\uD83E\uDD16" + counts.agentCalls);
  if (counts.skillCalls > 0) countParts.push("\u26A1" + counts.skillCalls);
  var countStr = countParts.join(" ");

  // CWM plan status
  var planStatus = getPlanStatus(cwd);

  // 5h rate limit
  var rateLimits = data && data.rate_limits;
  var fiveHour = rateLimits && rateLimits.five_hour;
  var fiveHourStr = "";
  if (fiveHour && fiveHour.used_percentage != null) {
    var pct = Math.round(fiveHour.used_percentage);
    var barWidth = 3;
    var step = 90 / (barWidth * 2);
    var bar5h = "";
    for (var i = 0; i < barWidth; i++) {
      var halfAt = (i * 2 + 1) * step;
      var fullAt = (i * 2 + 2) * step;
      if (pct >= fullAt) {
        bar5h += C_YELLOW + "\u2588" + C_RESET;
      } else if (pct >= halfAt) {
        bar5h += C_YELLOW + "\u2584" + C_RESET;
      } else {
        bar5h += C_BAR_EMPTY + "\u2591" + C_RESET;
      }
    }
    var timeLabel = "5h";
    var resetAt = fiveHour.resets_at || fiveHour.reset_at || fiveHour.reset;
    if (resetAt) {
      var resetMs = resetAt < 1e12 ? resetAt * 1000 : resetAt;
      var remainMs = Math.max(0, resetMs - Date.now());
      var h = Math.floor(remainMs / 3600000);
      var m = Math.floor((remainMs % 3600000) / 60000);
      timeLabel = h > 0 ? h + "h" + String(m).padStart(2, "0") + "m" : m + "m";
    }
    fiveHourStr = bar5h + " " + C_GRAY + timeLabel + ":" + pct + "%" + C_RESET;
  }

  // build output
  var parts = [];
  var loc = branch
    ? "\uD83D\uDCC2 " + modelColor + folder + C_RESET + " | \uD83D\uDD00 " + C_YELLOW + branch + C_RESET
    : "\uD83D\uDCC2 " + modelColor + folder + C_RESET;
  parts.push(loc);
  if (ctxBar) parts.push(ctxBar);
  if (countStr) parts.push(countStr);
  if (planStatus) parts.push(planStatus);
  if (fiveHourStr) parts.push(fiveHourStr);

  console.log(parts.join(" | "));
}

main();
