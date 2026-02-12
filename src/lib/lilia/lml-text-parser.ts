// ============================================================================
// LML Text Format Parser - Convert human-readable LML text to blocks
// ============================================================================
//
// This parses the human-readable LML text format:
// - @document header with YAML-like metadata
// - # Markdown-style headings
// - @block(params) syntax for structured blocks
// - Plain paragraphs (no marker)
// - --- for horizontal dividers
// - @bibliography section with @bib entries
//

import type {
  Block,
  LiliaDocument,
  LiliaDocumentData,
  BibEntry,
  SectionBlock,
  ParagraphBlock,
  HeadingBlock,
  EquationBlock,
  FigureBlock,
  TableBlock,
  CodeBlock,
  ListBlock,
  QuoteBlock,
  HrBlock,
} from "./types";

// ============================================================================
// Parser Types
// ============================================================================

interface ParseResult {
  document: LiliaDocument;
  blocks: Block[];
  bibliography: BibEntry[];
}

interface ParseError {
  line: number;
  message: string;
}

interface ParseContext {
  sortCounter: number;
  errors: ParseError[];
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse LML text format into structured document data
 */
export function parseLmlText(source: string): LiliaDocumentData {
  const context: ParseContext = {
    sortCounter: 0,
    errors: [],
  };

  // Parse document header
  const document = parseDocumentHeader(source, context);

  // Parse blocks (main content)
  const blocks = parseBlocks(source, context);

  // Parse bibliography
  const bibliography = parseBibliography(source, context);

  return { document, blocks, bibliography };
}

/**
 * Parse with error collection
 */
export function parseLmlTextWithErrors(source: string): ParseResult & { errors: ParseError[] } {
  const context: ParseContext = {
    sortCounter: 0,
    errors: [],
  };

  const document = parseDocumentHeader(source, context);
  const blocks = parseBlocks(source, context);
  const bibliography = parseBibliography(source, context);

  return { document, blocks, bibliography, errors: context.errors };
}

// ============================================================================
// Document Header Parser
// ============================================================================

/**
 * Parse @document header
 *
 * @document
 * title: My Document
 * language: en
 * paperSize: a4
 */
function parseDocumentHeader(source: string, context: ParseContext): LiliaDocument {
  const defaults: LiliaDocument = {
    id: generateId(),
    title: "Untitled Document",
    language: "en",
    paperSize: "a4",
    fontSize: 11,
    fontFamily: "charter",
  };

  // Find @document block
  const docMatch = source.match(/@document\s*\n([\s\S]*?)(?=\n\n|\n#|\n@[a-z]|$)/);
  if (!docMatch) {
    return defaults;
  }

  const headerContent = docMatch[1];
  const props = parseYamlLikeProperties(headerContent);

  return {
    id: generateId(),
    title: props.title || defaults.title,
    author: props.author,
    date: props.date,
    language: props.language || defaults.language,
    template: props.template,
    paperSize: (props.paperSize as "a4" | "letter") || defaults.paperSize,
    fontSize: props.fontSize ? parseInt(props.fontSize, 10) : defaults.fontSize,
    fontFamily: props.fontFamily || defaults.fontFamily,
  };
}

/**
 * Parse YAML-like key: value properties
 */
function parseYamlLikeProperties(content: string): Record<string, string> {
  const props: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+?)\s*$/);
    if (match) {
      props[match[1]] = match[2];
    }
  }

  return props;
}

// ============================================================================
// Block Parser
// ============================================================================

/**
 * Parse all content blocks
 */
function parseBlocks(source: string, context: ParseContext): Block[] {
  const blocks: Block[] = [];

  // Remove @document header and @bibliography sections
  let content = source
    .replace(/@document\s*\n[\s\S]*?(?=\n\n|\n#|\n@[a-z]|$)/, "")
    .replace(/@bibliography[\s\S]*$/, "");

  content = content.trim();
  if (!content) {
    return blocks;
  }

  // Split into logical sections
  const lines = content.split("\n");
  let currentBlock: string[] = [];
  let currentBlockType: string | null = null;
  let lineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    lineNumber++;

    // Check what type of line this is
    const blockStart = detectBlockStart(line);

    if (blockStart) {
      // Flush previous block
      if (currentBlock.length > 0 || currentBlockType) {
        const block = createBlockFromContent(
          currentBlockType,
          currentBlock.join("\n"),
          context
        );
        if (block) {
          blocks.push(block);
        }
      }

      // Start new block
      currentBlockType = blockStart.type;
      currentBlock = blockStart.firstLine ? [blockStart.firstLine] : [];

      // For certain blocks, continue until next block marker or empty line(s)
      if (blockStart.type === "heading") {
        // Headings are single line
        const block = createBlockFromContent(
          currentBlockType,
          line,
          context
        );
        if (block) {
          blocks.push(block);
        }
        currentBlockType = null;
        currentBlock = [];
      }
    } else if (currentBlockType === null && line.trim() === "") {
      // Skip empty lines when not in a block
      continue;
    } else if (currentBlockType === null && line.trim()) {
      // Start of paragraph (plain text)
      currentBlockType = "paragraph";
      currentBlock = [line];
    } else if (line.trim() === "" && shouldEndBlock(currentBlockType, currentBlock)) {
      // Empty line ends certain block types
      const block = createBlockFromContent(
        currentBlockType,
        currentBlock.join("\n"),
        context
      );
      if (block) {
        blocks.push(block);
      }
      currentBlockType = null;
      currentBlock = [];
    } else {
      // Continue current block
      currentBlock.push(line);
    }
  }

  // Flush final block
  if (currentBlock.length > 0 || currentBlockType) {
    const block = createBlockFromContent(
      currentBlockType,
      currentBlock.join("\n"),
      context
    );
    if (block) {
      blocks.push(block);
    }
  }

  return blocks;
}

interface BlockStart {
  type: string;
  firstLine?: string;
  params?: Record<string, string>;
}

/**
 * Detect if a line starts a new block
 */
function detectBlockStart(line: string): BlockStart | null {
  const trimmed = line.trim();

  // Heading: # text, ## text, etc.
  const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    return {
      type: "heading",
      firstLine: trimmed,
    };
  }

  // Horizontal rule: ---
  if (trimmed === "---") {
    return { type: "hr" };
  }

  // @equation(params)
  if (trimmed.startsWith("@equation")) {
    return { type: "equation", firstLine: trimmed };
  }

  // @figure(params)
  if (trimmed.startsWith("@figure")) {
    return { type: "figure", firstLine: trimmed };
  }

  // @code(language)
  if (trimmed.startsWith("@code")) {
    return { type: "code", firstLine: trimmed };
  }

  // @table
  if (trimmed.startsWith("@table")) {
    return { type: "table", firstLine: trimmed };
  }

  // @list or @list(ordered)
  if (trimmed.startsWith("@list")) {
    return { type: "list", firstLine: trimmed };
  }

  // @abstract
  if (trimmed.startsWith("@abstract")) {
    return { type: "abstract", firstLine: trimmed };
  }

  // @definition, @theorem, @proof, @lemma, @proposition, @corollary, @remark, @example
  const theoremTypes = ["definition", "theorem", "proof", "lemma", "proposition", "corollary", "remark", "example"];
  for (const type of theoremTypes) {
    if (trimmed.startsWith(`@${type}`)) {
      return { type: "theorem", firstLine: trimmed };
    }
  }

  // @pagebreak
  if (trimmed === "@pagebreak") {
    return { type: "pagebreak" };
  }

  // Quote: > text
  if (trimmed.startsWith(">")) {
    return { type: "quote", firstLine: line };
  }

  return null;
}

/**
 * Check if an empty line should end the current block
 */
function shouldEndBlock(blockType: string | null, content: string[]): boolean {
  if (!blockType) return true;

  // These blocks end on empty lines
  switch (blockType) {
    case "paragraph":
    case "quote":
      return true;
    case "equation":
    case "code":
    case "table":
    case "list":
      // Check if block seems complete
      return content.length > 1;
    default:
      return true;
  }
}

/**
 * Create a block from accumulated content
 */
function createBlockFromContent(
  blockType: string | null,
  content: string,
  context: ParseContext
): Block | null {
  if (!blockType || !content.trim()) {
    return null;
  }

  switch (blockType) {
    case "heading":
      return parseHeadingBlock(content, context);
    case "paragraph":
      return parseParagraphBlock(content, context);
    case "equation":
      return parseEquationBlock(content, context);
    case "figure":
      return parseFigureBlock(content, context);
    case "code":
      return parseCodeBlock(content, context);
    case "table":
      return parseTableBlock(content, context);
    case "list":
      return parseListBlock(content, context);
    case "quote":
      return parseQuoteBlock(content, context);
    case "hr":
      return createHrBlock(context);
    case "abstract":
      return parseAbstractBlock(content, context);
    case "theorem":
      return parseTheoremBlock(content, context);
    case "pagebreak":
      return createHrBlock(context); // Map pagebreak to hr for now
    default:
      return null;
  }
}

// ============================================================================
// Block Parsers
// ============================================================================

/**
 * Parse heading block
 * # Level 1
 * ## Level 2
 */
function parseHeadingBlock(content: string, context: ParseContext): HeadingBlock {
  const match = content.match(/^(#{1,6})\s+(.+)$/);
  const level = match ? match[1].length : 1;
  const text = match ? match[2] : content;

  return {
    id: generateId(),
    type: "heading",
    sortOrder: generateSortOrder(context),
    depth: 0,
    content: {
      text: text.trim(),
      level: Math.min(Math.max(level, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6,
    },
  };
}

/**
 * Parse paragraph block (plain text)
 */
function parseParagraphBlock(content: string, context: ParseContext): ParagraphBlock {
  // Convert LaTeX-style refs and cites back to LML format
  let text = content.trim();
  text = text.replace(/\\ref\{([^}]+)\}/g, "@ref{$1}");
  text = text.replace(/\\cite\{([^}]+)\}/g, "@cite{$1}");

  return {
    id: generateId(),
    type: "paragraph",
    sortOrder: generateSortOrder(context),
    depth: 0,
    content: { text },
  };
}

/**
 * Parse equation block
 * @equation(label: eq:energy, mode: display)
 * E = mc^2
 */
function parseEquationBlock(content: string, context: ParseContext): EquationBlock {
  const lines = content.split("\n");
  const firstLine = lines[0];

  // Parse parameters
  const paramsMatch = firstLine.match(/@equation\(([^)]*)\)/);
  const params = paramsMatch ? parseInlineParams(paramsMatch[1]) : {};

  // Rest is the LaTeX content
  const latex = lines.slice(1).join("\n").trim();

  return {
    id: generateId(),
    type: "equation",
    label: params.label,
    sortOrder: generateSortOrder(context),
    depth: 0,
    content: {
      latex,
      numbered: !!params.label,
    },
  };
}

/**
 * Parse figure block
 * @figure(src: /images/circuit.png, alt: Quantum circuit)
 * Caption text.
 */
function parseFigureBlock(content: string, context: ParseContext): FigureBlock {
  const lines = content.split("\n");
  const firstLine = lines[0];

  // Parse parameters
  const paramsMatch = firstLine.match(/@figure\(([^)]*)\)/);
  const params = paramsMatch ? parseInlineParams(paramsMatch[1]) : {};

  // Rest is caption
  const caption = lines.slice(1).join("\n").trim();

  return {
    id: generateId(),
    type: "figure",
    label: params.label,
    sortOrder: generateSortOrder(context),
    depth: 0,
    content: {
      src: params.src || "",
      alt: params.alt || "",
      caption,
      width: params.width ? parseInt(params.width, 10) : undefined,
    },
  };
}

/**
 * Parse code block
 * @code(python)
 * def hello():
 *     print("world")
 */
function parseCodeBlock(content: string, context: ParseContext): CodeBlock {
  const lines = content.split("\n");
  const firstLine = lines[0];

  // Parse language
  const langMatch = firstLine.match(/@code\((\w+)\)/);
  const language = langMatch ? langMatch[1] : "text";

  // Find code content (until caption or end)
  const codeLines: string[] = [];
  let caption = "";
  let inCaption = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Caption starts with *text*
    if (line.trim().startsWith("*") && line.trim().endsWith("*") && line.trim().length > 2) {
      caption = line.trim().slice(1, -1);
      inCaption = true;
    } else if (!inCaption) {
      codeLines.push(line);
    }
  }

  return {
    id: generateId(),
    type: "code",
    sortOrder: generateSortOrder(context),
    depth: 0,
    content: {
      code: codeLines.join("\n").trim(),
      language,
      caption: caption || undefined,
    },
  };
}

/**
 * Parse table block
 * @table
 * | Header1 | Header2 |
 * |---------|---------|
 * | Cell1   | Cell2   |
 */
function parseTableBlock(content: string, context: ParseContext): TableBlock {
  const lines = content.split("\n");
  const tableLines: string[] = [];
  let caption = "";

  for (const line of lines) {
    if (line.startsWith("@table")) continue;
    if (line.trim().startsWith("|")) {
      tableLines.push(line);
    } else if (line.trim().startsWith("*") && line.trim().endsWith("*")) {
      caption = line.trim().slice(1, -1);
    }
  }

  // Parse table rows
  const rows: string[][] = [];
  const alignment: ("left" | "center" | "right")[] = [];

  for (const line of tableLines) {
    const cells = line
      .split("|")
      .slice(1, -1) // Remove empty first/last
      .map((cell) => cell.trim());

    // Check if this is separator row
    const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));
    if (isSeparator) {
      // Parse alignment
      for (const cell of cells) {
        if (cell.startsWith(":") && cell.endsWith(":")) {
          alignment.push("center");
        } else if (cell.endsWith(":")) {
          alignment.push("right");
        } else {
          alignment.push("left");
        }
      }
    } else {
      rows.push(cells);
    }
  }

  const headers = rows[0] || [];
  const dataRows = rows.slice(1);

  return {
    id: generateId(),
    type: "table",
    sortOrder: generateSortOrder(context),
    depth: 0,
    content: {
      caption,
      headers,
      rows: dataRows,
      alignment: alignment.length > 0 ? alignment : undefined,
    },
  };
}

/**
 * Parse list block
 * @list
 * - Item 1
 * - Item 2
 *
 * @list(ordered)
 * 1. Item 1
 * 2. Item 2
 */
function parseListBlock(content: string, context: ParseContext): ListBlock {
  const lines = content.split("\n");
  const firstLine = lines[0];

  // Check if ordered
  const ordered = firstLine.includes("ordered");

  // Parse items
  const items: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Match - item or 1. item
    const match = line.match(/^[-*]\s+(.+)$/) || line.match(/^\d+\.\s+(.+)$/);
    if (match) {
      items.push(match[1].trim());
    }
  }

  return {
    id: generateId(),
    type: "list",
    sortOrder: generateSortOrder(context),
    depth: 0,
    content: {
      ordered,
      items,
    },
  };
}

/**
 * Parse quote block
 * > Quote text
 * > -- Attribution
 */
function parseQuoteBlock(content: string, context: ParseContext): QuoteBlock {
  const lines = content.split("\n");
  const textLines: string[] = [];
  let attribution = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(">")) {
      const quoteContent = trimmed.slice(1).trim();
      if (quoteContent.startsWith("--")) {
        attribution = quoteContent.slice(2).trim();
      } else {
        textLines.push(quoteContent);
      }
    }
  }

  return {
    id: generateId(),
    type: "quote",
    sortOrder: generateSortOrder(context),
    depth: 0,
    content: {
      text: textLines.join("\n"),
      attribution: attribution || undefined,
    },
  };
}

/**
 * Parse abstract block - converts to paragraph with special styling
 * @abstract
 * This thesis explores...
 */
function parseAbstractBlock(content: string, context: ParseContext): ParagraphBlock {
  const lines = content.split("\n");
  const text = lines
    .slice(1) // Skip @abstract line
    .join("\n")
    .trim();

  return {
    id: generateId(),
    type: "paragraph",
    sortOrder: generateSortOrder(context),
    depth: 0,
    content: { text: `**Abstract:** ${text}` },
  };
}

/**
 * Parse theorem-type block (definition, theorem, proof, lemma, etc.)
 * @theorem(label: thm:bell, title: Bell's Theorem)
 * No local hidden variable theory...
 */
function parseTheoremBlock(content: string, context: ParseContext): ParagraphBlock {
  const lines = content.split("\n");
  const firstLine = lines[0];

  // Extract theorem type
  const typeMatch = firstLine.match(/@(\w+)/);
  const theoremType = typeMatch ? typeMatch[1] : "theorem";

  // Parse parameters
  const paramsMatch = firstLine.match(/@\w+\(([^)]*)\)/);
  const params = paramsMatch ? parseInlineParams(paramsMatch[1]) : {};

  // Get content
  const text = lines.slice(1).join("\n").trim();

  // Format as styled paragraph
  const typeLabel = theoremType.charAt(0).toUpperCase() + theoremType.slice(1);
  const titlePart = params.title ? ` (${params.title})` : "";
  const prefix = `**${typeLabel}${titlePart}:** `;

  return {
    id: generateId(),
    type: "paragraph",
    label: params.label,
    sortOrder: generateSortOrder(context),
    depth: 0,
    content: { text: prefix + text },
  };
}

/**
 * Create HR block
 */
function createHrBlock(context: ParseContext): HrBlock {
  return {
    id: generateId(),
    type: "hr",
    sortOrder: generateSortOrder(context),
    depth: 0,
    content: {},
  };
}

// ============================================================================
// Bibliography Parser
// ============================================================================

/**
 * Parse bibliography section
 * @bibliography
 *
 * @bib(book, nielsen2000)
 * author: Nielsen, Michael A.
 * title: Quantum Computation
 * year: 2000
 */
function parseBibliography(source: string, context: ParseContext): BibEntry[] {
  const entries: BibEntry[] = [];

  // Find @bibliography section
  const bibMatch = source.match(/@bibliography[\s\S]*$/);
  if (!bibMatch) {
    return entries;
  }

  const bibContent = bibMatch[0];

  // Find all @bib entries
  const bibPattern = /@bib\((\w+),\s*(\w+)\)\s*([\s\S]*?)(?=@bib|$)/g;
  let match: RegExpExecArray | null;

  while ((match = bibPattern.exec(bibContent)) !== null) {
    const [, entryType, key, content] = match;
    const props = parseYamlLikeProperties(content);

    entries.push({
      key,
      type: entryType as BibEntry["type"],
      author: props.author || "",
      title: props.title || "",
      year: parseInt(props.year, 10) || 0,
      journal: props.journal,
      booktitle: props.booktitle,
      publisher: props.publisher,
      volume: props.volume,
      pages: props.pages,
      doi: props.doi,
      url: props.url,
    });
  }

  return entries;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse inline parameters: key: value, key2: value2
 */
function parseInlineParams(paramString: string): Record<string, string> {
  const params: Record<string, string> = {};

  // Split by comma, but handle values that might contain commas in quotes
  const parts = paramString.split(/,\s*(?=\w+:)/);

  for (const part of parts) {
    const match = part.match(/(\w+):\s*(.+)/);
    if (match) {
      params[match[1]] = match[2].trim();
    }
  }

  return params;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Generate sort order
 */
function generateSortOrder(context: ParseContext): string {
  context.sortCounter++;
  return String(context.sortCounter).padStart(10, "0");
}
