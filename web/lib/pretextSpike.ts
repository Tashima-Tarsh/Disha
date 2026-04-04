export interface MeasurementSample {
  lines: number;
  truncated: string;
  estimatedWidth: number;
}

const AVERAGE_GLYPH_WIDTH = 7.2;

export function estimateWrappedLines(text: string, widthPx: number): number {
  if (!text.trim()) {
    return 1;
  }
  const charsPerLine = Math.max(12, Math.floor(widthPx / AVERAGE_GLYPH_WIDTH));
  const normalized = text.replace(/\s+/g, " ").trim();
  return Math.max(1, Math.ceil(normalized.length / charsPerLine));
}

export function truncateMeasuredText(text: string, widthPx: number): MeasurementSample {
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

export function measureCommentPreview(text: string, widthPx: number): MeasurementSample {
  return truncateMeasuredText(text, widthPx);
}
