// ============================================================================
// LaTeX Parser - Import LaTeX documents to Lilia block format
// ============================================================================

import type { Block, BibEntry, BaseBlock } from "./types";

/**
 * Result of parsing a LaTeX document
 */
export interface LaTeXParseResult {
  title: string;
  author?: string;
  date?: string;
  documentClass: string;
  blocks: Block[];
  bibliography: BibEntry[];
  errors: ParseError[];
  warnings: string[];
}

/**
 * Parse error with location info
 */
export interface ParseError {
  line: number;
  message: string;
  severity: "error" | "warning";
}

/**
 * Parser options
 */
export interface LaTeXParserOptions {
  preserveLabels?: boolean;
  parseInlineMath?: boolean;
  strictMode?: boolean;
}

/**
 * Parse a LaTeX document into Lilia blocks
 */
export function parseLatex(
  latex: string,
  options: LaTeXParserOptions = {}
): LaTeXParseResult {
  const parser = new LaTeXParser(latex, options);
  return parser.parse();
}

/**
 * Parse a BibTeX file into bibliography entries
 */
export function parseBibTeX(bibtex: string): BibEntry[] {
  const entries: BibEntry[] = [];

  // Match BibTeX entries: @type{key, ... }
  const entryRegex = /@(\w+)\s*\{\s*([^,]+)\s*,([^@]*)\}/g;
  let match;

  while ((match = entryRegex.exec(bibtex)) !== null) {
    const type = match[1].toLowerCase();
    const key = match[2].trim();
    const fieldsStr = match[3];

    // Parse fields
    const fields = parseBibTeXFields(fieldsStr);

    entries.push({
      key,
      type: mapBibType(type),
      author: fields.author || "",
      title: fields.title || "",
      year: parseInt(fields.year || "0", 10),
      journal: fields.journal,
      booktitle: fields.booktitle,
      publisher: fields.publisher,
      volume: fields.volume,
      pages: fields.pages,
      doi: fields.doi,
      url: fields.url,
    });
  }

  return entries;
}

/**
 * Parse BibTeX fields from the content between braces
 */
function parseBibTeXFields(content: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // Match field = {value} or field = "value"
  const fieldRegex = /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)"|(\d+))/g;
  let match;

  while ((match = fieldRegex.exec(content)) !== null) {
    const fieldName = match[1].toLowerCase();
    const value = match[2] || match[3] || match[4] || "";
    fields[fieldName] = value.trim();
  }

  return fields;
}

/**
 * Map BibTeX types to our supported types
 */
function mapBibType(type: string): BibEntry["type"] {
  const typeMap: Record<string, BibEntry["type"]> = {
    article: "article",
    book: "book",
    inbook: "book",
    incollection: "book",
    inproceedings: "inproceedings",
    conference: "inproceedings",
    phdthesis: "thesis",
    mastersthesis: "thesis",
    thesis: "thesis",
    techreport: "misc",
    manual: "misc",
    unpublished: "misc",
    misc: "misc",
  };

  return typeMap[type] || "misc";
}

/**
 * Internal LaTeX parser class
 */
class LaTeXParser {
  private latex: string;
  private options: LaTeXParserOptions;
  private blocks: Block[] = [];
  private errors: ParseError[] = [];
  private warnings: string[] = [];
  private blockCounter = 0;

  // Document metadata
  private title = "";
  private author = "";
  private date = "";
  private documentClass = "article";

  constructor(latex: string, options: LaTeXParserOptions) {
    this.latex = latex;
    this.options = {
      preserveLabels: true,
      parseInlineMath: true,
      strictMode: false,
      ...options,
    };
  }

  parse(): LaTeXParseResult {
    // Extract preamble and body
    const docMatch = this.latex.match(
      /\\begin\{document\}([\s\S]*?)\\end\{document\}/
    );

    if (docMatch) {
      this.parsePreamble(this.latex.substring(0, docMatch.index));
      this.parseBody(docMatch[1]);
    } else {
      // No document environment, parse entire content
      this.parseBody(this.latex);
    }

    return {
      title: this.title || "Untitled Document",
      author: this.author,
      date: this.date,
      documentClass: this.documentClass,
      blocks: this.blocks,
      bibliography: [], // BibTeX is parsed separately
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Parse the preamble (before \begin{document})
   */
  private parsePreamble(preamble: string): void {
    // Document class
    const classMatch = preamble.match(/\\documentclass(?:\[[^\]]*\])?\{(\w+)\}/);
    if (classMatch) {
      this.documentClass = classMatch[1];
    }

    // Title
    const titleMatch = preamble.match(/\\title\{([^}]*)\}/);
    if (titleMatch) {
      this.title = this.cleanText(titleMatch[1]);
    }

    // Author
    const authorMatch = preamble.match(/\\author\{([^}]*)\}/);
    if (authorMatch) {
      this.author = this.cleanText(authorMatch[1]);
    }

    // Date
    const dateMatch = preamble.match(/\\date\{([^}]*)\}/);
    if (dateMatch) {
      this.date = this.cleanText(dateMatch[1]);
    }
  }

  /**
   * Parse the document body
   */
  private parseBody(body: string): void {
    // Remove comments
    body = this.removeComments(body);

    // Split into meaningful chunks
    const tokens = this.tokenize(body);

    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type === "command") {
        i = this.parseCommand(tokens, i);
      } else if (token.type === "environment") {
        i = this.parseEnvironment(tokens, i);
      } else if (token.type === "text" && token.content.trim()) {
        // Plain text paragraph
        this.addParagraphBlock(token.content.trim());
        i++;
      } else {
        i++;
      }
    }
  }

  /**
   * Remove LaTeX comments
   */
  private removeComments(text: string): string {
    // Remove line comments (but not escaped %)
    return text.replace(/(?<!\\)%.*$/gm, "");
  }

  /**
   * Tokenize LaTeX content
   */
  private tokenize(
    content: string
  ): Array<{ type: "command" | "environment" | "text"; content: string; args?: string[] }> {
    const tokens: Array<{ type: "command" | "environment" | "text"; content: string; args?: string[] }> = [];

    // Regex for commands and environments
    const patterns = [
      // Environments: \begin{name} ... \end{name}
      /\\begin\{(\w+\*?)\}([\s\S]*?)\\end\{\1\}/g,
      // Commands with braces: \command{arg}
      /\\(section|subsection|subsubsection|paragraph|chapter|title|author|textbf|textit|emph|cite|ref|label|includegraphics|caption)\*?(?:\[[^\]]*\])?\{([^}]*)\}/g,
      // Simple commands: \command
      /\\(maketitle|newpage|tableofcontents|\\|newline)/g,
    ];

    let lastIndex = 0;
    const allMatches: Array<{ match: RegExpExecArray; pattern: number }> = [];

    // Find all matches
    for (let p = 0; p < patterns.length; p++) {
      const pattern = new RegExp(patterns[p].source, "g");
      let match;
      while ((match = pattern.exec(content)) !== null) {
        allMatches.push({ match, pattern: p });
      }
    }

    // Sort by position
    allMatches.sort((a, b) => a.match.index - b.match.index);

    // Process matches
    for (const { match, pattern } of allMatches) {
      // Add text before this match
      if (match.index > lastIndex) {
        const text = content.substring(lastIndex, match.index);
        if (text.trim()) {
          tokens.push({ type: "text", content: text });
        }
      }

      if (pattern === 0) {
        // Environment
        tokens.push({
          type: "environment",
          content: match[1],
          args: [match[2]],
        });
      } else {
        // Command
        tokens.push({
          type: "command",
          content: match[1],
          args: match[2] ? [match[2]] : [],
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const text = content.substring(lastIndex);
      if (text.trim()) {
        tokens.push({ type: "text", content: text });
      }
    }

    return tokens;
  }

  /**
   * Parse a LaTeX command
   */
  private parseCommand(
    tokens: Array<{ type: string; content: string; args?: string[] }>,
    index: number
  ): number {
    const token = tokens[index];
    const cmd = token.content;
    const args = token.args || [];

    switch (cmd) {
      case "section":
        this.addHeadingBlock(args[0] || "", 1);
        break;
      case "subsection":
        this.addHeadingBlock(args[0] || "", 2);
        break;
      case "subsubsection":
        this.addHeadingBlock(args[0] || "", 3);
        break;
      case "paragraph":
        this.addHeadingBlock(args[0] || "", 4);
        break;
      case "chapter":
        this.addHeadingBlock(args[0] || "", 1);
        break;
      case "textbf":
      case "textit":
      case "emph":
        // These are inline, should be handled in paragraph parsing
        break;
      default:
        // Unknown command, skip
        break;
    }

    return index + 1;
  }

  /**
   * Parse a LaTeX environment
   */
  private parseEnvironment(
    tokens: Array<{ type: string; content: string; args?: string[] }>,
    index: number
  ): number {
    const token = tokens[index];
    const envName = token.content;
    const envContent = token.args?.[0] || "";

    switch (envName) {
      case "equation":
      case "equation*":
        this.addEquationBlock(envContent, true);
        break;
      case "align":
      case "align*":
        this.addEquationBlock(envContent, !envName.endsWith("*"));
        break;
      case "gather":
      case "gather*":
        this.addEquationBlock(envContent, !envName.endsWith("*"));
        break;
      case "figure":
        this.parseFigureEnvironment(envContent);
        break;
      case "table":
        this.parseTableEnvironment(envContent);
        break;
      case "tabular":
        this.parseTabular(envContent);
        break;
      case "itemize":
        this.parseList(envContent, false);
        break;
      case "enumerate":
        this.parseList(envContent, true);
        break;
      case "quote":
      case "quotation":
        this.addQuoteBlock(envContent);
        break;
      case "lstlisting":
      case "verbatim":
        this.addCodeBlock(envContent, "text");
        break;
      case "abstract":
        this.addParagraphBlock(envContent);
        break;
      case "theorem":
      case "lemma":
      case "corollary":
      case "proposition":
      case "definition":
      case "remark":
      case "example":
      case "proof":
        // These would be handled specially if we had theorem blocks
        this.addParagraphBlock(`[${envName}] ${envContent}`);
        break;
      default:
        // Unknown environment, treat content as paragraphs
        if (envContent.trim()) {
          this.addParagraphBlock(envContent.trim());
        }
        break;
    }

    return index + 1;
  }

  /**
   * Parse a figure environment
   */
  private parseFigureEnvironment(content: string): void {
    // Extract includegraphics
    const imgMatch = content.match(
      /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/
    );
    const captionMatch = content.match(/\\caption\{([^}]*)\}/);
    const labelMatch = content.match(/\\label\{([^}]*)\}/);

    const src = imgMatch ? imgMatch[1] : "";
    const caption = captionMatch ? this.cleanText(captionMatch[1]) : "";
    const label = labelMatch ? labelMatch[1] : undefined;

    this.addFigureBlock(src, caption, label);
  }

  /**
   * Parse a table environment
   */
  private parseTableEnvironment(content: string): void {
    // Look for tabular inside
    const tabularMatch = content.match(
      /\\begin\{tabular\}(?:\{[^}]*\})?([\s\S]*?)\\end\{tabular\}/
    );
    const captionMatch = content.match(/\\caption\{([^}]*)\}/);
    const labelMatch = content.match(/\\label\{([^}]*)\}/);

    if (tabularMatch) {
      const caption = captionMatch ? this.cleanText(captionMatch[1]) : "";
      const label = labelMatch ? labelMatch[1] : undefined;
      this.parseTabular(tabularMatch[1], caption, label);
    }
  }

  /**
   * Parse tabular content
   */
  private parseTabular(content: string, caption = "", label?: string): void {
    // Split by \\ for rows
    const rowsRaw = content.split(/\\\\/);
    const rows: string[][] = [];
    let headers: string[] = [];
    let isFirstRow = true;

    for (const rowRaw of rowsRaw) {
      const row = rowRaw.trim();
      if (!row || row === "\\hline" || row === "\\toprule" || row === "\\midrule" || row === "\\bottomrule") {
        continue;
      }

      // Split by & for columns
      const cells = row
        .split("&")
        .map((cell) => this.cleanText(cell.trim()));

      if (cells.length > 0 && cells.some((c) => c)) {
        if (isFirstRow) {
          headers = cells;
          isFirstRow = false;
        } else {
          rows.push(cells);
        }
      }
    }

    this.addTableBlock(headers, rows, caption, label);
  }

  /**
   * Parse list environment
   */
  private parseList(content: string, ordered: boolean): void {
    const items: string[] = [];

    // Match \item followed by content
    const itemRegex = /\\item\s*([\s\S]*?)(?=\\item|$)/g;
    let match;

    while ((match = itemRegex.exec(content)) !== null) {
      const itemText = this.cleanText(match[1].trim());
      if (itemText) {
        items.push(itemText);
      }
    }

    if (items.length > 0) {
      this.addListBlock(items, ordered);
    }
  }

  /**
   * Clean text by removing LaTeX commands and normalizing whitespace
   */
  private cleanText(text: string): string {
    return text
      // Replace \textbf{...} with *...*
      .replace(/\\textbf\{([^}]*)\}/g, "**$1**")
      // Replace \textit{...} and \emph{...} with *...*
      .replace(/\\(?:textit|emph)\{([^}]*)\}/g, "*$1*")
      // Replace \texttt{...} with `...`
      .replace(/\\texttt\{([^}]*)\}/g, "`$1`")
      // Replace $...$ with inline math notation
      .replace(/\$([^$]+)\$/g, this.options.parseInlineMath ? "$$1$" : "$1")
      // Replace \cite{...} with @cite{...}
      .replace(/\\cite\{([^}]*)\}/g, "@cite{$1}")
      // Replace \ref{...} with @ref{...}
      .replace(/\\ref\{([^}]*)\}/g, "@ref{$1}")
      // Replace \\ with newline
      .replace(/\\\\/g, "\n")
      // Remove remaining simple commands
      .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?\{([^}]*)\}/g, "$1")
      // Remove bare commands
      .replace(/\\[a-zA-Z]+\*?/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Generate a unique block ID
   */
  private generateBlockId(): string {
    return `imported-${++this.blockCounter}`;
  }

  /**
   * Generate sort order
   */
  private generateSortOrder(): string {
    return String(this.blockCounter).padStart(6, "0");
  }

  /**
   * Create base block properties
   */
  private createBaseBlock(): Omit<BaseBlock, "type"> {
    return {
      id: this.generateBlockId(),
      sortOrder: this.generateSortOrder(),
      depth: 0,
    };
  }

  /**
   * Add a paragraph block
   */
  private addParagraphBlock(text: string): void {
    if (!text.trim()) return;

    this.blocks.push({
      ...this.createBaseBlock(),
      type: "paragraph",
      content: { text: this.cleanText(text) },
    } as Block);
  }

  /**
   * Add a heading block
   */
  private addHeadingBlock(text: string, level: number): void {
    this.blocks.push({
      ...this.createBaseBlock(),
      type: "heading",
      content: {
        text: this.cleanText(text),
        level: Math.min(level, 6) as 1 | 2 | 3 | 4 | 5 | 6,
      },
    } as Block);
  }

  /**
   * Add an equation block
   */
  private addEquationBlock(latex: string, numbered: boolean): void {
    this.blocks.push({
      ...this.createBaseBlock(),
      type: "equation",
      content: {
        latex: latex.trim(),
        numbered,
      },
    } as Block);
  }

  /**
   * Add a figure block
   */
  private addFigureBlock(src: string, caption: string, label?: string): void {
    const block: Block = {
      ...this.createBaseBlock(),
      type: "figure",
      content: {
        src,
        alt: caption || "Figure",
        caption,
      },
    } as Block;

    if (label && this.options.preserveLabels) {
      block.label = label;
    }

    this.blocks.push(block);
  }

  /**
   * Add a table block
   */
  private addTableBlock(
    headers: string[],
    rows: string[][],
    caption: string,
    label?: string
  ): void {
    const block: Block = {
      ...this.createBaseBlock(),
      type: "table",
      content: {
        caption,
        headers,
        rows,
      },
    } as Block;

    if (label && this.options.preserveLabels) {
      block.label = label;
    }

    this.blocks.push(block);
  }

  /**
   * Add a code block
   */
  private addCodeBlock(code: string, language: string): void {
    this.blocks.push({
      ...this.createBaseBlock(),
      type: "code",
      content: {
        code: code.trim(),
        language,
      },
    } as Block);
  }

  /**
   * Add a list block
   */
  private addListBlock(items: string[], ordered: boolean): void {
    this.blocks.push({
      ...this.createBaseBlock(),
      type: "list",
      content: {
        ordered,
        items,
      },
    } as Block);
  }

  /**
   * Add a quote block
   */
  private addQuoteBlock(text: string): void {
    this.blocks.push({
      ...this.createBaseBlock(),
      type: "quote",
      content: {
        text: this.cleanText(text),
      },
    } as Block);
  }
}

/**
 * Validate LaTeX content before parsing
 */
export function validateLatex(latex: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for document environment
  if (!latex.includes("\\begin{document}") && latex.includes("\\documentclass")) {
    errors.push("Missing \\begin{document} environment");
  }

  // Check for balanced braces
  let braceCount = 0;
  for (const char of latex) {
    if (char === "{") braceCount++;
    if (char === "}") braceCount--;
  }
  if (braceCount !== 0) {
    errors.push("Unbalanced braces in document");
  }

  // Check for common issues
  if (latex.includes("\\end{document}") && !latex.includes("\\begin{document}")) {
    errors.push("Found \\end{document} without matching \\begin{document}");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
