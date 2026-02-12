// ============================================================================
// LML Parser - Convert LML text to Block structures
// ============================================================================

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

// Generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Generate sort order
let sortCounter = 0;
function generateSortOrder(): string {
  sortCounter++;
  return String(sortCounter).padStart(10, "0");
}

/**
 * Parse LML document text into structured data
 */
export function parseLML(source: string): LiliaDocumentData {
  sortCounter = 0;

  const document = parseDocumentMeta(source);
  const blocks = parseBlocks(source);
  const bibliography = parseBibliography(source);

  return { document, blocks, bibliography };
}

/**
 * Parse @document { } metadata
 */
function parseDocumentMeta(source: string): LiliaDocument {
  const docMatch = source.match(/@document\s*\{([^}]*)\}/s);

  const defaults: LiliaDocument = {
    id: generateId(),
    title: "Untitled Document",
    language: "en",
    paperSize: "a4",
    fontSize: 11,
    fontFamily: "charter",
  };

  if (!docMatch) return defaults;

  const content = docMatch[1];
  const props = parseProperties(content);

  return {
    ...defaults,
    title: props.title || defaults.title,
    author: props.author,
    date: props.date,
    language: props.language || defaults.language,
    template: props.template,
    paperSize: (props.paperSize as "a4" | "letter") || defaults.paperSize,
    fontSize: props.fontSize ? parseInt(props.fontSize) : defaults.fontSize,
    fontFamily: props.fontFamily || defaults.fontFamily,
  };
}

/**
 * Parse key: value properties from block content
 */
function parseProperties(content: string): Record<string, string> {
  const props: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^\s*(\w+)\s*:\s*(.+?)\s*$/);
    if (match) {
      props[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }

  return props;
}

/**
 * Parse all blocks from source
 */
function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];

  // Remove @document and @bibliography sections for block parsing
  let content = source
    .replace(/@document\s*\{[^}]*\}/s, "")
    .replace(/@bibliography\s*\{[\s\S]*?\n\}/s, "");

  // Parse sections and their contents
  parseSectionsAndBlocks(content, blocks, null, 0);

  return blocks;
}

/**
 * Recursively parse sections and blocks
 */
function parseSectionsAndBlocks(
  content: string,
  blocks: Block[],
  parentId: string | null,
  depth: number
): void {
  // Match top-level blocks
  const blockPattern = /@(\w+)(?:\s+#([\w-]+))?(?:\s+"([^"]*)")?(?:\s+(\w+))?\s*\{([\s\S]*?)\}(?=\s*@|\s*$)/g;

  let match: RegExpExecArray | null;
  // First, find any plain text before the first block (becomes paragraph)
  const firstBlockMatch = content.match(/@\w+/);
  if (firstBlockMatch && firstBlockMatch.index && firstBlockMatch.index > 0) {
    const plainText = content.substring(0, firstBlockMatch.index).trim();
    if (plainText) {
      blocks.push(createParagraphBlock(plainText, parentId, depth));
    }
  }

  while ((match = blockPattern.exec(content)) !== null) {
    const [, blockType, label, title, modifier, innerContent] = match;

    switch (blockType) {
      case "section":
      case "subsection":
      case "subsubsection": {
        const level = blockType === "section" ? 1 : blockType === "subsection" ? 2 : 3;
        const sectionBlock = createSectionBlock(title || "", level, label, parentId, depth);
        blocks.push(sectionBlock);
        // Recursively parse section contents
        parseSectionsAndBlocks(innerContent, blocks, sectionBlock.id, depth + 1);
        break;
      }

      case "p":
        blocks.push(createParagraphBlock(innerContent.trim(), parentId, depth));
        break;

      case "h":
      case "heading": {
        const level = modifier ? parseInt(modifier) : 1;
        blocks.push(createHeadingBlock(innerContent.trim(), level, label, parentId, depth));
        break;
      }

      case "eq":
      case "equation":
        blocks.push(createEquationBlock(innerContent.trim(), label, parentId, depth));
        break;

      case "fig":
      case "figure":
        blocks.push(createFigureBlock(innerContent, label, parentId, depth));
        break;

      case "tbl":
      case "table":
        blocks.push(createTableBlock(innerContent, label, title, parentId, depth));
        break;

      case "code":
        blocks.push(createCodeBlock(innerContent, modifier || "text", label, parentId, depth));
        break;

      case "list":
        blocks.push(createListBlock(innerContent, modifier === "ordered", parentId, depth));
        break;

      case "quote":
        blocks.push(createQuoteBlock(innerContent, parentId, depth));
        break;

      case "hr":
        blocks.push(createHrBlock(parentId, depth));
        break;
    }

  }
}

// ============================================================================
// Block Factory Functions
// ============================================================================

function createSectionBlock(
  title: string,
  level: number,
  label: string | undefined,
  parentId: string | null,
  depth: number
): SectionBlock {
  return {
    id: generateId(),
    type: "section",
    label,
    sortOrder: generateSortOrder(),
    parentId: parentId || undefined,
    depth,
    content: {
      title,
      level: level as 1 | 2 | 3 | 4,
    },
  };
}

function createParagraphBlock(
  text: string,
  parentId: string | null,
  depth: number
): ParagraphBlock {
  return {
    id: generateId(),
    type: "paragraph",
    sortOrder: generateSortOrder(),
    parentId: parentId || undefined,
    depth,
    content: { text },
  };
}

function createHeadingBlock(
  text: string,
  level: number,
  label: string | undefined,
  parentId: string | null,
  depth: number
): HeadingBlock {
  return {
    id: generateId(),
    type: "heading",
    label,
    sortOrder: generateSortOrder(),
    parentId: parentId || undefined,
    depth,
    content: {
      text,
      level: Math.min(Math.max(level, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6,
    },
  };
}

function createEquationBlock(
  latex: string,
  label: string | undefined,
  parentId: string | null,
  depth: number
): EquationBlock {
  return {
    id: generateId(),
    type: "equation",
    label,
    sortOrder: generateSortOrder(),
    parentId: parentId || undefined,
    depth,
    content: {
      latex,
      numbered: !!label,
    },
  };
}

function createFigureBlock(
  content: string,
  label: string | undefined,
  parentId: string | null,
  depth: number
): FigureBlock {
  const props = parseProperties(content);
  return {
    id: generateId(),
    type: "figure",
    label,
    sortOrder: generateSortOrder(),
    parentId: parentId || undefined,
    depth,
    content: {
      src: props.src || "",
      alt: props.alt || "",
      caption: props.caption || "",
      width: props.width ? parseInt(props.width) : undefined,
    },
  };
}

function createTableBlock(
  content: string,
  label: string | undefined,
  caption: string | undefined,
  parentId: string | null,
  depth: number
): TableBlock {
  const lines = content.trim().split("\n");
  const rows: string[][] = [];

  for (const line of lines) {
    if (line.trim().startsWith("|")) {
      const cells = line
        .split("|")
        .slice(1, -1) // Remove empty first/last from split
        .map((cell) => cell.trim());

      // Skip separator rows (|---|---|)
      if (!cells.every((c) => /^-+$/.test(c))) {
        rows.push(cells);
      }
    }
  }

  const headers = rows[0] || [];
  const dataRows = rows.slice(1);

  return {
    id: generateId(),
    type: "table",
    label,
    sortOrder: generateSortOrder(),
    parentId: parentId || undefined,
    depth,
    content: {
      caption: caption || "",
      headers,
      rows: dataRows,
    },
  };
}

function createCodeBlock(
  content: string,
  language: string,
  label: string | undefined,
  parentId: string | null,
  depth: number
): CodeBlock {
  return {
    id: generateId(),
    type: "code",
    label,
    sortOrder: generateSortOrder(),
    parentId: parentId || undefined,
    depth,
    content: {
      code: content.trim(),
      language,
    },
  };
}

function createListBlock(
  content: string,
  ordered: boolean,
  parentId: string | null,
  depth: number
): ListBlock {
  const items = content
    .trim()
    .split("\n")
    .map((line) => line.replace(/^[-*\d.]\s*/, "").trim())
    .filter(Boolean);

  return {
    id: generateId(),
    type: "list",
    sortOrder: generateSortOrder(),
    parentId: parentId || undefined,
    depth,
    content: {
      ordered,
      items,
    },
  };
}

function createQuoteBlock(
  content: string,
  parentId: string | null,
  depth: number
): QuoteBlock {
  const lines = content.trim().split("\n");
  const text = lines
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .trim();
  const attribution = lines.find((l) => l.trim().startsWith("--"))?.replace(/^--\s*/, "");

  return {
    id: generateId(),
    type: "quote",
    sortOrder: generateSortOrder(),
    parentId: parentId || undefined,
    depth,
    content: {
      text,
      attribution,
    },
  };
}

function createHrBlock(parentId: string | null, depth: number): HrBlock {
  return {
    id: generateId(),
    type: "hr",
    sortOrder: generateSortOrder(),
    parentId: parentId || undefined,
    depth,
    content: {},
  };
}

// ============================================================================
// Bibliography Parser
// ============================================================================

function parseBibliography(source: string): BibEntry[] {
  const bibMatch = source.match(/@bibliography\s*\{([\s\S]*?)\n\}/);
  if (!bibMatch) return [];

  const entries: BibEntry[] = [];
  const entryPattern = /@entry\s+(\w+)\s*\{([^}]*)\}/g;

  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(bibMatch[1])) !== null) {
    const [, key, content] = match;
    const props = parseProperties(content);

    entries.push({
      key,
      type: (props.type as BibEntry["type"]) || "misc",
      author: props.author || "",
      title: props.title || "",
      year: parseInt(props.year) || 0,
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
