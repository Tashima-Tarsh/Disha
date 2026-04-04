#!/usr/bin/env node
import fs from "fs";
import { fileURLToPath } from "url";

const AVERAGE_GLYPH_WIDTH = 7.2;

function estimateWrappedLines(text, widthPx) {
  if (!text || !text.trim()) return 1;
  const charsPerLine = Math.max(12, Math.floor(widthPx / AVERAGE_GLYPH_WIDTH));
  const normalized = text.replace(/\s+/g, " ").trim();
  return Math.max(1, Math.ceil(normalized.length / charsPerLine));
}

function truncateMeasuredText(text, widthPx) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const charsPerLine = Math.max(8, Math.floor(widthPx / AVERAGE_GLYPH_WIDTH));
  if (normalized.length <= charsPerLine) {
    return {
      lines: 1,
      truncated: normalized,
      estimatedWidth: normalized.length * AVERAGE_GLYPH_WIDTH,
    };
  }

  const visible = Math.max(5, charsPerLine - 1);
  return {
    lines: Math.ceil(normalized.length / charsPerLine),
    truncated: `${normalized.slice(0, visible)}...`,
    estimatedWidth: widthPx,
  };
}

const samples = [
  {
    name: "short chat",
    text: "Confirm batch start for unit 42.",
    width: 560,
  },
  {
    name: "long chat",
    text:
      "We observed intermittent valve oscillation across multiple cycles; list likely root causes and which logs/points to inspect to validate each hypothesis.",
    width: 560,
  },
  {
    name: "annotation",
    text: "ALARM 1\nALARM 1\nBatch=42 started\nALARM 1\nBatch=42 started",
    width: 400,
  },
  {
    name: "file title",
    text: "D:/projects/plant-control/release-notes/2026-03-15-mes-integration.md",
    width: 300,
  },
];

const results = samples.map((s) => {
  const lines = estimateWrappedLines(s.text, s.width);
  const truncated = truncateMeasuredText(s.text, s.width);
  return { name: s.name, width: s.width, lines, truncated };
});

const report = { date: new Date().toISOString(), results };

const outPath = fileURLToPath(new URL("./pretext-report.json", import.meta.url));
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
console.log("Pretext evaluation complete. Report:", JSON.stringify(report, null, 2));
console.log(`Wrote report to ${outPath}`);
