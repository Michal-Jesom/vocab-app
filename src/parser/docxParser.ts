import mammoth from 'mammoth'

export interface ParsedWord {
  word: string
  phonetic: string
  definition: string
}

export interface ParseResult {
  words: ParsedWord[]
  errors: { line: number; text: string }[]
}

// Chinese character range: CJK Unified + Extension A + Extension B + common symbols
const CJK_RE = /[一-鿿㐀-䶿\u{20000}-\u{2a6df}　-〿＀-￯]/u

function hasCJK(s: string): boolean {
  return CJK_RE.test(s)
}

function startsWithCJK(s: string): boolean {
  const first = s.charAt(0)
  return CJK_RE.test(first)
}

// Strip leading numbers, bullets, markers
// E.g. "1. word def", "(1) word def", "- word def", "① word def", "·word def"
function stripPrefix(line: string): string {
  let s = line.trimStart()
  // Strip whitespace and invisible zero-width chars (use Unicode property escapes)
  s = s.replace(/^[\s\p{Cf}\p{Zl}\p{Zp}]+/u, '')
  // "1. word", "1) word", "2. word" etc
  s = s.replace(/^\d+[.)]\s*/, '')
  // "(1) word", "[1] word", "【1】word" etc
  s = s.replace(/^[(\[【（]\d+[)\]】）]\s*/, '')
  // "① word", "② word" etc
  s = s.replace(/^[①-⑳]\s*/, '')
  // "- word", "— word", "• word" etc
  s = s.replace(/^[-–—•·●■◆►▸▪◦◉○]\s*/, '')
  // "a. word", "B) word"
  s = s.replace(/^[a-hA-H][.)]\s*/, '')
  return s.trim()
}

// Pattern: "word /phonetic/ definition"
const PHONETIC_RE = /^(.+?)\s+\/(.+?)\/\s+(.+)$/

// Pattern: "word (phonetic) definition"  or  "word [phonetic] definition"
const PHONETIC_PAREN_RE = /^(.+?)\s+[\(\[](.+?)[\)\]]\s+(.+)$/

// Split at CJK boundary: "english chinese..."
// Look for first CJK char, split with context
function splitAtCJK(line: string): { word: string; definition: string } | null {
  const idx = line.search(CJK_RE)
  if (idx <= 0) return null

  const word = line.slice(0, idx).trim()
  const definition = line.slice(idx).trim()

  // word should look like English text
  if (!word || !definition) return null
  if (!/[a-zA-Z]/.test(word)) return null

  // Clean word - remove trailing symbols
  const cleanWord = word.replace(/[,，;；:：、。·]+$/, '').trim()

  return { word: cleanWord, definition }
}

// Try various separator patterns, return parsed or null
function trySeparators(line: string): ParsedWord | null {
  // "word /phonetic/ definition"
  let m = line.match(PHONETIC_RE)
  if (m) {
    return { word: m[1].trim(), phonetic: `/${m[2].trim()}/`, definition: m[3].trim() }
  }

  // "word (phonetic) definition" or "word [phonetic] definition"
  m = line.match(PHONETIC_PAREN_RE)
  if (m && hasCJK(m[3])) {
    return { word: m[1].trim(), phonetic: `/${m[2].trim()}/`, definition: m[3].trim() }
  }

  // "word - definition" / "word — definition" / "word – definition"
  m = line.match(/^(.+?)\s*[-–—]\s*(.+)$/)
  if (m && hasCJK(m[2])) {
    return { word: m[1].trim(), phonetic: '', definition: m[2].trim() }
  }

  // "word: definition" / "word：definition" (full-width colon)
  m = line.match(/^(.+?)\s*[:：]\s*(.+)$/)
  if (m && hasCJK(m[2])) {
    return { word: m[1].trim(), phonetic: '', definition: m[2].trim() }
  }

  // "word = definition"
  m = line.match(/^(.+?)\s*=\s*(.+)$/)
  if (m && hasCJK(m[2])) {
    return { word: m[1].trim(), phonetic: '', definition: m[2].trim() }
  }

  // "word，definition" (Chinese comma)
  m = line.match(/^(.+?)\s*[，、；]\s*(.+)$/)
  if (m && hasCJK(m[2])) {
    return { word: m[1].trim(), phonetic: '', definition: m[2].trim() }
  }

  // "word<tab>definition"
  m = line.match(/^(.+?)\t+(.+)$/)
  if (m) {
    return { word: m[1].trim(), phonetic: '', definition: m[2].trim() }
  }

  // "word    definition" (2+ spaces)
  m = line.match(/^(.+?)\s{2,}(.+)$/)
  if (m && hasCJK(m[2])) {
    return { word: m[1].trim(), phonetic: '', definition: m[2].trim() }
  }

  // "word（definition）" Chinese parentheses
  m = line.match(/^(.+?)\s*[（]([^）]+)[）]\s*$/)
  if (m) {
    return { word: m[1].trim(), phonetic: '', definition: m[2].trim() }
  }

  // "word【definition】" Chinese brackets
  m = line.match(/^(.+?)\s*[【]([^】]+)[】]\s*$/)
  if (m) {
    return { word: m[1].trim(), phonetic: '', definition: m[2].trim() }
  }

  // "word (definition)" - English parens, for Chinese definitions
  m = line.match(/^(.+?)\s*\(([^)]{2,})\)\s*$/)
  if (m && hasCJK(m[2])) {
    return { word: m[1].trim(), phonetic: '', definition: m[2].trim() }
  }

  // CJK boundary split (catches "word definition" with single space)
  return splitAtCJK(line)
}

function isSkippable(line: string): boolean {
  // Skip purely Chinese lines (headers, metadata)
  if (/^[一-鿿㐀-䶿　-〿＀-￯\s\d,.，。、；;：:!！?？]+$/u.test(line)) return true
  // Skip pure number/date lines
  if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(line)) return true
  // Skip lines that are just numbers
  if (/^\d+$/.test(line)) return true
  // Skip lines that look like section headers (all caps, short)
  const stripped = line.replace(/^\d+[.)]\s*/, '').trim()
  if (/^[A-Z\s]{3,20}$/.test(stripped) && stripped.length < 30) return true
  return false
}

export function parseLine(line: string): ParsedWord | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const cleaned = stripPrefix(trimmed)
  if (!cleaned) return null

  // Skip if it looks like a header or metadata
  if (isSkippable(cleaned)) return null

  return trySeparators(cleaned)
}

export function parseText(text: string): ParseResult {
  const lines = text.split('\n')
  const words: ParsedWord[] = []
  const errors: { line: number; text: string }[] = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed) continue

    const parsed = parseLine(trimmed)
    if (parsed) {
      // Normalize: trim extra whitespace within word/definition
      parsed.word = parsed.word.replace(/\s+/g, ' ').trim()
      parsed.definition = parsed.definition.replace(/\s+/g, ' ').trim()
      words.push(parsed)
    } else {
      errors.push({ line: i + 1, text: trimmed })
    }
  }

  return { words, errors }
}

export async function parseDocxFile(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return parseText(result.value)
}
