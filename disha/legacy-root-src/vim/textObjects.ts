/**
 * Vim Text Object Finding
 *
 * Functions for finding text object boundaries (iw, aw, i", a(, etc.)
 */

import {
  isVimPunctuation,
  isVimWhitespace,
  isVimWordChar,
} from '../utils/Cursor.js'
import { getGraphemeSegmenter } from '../utils/intl.js'

export type TextObjectRange = { start: number; end: number } | null

/**
 * Delimiter pairs for text objects.
 */
const PAIRS: Record<string, [string, string]> = {
  '(': ['(', ')'],
  ')': ['(', ')'],
  b: ['(', ')'],
  '[': ['[', ']'],
  ']': ['[', ']'],
  '{': ['{', '}'],
  '}': ['{', '}'],
  B: ['{', '}'],
  '<': ['<', '>'],
  '>': ['<', '>'],
  '"': ['"', '"'],
  "'": ["'", "'"],
  '`': ['`', '`'],
}

/**
 * Find a text object at the given position.
 */
export function findTextObject(
  text: string,
  offset: number,
  objectType: string,
  isInner: boolean,
): TextObjectRange {
  if (objectType === 'w')
    return findWordObject(text, offset, isInner, isVimWordChar)
  if (objectType === 'W')
    return findWordObject(text, offset, isInner, ch => !isVimWhitespace(ch))

  const pair = PAIRS[objectType]
  if (pair) {
    const [open, close] = pair
    return open === close
      ? findQuoteObject(text, offset, open, isInner)
      : findBracketObject(text, offset, open, close, isInner)
  }

  return null
}

function segmentGraphemes(
  text: string,
): Array<{ segment: string; index: number }> {
  const graphemes: Array<{ segment: string; index: number }> = []
  for (const { segment, index } of getGraphemeSegmenter().segment(text)) {
    graphemes.push({ segment, index })
  }
  return graphemes
}

function findGraphemeIndex(
  graphemes: Array<{ segment: string; index: number }>,
  offset: number,
  textLength: number,
): number {
  for (let i = 0; i < graphemes.length; i++) {
    const g = graphemes[i]!
    const nextStart =
      i + 1 < graphemes.length ? graphemes[i + 1]!.index : textLength
    if (offset >= g.index && offset < nextStart) {
      return i
    }
  }
  return graphemes.length - 1
}

function expandRange(
  start: number,
  end: number,
  limit: number,
  predicate: (idx: number) => boolean,
): [number, number] {
  while (start > 0 && predicate(start - 1)) start--
  while (end < limit && predicate(end)) end++
  return [start, end]
}

function includeAdjacentWhitespace(
  start: number,
  end: number,
  limit: number,
  isWs: (idx: number) => boolean,
): [number, number] {
  if (end < limit && isWs(end)) {
    while (end < limit && isWs(end)) end++
  } else if (start > 0 && isWs(start - 1)) {
    while (start > 0 && isWs(start - 1)) start--
  }
  return [start, end]
}

function findWordObject(
  text: string,
  offset: number,
  isInner: boolean,
  isWordChar: (ch: string) => boolean,
): TextObjectRange {
  const graphemes = segmentGraphemes(text)
  const graphemeIdx = findGraphemeIndex(graphemes, offset, text.length)

  const graphemeAt = (idx: number): string => graphemes[idx]?.segment ?? ''
  const offsetAt = (idx: number): number =>
    idx < graphemes.length ? graphemes[idx]!.index : text.length
  const isWs = (idx: number): boolean => isVimWhitespace(graphemeAt(idx))
  const isWord = (idx: number): boolean => isWordChar(graphemeAt(idx))
  const isPunct = (idx: number): boolean => isVimPunctuation(graphemeAt(idx))

  let startIdx = graphemeIdx
  let endIdx = graphemeIdx

  if (isWs(graphemeIdx)) {
    ;[startIdx, endIdx] = expandRange(startIdx, endIdx, graphemes.length, isWs)
    return { start: offsetAt(startIdx), end: offsetAt(endIdx) }
  }

  const classifier = isWord(graphemeIdx) ? isWord : isPunct
  ;[startIdx, endIdx] = expandRange(
    startIdx,
    endIdx,
    graphemes.length,
    classifier,
  )

  if (!isInner) {
    ;[startIdx, endIdx] = includeAdjacentWhitespace(
      startIdx,
      endIdx,
      graphemes.length,
      isWs,
    )
  }

  return { start: offsetAt(startIdx), end: offsetAt(endIdx) }
}

function findQuoteObject(
  text: string,
  offset: number,
  quote: string,
  isInner: boolean,
): TextObjectRange {
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1
  const lineEnd = text.indexOf('\n', offset)
  const effectiveEnd = lineEnd === -1 ? text.length : lineEnd
  const line = text.slice(lineStart, effectiveEnd)
  const posInLine = offset - lineStart

  const positions: number[] = []
  for (let i = 0; i < line.length; i++) {
    if (line[i] === quote) positions.push(i)
  }

  // Pair quotes correctly: 0-1, 2-3, 4-5, etc.
  for (let i = 0; i < positions.length - 1; i += 2) {
    const qs = positions[i]!
    const qe = positions[i + 1]!
    if (qs <= posInLine && posInLine <= qe) {
      return isInner
        ? { start: lineStart + qs + 1, end: lineStart + qe }
        : { start: lineStart + qs, end: lineStart + qe + 1 }
    }
  }

  return null
}

function scanBackward(
  text: string,
  from: number,
  open: string,
  close: string,
): number {
  let depth = 0
  for (let i = from; i >= 0; i--) {
    if (text[i] === close && i !== from) depth++
    else if (text[i] === open) {
      if (depth === 0) return i
      depth--
    }
  }
  return -1
}

function scanForward(
  text: string,
  from: number,
  open: string,
  close: string,
): number {
  let depth = 0
  for (let i = from; i < text.length; i++) {
    if (text[i] === open) depth++
    else if (text[i] === close) {
      if (depth === 0) return i
      depth--
    }
  }
  return -1
}

function findBracketObject(
  text: string,
  offset: number,
  open: string,
  close: string,
  isInner: boolean,
): TextObjectRange {
  const start = scanBackward(text, offset, open, close)
  if (start === -1) return null

  const end = scanForward(text, start + 1, open, close)
  if (end === -1) return null

  return isInner ? { start: start + 1, end } : { start, end: end + 1 }
}

