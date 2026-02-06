/**
 * LML Document Validator
 * Provides syntax checking and validation for LML documents
 */

export interface ValidationMessage {
  line: number;
  column: number;
  endColumn?: number;
  severity: "error" | "warning" | "info";
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  messages: ValidationMessage[];
}

// Known block types
const BLOCK_TYPES = [
  "document", "equation", "figure", "code", "table", "list",
  "abstract", "definition", "theorem", "proof", "lemma",
  "proposition", "corollary", "remark", "example", "bibliography",
  "bib", "pagebreak", "latex", "endlatex", "lorem", "date", "toc",
  "footnote", "alert", "center", "epigraph", "dropcap", "divider", "quote"
];

// Inline directives that take parameters
const INLINE_DIRECTIVES = [
  "fn", "hl", "highlight", "note", "comment", "del", "strike",
  "todo", "link", "kbd", "abbr", "sub", "sup", "sc", "color",
  "img", "raw", "ref", "cite"
];

/**
 * Validate LML document content
 */
export function validateLml(content: string): ValidationResult {
  const messages: ValidationMessage[] = [];
  const lines = content.split("\n");

  let inLatexBlock = false;
  let latexBlockStart = 0;
  let inCodeBlock = false;
  let codeBlockStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Track @latex block
    if (trimmed === "@latex") {
      if (inLatexBlock) {
        messages.push({
          line: lineNum,
          column: 1,
          severity: "error",
          message: "Nested @latex block. Did you forget @endlatex?",
          code: "nested-latex-block",
        });
      }
      inLatexBlock = true;
      latexBlockStart = lineNum;
      continue;
    }

    if (trimmed === "@endlatex") {
      if (!inLatexBlock) {
        messages.push({
          line: lineNum,
          column: 1,
          severity: "error",
          message: "@endlatex without matching @latex",
          code: "unmatched-endlatex",
        });
      }
      inLatexBlock = false;
      continue;
    }

    // Skip validation inside latex blocks
    if (inLatexBlock) continue;

    // Track @code block
    if (trimmed.startsWith("@code")) {
      inCodeBlock = true;
      codeBlockStart = lineNum;

      // Check for language parameter
      if (!trimmed.match(/@code\(\w+\)/)) {
        messages.push({
          line: lineNum,
          column: 1,
          severity: "info",
          message: "Code block without language. Consider adding @code(language)",
          code: "code-no-language",
        });
      }
      continue;
    }

    // End code block on next block or heading
    if (inCodeBlock && (trimmed.startsWith("@") || trimmed.startsWith("#"))) {
      inCodeBlock = false;
    }

    // Check unknown block types
    const blockMatch = trimmed.match(/^@(\w+)/);
    if (blockMatch) {
      const blockType = blockMatch[1];
      if (!BLOCK_TYPES.includes(blockType) && !INLINE_DIRECTIVES.includes(blockType)) {
        messages.push({
          line: lineNum,
          column: line.indexOf("@") + 1,
          endColumn: line.indexOf("@") + 1 + blockType.length + 1,
          severity: "warning",
          message: `Unknown directive @${blockType}`,
          code: "unknown-directive",
        });
      }
    }

    // Check for unbalanced inline directives
    for (const directive of INLINE_DIRECTIVES) {
      const pattern = new RegExp(`@${directive}\\(`, "g");
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const startIndex = match.index;
        const afterAt = line.substring(startIndex);

        // Simple parenthesis balance check
        let depth = 0;
        let closed = false;
        for (let j = afterAt.indexOf("("); j < afterAt.length; j++) {
          if (afterAt[j] === "(") depth++;
          else if (afterAt[j] === ")") {
            depth--;
            if (depth === 0) {
              closed = true;
              break;
            }
          }
        }

        if (!closed) {
          messages.push({
            line: lineNum,
            column: startIndex + 1,
            severity: "error",
            message: `Unclosed @${directive}() directive`,
            code: "unclosed-directive",
          });
        }
      }
    }

    // Check for empty headings
    if (trimmed.match(/^#{1,6}\s*$/)) {
      messages.push({
        line: lineNum,
        column: 1,
        severity: "warning",
        message: "Empty heading",
        code: "empty-heading",
      });
    }

    // Check for potential typos in common patterns
    if (trimmed.match(/^\*\*\s*\*\*$/)) {
      messages.push({
        line: lineNum,
        column: 1,
        severity: "info",
        message: "Empty bold text",
        code: "empty-bold",
      });
    }

    // Check for unbalanced math delimiters on single line
    const dollarCount = (line.match(/\$/g) || []).length;
    if (dollarCount % 2 !== 0) {
      // Could be display math spanning lines, only warn for inline
      if (!line.includes("\\[") && !line.includes("\\]")) {
        messages.push({
          line: lineNum,
          column: line.indexOf("$") + 1,
          severity: "warning",
          message: "Unbalanced $ delimiters. Check inline math.",
          code: "unbalanced-math",
        });
      }
    }

    // Check equation block parameters
    if (trimmed.startsWith("@equation")) {
      const params = trimmed.match(/\(([^)]*)\)/)?.[1] || "";
      if (params && !params.includes("label:") && !params.includes("mode:")) {
        messages.push({
          line: lineNum,
          column: 1,
          severity: "info",
          message: "Equation block should have label: or mode: parameters",
          code: "equation-params",
        });
      }
    }

    // Check figure block
    if (trimmed.startsWith("@figure")) {
      const params = trimmed.match(/\(([^)]*)\)/)?.[1] || "";
      if (!params.includes("src:")) {
        messages.push({
          line: lineNum,
          column: 1,
          severity: "error",
          message: "Figure requires src: parameter",
          code: "figure-no-src",
        });
      }
    }
  }

  // Check for unclosed blocks at end of document
  if (inLatexBlock) {
    messages.push({
      line: latexBlockStart,
      column: 1,
      severity: "error",
      message: "@latex block never closed with @endlatex",
      code: "unclosed-latex-block",
    });
  }

  return {
    valid: messages.filter(m => m.severity === "error").length === 0,
    messages: messages.sort((a, b) => a.line - b.line),
  };
}

/**
 * Get document statistics
 */
export interface DocumentStats {
  wordCount: number;
  charCount: number;
  lineCount: number;
  headingCount: number;
  equationCount: number;
  figureCount: number;
  codeBlockCount: number;
  tableCount: number;
  citationCount: number;
  footnoteCount: number;
}

export function getDocumentStats(content: string): DocumentStats {
  const lines = content.split("\n");

  // Word count (excluding markup)
  const textContent = content
    .replace(/@\w+(\([^)]*\))?/g, "")
    .replace(/[#*_`$\\{}[\]|]/g, "");
  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

  return {
    wordCount,
    charCount: content.length,
    lineCount: lines.length,
    headingCount: (content.match(/^#{1,6}\s/gm) || []).length,
    equationCount: (content.match(/@equation/g) || []).length,
    figureCount: (content.match(/@figure/g) || []).length,
    codeBlockCount: (content.match(/@code/g) || []).length,
    tableCount: (content.match(/@table/g) || []).length,
    citationCount: (content.match(/\\cite\{/g) || []).length,
    footnoteCount: (content.match(/@fn\(/g) || []).length,
  };
}
