import NSpell from "nspell";

export interface SpellError {
  word: string;
  line: number;
  startColumn: number;
  endColumn: number;
  suggestions: string[];
}

let spellChecker: ReturnType<typeof NSpell> | null = null;
let isLoading = false;
let isLoaded = false;
const customWords: Set<string> = new Set();

/**
 * Initialize the spell checker by fetching dictionary files.
 */
export async function initSpellChecker(): Promise<void> {
  if (isLoaded || isLoading) return;
  isLoading = true;

  try {
    const [affResponse, dicResponse] = await Promise.all([
      fetch("/dictionaries/en.aff"),
      fetch("/dictionaries/en.dic"),
    ]);

    const aff = await affResponse.text();
    const dic = await dicResponse.text();

    spellChecker = NSpell(aff, dic);
    isLoaded = true;

    // Add any previously loaded custom words
    for (const word of customWords) {
      spellChecker.add(word);
    }
  } catch (error) {
    console.error("Failed to load spell checker dictionary:", error);
  } finally {
    isLoading = false;
  }
}

/**
 * Check if a word is spelled correctly.
 */
export function isCorrect(word: string): boolean {
  if (!spellChecker) return true;
  return spellChecker.correct(word);
}

/**
 * Get spelling suggestions for a word.
 */
export function suggest(word: string): string[] {
  if (!spellChecker) return [];
  return spellChecker.suggest(word).slice(0, 5);
}

/**
 * Add a word to the custom dictionary.
 */
export function addWord(word: string): void {
  customWords.add(word);
  if (spellChecker) {
    spellChecker.add(word);
  }
}

/**
 * Check if the spell checker is ready.
 */
export function isReady(): boolean {
  return isLoaded;
}

// Patterns to skip when spell checking
const SKIP_PATTERNS = [
  /^@\w+/,           // LML directives
  /^\\[a-z]+/i,      // LaTeX commands
  /^https?:\/\//,    // URLs
  /^[^a-zA-Z]+$/,    // Non-alphabetic tokens
  /^[A-Z]{2,}$/,     // ALL CAPS acronyms
];

function shouldSkipWord(word: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(word));
}

// Blocks where we skip spell checking entirely
const SKIP_BLOCK_PATTERNS = [
  /^@code\b/,
  /^@equation\b/,
  /^@latex$/,
];

/**
 * Check an entire document for spelling errors.
 * Skips code blocks, equations, and LaTeX blocks.
 */
export function checkDocument(content: string): SpellError[] {
  if (!spellChecker) return [];

  const errors: SpellError[] = [];
  const lines = content.split("\n");
  let inSkipBlock = false;
  let inLatexBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track @latex blocks
    if (trimmed === "@latex") {
      inLatexBlock = true;
      continue;
    }
    if (trimmed === "@endlatex") {
      inLatexBlock = false;
      continue;
    }
    if (inLatexBlock) continue;

    // Track skip blocks (@code, @equation)
    if (SKIP_BLOCK_PATTERNS.some((p) => p.test(trimmed))) {
      inSkipBlock = true;
      continue;
    }
    if (inSkipBlock) {
      // End skip block on empty line or next directive/heading
      if (trimmed === "" || trimmed.startsWith("@") || trimmed.startsWith("#")) {
        inSkipBlock = false;
      } else {
        continue;
      }
    }

    // Skip @document metadata
    if (trimmed === "@document") continue;
    if (/^\w+:\s/.test(trimmed) && i > 0 && lines[i - 1].trim() !== "") continue;

    // Tokenize line into words
    const wordRegex = /[a-zA-Z']+/g;
    let match;
    while ((match = wordRegex.exec(line)) !== null) {
      const word = match[0];

      // Skip short words and special patterns
      if (word.length <= 2) continue;
      if (shouldSkipWord(word)) continue;

      // Strip leading/trailing apostrophes
      const cleaned = word.replace(/^'+|'+$/g, "");
      if (cleaned.length <= 2) continue;

      if (!spellChecker.correct(cleaned)) {
        errors.push({
          word: cleaned,
          line: i + 1, // 1-indexed
          startColumn: match.index + 1,
          endColumn: match.index + word.length + 1,
          suggestions: spellChecker.suggest(cleaned).slice(0, 5),
        });
      }
    }
  }

  return errors;
}
