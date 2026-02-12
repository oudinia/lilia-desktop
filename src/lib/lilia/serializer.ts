// ============================================================================
// LML Serializer - Convert Block structures to LML text
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
} from "./types";

/**
 * Serialize document data to LML text format
 */
export function serializeToLML(data: LiliaDocumentData): string {
  const parts: string[] = [];

  // Document metadata
  parts.push(serializeDocument(data.document));

  // Blocks (organized by hierarchy)
  parts.push(serializeBlocks(data.blocks));

  // Bibliography
  if (data.bibliography.length > 0) {
    parts.push(serializeBibliography(data.bibliography));
  }

  return parts.filter(Boolean).join("\n\n");
}

/**
 * Serialize document metadata
 */
function serializeDocument(doc: LiliaDocument): string {
  const props: string[] = [];

  props.push(`  title: "${doc.title}"`);
  if (doc.author) props.push(`  author: "${doc.author}"`);
  if (doc.date) props.push(`  date: ${doc.date}`);
  props.push(`  language: ${doc.language}`);
  if (doc.template) props.push(`  template: ${doc.template}`);
  props.push(`  paperSize: ${doc.paperSize}`);
  props.push(`  fontSize: ${doc.fontSize}`);
  props.push(`  fontFamily: ${doc.fontFamily}`);

  return `@document {\n${props.join("\n")}\n}`;
}

/**
 * Serialize blocks maintaining hierarchy
 */
function serializeBlocks(blocks: Block[]): string {
  // Build tree structure
  const rootBlocks = blocks.filter((b) => !b.parentId);
  const childMap = new Map<string, Block[]>();

  for (const block of blocks) {
    if (block.parentId) {
      const children = childMap.get(block.parentId) || [];
      children.push(block);
      childMap.set(block.parentId, children);
    }
  }

  // Serialize recursively
  return rootBlocks
    .sort((a, b) => a.sortOrder.localeCompare(b.sortOrder))
    .map((block) => serializeBlock(block, childMap, 0))
    .join("\n\n");
}

/**
 * Serialize a single block with its children
 */
function serializeBlock(
  block: Block,
  childMap: Map<string, Block[]>,
  indent: number
): string {
  const prefix = "  ".repeat(indent);
  const children = childMap.get(block.id) || [];
  const childContent = children
    .sort((a, b) => a.sortOrder.localeCompare(b.sortOrder))
    .map((child) => serializeBlock(child, childMap, indent + 1))
    .join("\n\n");

  switch (block.type) {
    case "section":
      return serializeSectionBlock(block, childContent, prefix);
    case "paragraph":
      return serializeParagraphBlock(block, prefix);
    case "heading":
      return serializeHeadingBlock(block, prefix);
    case "equation":
      return serializeEquationBlock(block, prefix);
    case "figure":
      return serializeFigureBlock(block, prefix);
    case "table":
      return serializeTableBlock(block, prefix);
    case "code":
      return serializeCodeBlock(block, prefix);
    case "list":
      return serializeListBlock(block, prefix);
    case "quote":
      return serializeQuoteBlock(block, prefix);
    case "hr":
      return `${prefix}@hr {}`;
    default:
      return "";
  }
}

function serializeSectionBlock(
  block: SectionBlock,
  childContent: string,
  prefix: string
): string {
  const { title, level } = block.content;
  const type = level === 1 ? "section" : level === 2 ? "subsection" : "subsubsection";
  const label = block.label ? ` #${block.label}` : "";

  if (childContent) {
    return `${prefix}@${type}${label} "${title}" {\n${childContent}\n${prefix}}`;
  }
  return `${prefix}@${type}${label} "${title}" {}`;
}

function serializeParagraphBlock(block: ParagraphBlock, prefix: string): string {
  const { text } = block.content;
  // For single-line paragraphs, use compact format
  if (!text.includes("\n") && text.length < 80) {
    return `${prefix}@p { ${text} }`;
  }
  // Multi-line or long paragraphs
  return `${prefix}@p {\n${prefix}  ${text}\n${prefix}}`;
}

function serializeHeadingBlock(block: HeadingBlock, prefix: string): string {
  const { text, level } = block.content;
  const label = block.label ? ` #${block.label}` : "";
  return `${prefix}@h${label} ${level} { ${text} }`;
}

function serializeEquationBlock(block: EquationBlock, prefix: string): string {
  const { latex } = block.content;
  const label = block.label ? ` #${block.label}` : "";

  if (latex.includes("\n")) {
    return `${prefix}@eq${label} {\n${prefix}  ${latex}\n${prefix}}`;
  }
  return `${prefix}@eq${label} { ${latex} }`;
}

function serializeFigureBlock(block: FigureBlock, prefix: string): string {
  const { src, alt, caption, width } = block.content;
  const label = block.label ? ` #${block.label}` : "";

  const props: string[] = [];
  props.push(`${prefix}  src: "${src}"`);
  if (alt) props.push(`${prefix}  alt: "${alt}"`);
  if (caption) props.push(`${prefix}  caption: "${caption}"`);
  if (width) props.push(`${prefix}  width: ${width}`);

  return `${prefix}@fig${label} {\n${props.join("\n")}\n${prefix}}`;
}

function serializeTableBlock(block: TableBlock, prefix: string): string {
  const { caption, headers, rows } = block.content;
  const label = block.label ? ` #${block.label}` : "";
  const title = caption ? ` "${caption}"` : "";

  // Calculate column widths for alignment
  const allRows = [headers, ...rows];
  const colWidths = headers.map((_, i) =>
    Math.max(...allRows.map((row) => (row[i] || "").length))
  );

  // Format rows
  const formatRow = (row: string[]) =>
    "| " + row.map((cell, i) => cell.padEnd(colWidths[i])).join(" | ") + " |";

  const separator = "|" + colWidths.map((w) => "-".repeat(w + 2)).join("|") + "|";

  const tableContent = [
    formatRow(headers),
    separator,
    ...rows.map(formatRow),
  ]
    .map((line) => `${prefix}  ${line}`)
    .join("\n");

  return `${prefix}@tbl${label}${title} {\n${tableContent}\n${prefix}}`;
}

function serializeCodeBlock(block: CodeBlock, prefix: string): string {
  const { code, language } = block.content;
  const label = block.label ? ` #${block.label}` : "";

  const indentedCode = code
    .split("\n")
    .map((line) => `${prefix}  ${line}`)
    .join("\n");

  return `${prefix}@code${label} ${language} {\n${indentedCode}\n${prefix}}`;
}

function serializeListBlock(block: ListBlock, prefix: string): string {
  const { ordered, items } = block.content;
  const type = ordered ? "ordered" : "";

  const itemContent = items
    .map((item, i) => {
      const marker = ordered ? `${i + 1}.` : "-";
      return `${prefix}  ${marker} ${item}`;
    })
    .join("\n");

  return `${prefix}@list ${type} {\n${itemContent}\n${prefix}}`;
}

function serializeQuoteBlock(block: QuoteBlock, prefix: string): string {
  const { text, attribution } = block.content;

  let content = `${prefix}  ${text}`;
  if (attribution) {
    content += `\n${prefix}  -- ${attribution}`;
  }

  return `${prefix}@quote {\n${content}\n${prefix}}`;
}

/**
 * Serialize bibliography entries
 */
function serializeBibliography(entries: BibEntry[]): string {
  const entryStrings = entries.map((entry) => {
    const props: string[] = [];
    props.push(`    type: ${entry.type}`);
    props.push(`    author: "${entry.author}"`);
    props.push(`    title: "${entry.title}"`);
    props.push(`    year: ${entry.year}`);
    if (entry.journal) props.push(`    journal: "${entry.journal}"`);
    if (entry.booktitle) props.push(`    booktitle: "${entry.booktitle}"`);
    if (entry.publisher) props.push(`    publisher: "${entry.publisher}"`);
    if (entry.volume) props.push(`    volume: "${entry.volume}"`);
    if (entry.pages) props.push(`    pages: "${entry.pages}"`);
    if (entry.doi) props.push(`    doi: "${entry.doi}"`);
    if (entry.url) props.push(`    url: "${entry.url}"`);

    return `  @entry ${entry.key} {\n${props.join("\n")}\n  }`;
  });

  return `@bibliography {\n${entryStrings.join("\n\n")}\n}`;
}
