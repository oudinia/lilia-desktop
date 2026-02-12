// ============================================================================
// Lilia shared types, parsers, serializer, and importers
// ============================================================================

// Types
export type {
  LiliaDocument,
  LiliaDocumentData,
  BlockType,
  Block,
  BaseBlock,
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
  BibEntry,
  InlineType,
  InlineNode,
  ParsedInline,
} from "./types";

// Human-readable LML text parser
export { parseLmlText, parseLmlTextWithErrors } from "./lml-text-parser";

// Brace-syntax LML parser
export { parseLML } from "./parser";

// Serializer (blocks → LML text)
export { serializeToLML } from "./serializer";

// LaTeX importer + BibTeX parser
export {
  parseLatex,
  parseBibTeX,
  validateLatex,
  type LaTeXParseResult,
  type LaTeXParserOptions,
  type ParseError,
} from "./latex-importer";
