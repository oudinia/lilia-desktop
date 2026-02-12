// ============================================================================
// Lilia Markup Language (LML) - Type Definitions
// ============================================================================

/**
 * Document metadata
 */
export interface LiliaDocument {
  id: string;
  title: string;
  author?: string;
  date?: string;
  language: string;
  template?: string;
  paperSize: "a4" | "letter";
  fontSize: number;
  fontFamily: string;
}

/**
 * Block types supported by LML
 */
export type BlockType =
  | "section"
  | "paragraph"
  | "heading"
  | "equation"
  | "figure"
  | "table"
  | "code"
  | "list"
  | "quote"
  | "hr";

/**
 * Base block structure
 */
export interface BaseBlock {
  id: string;
  type: BlockType;
  label?: string; // For cross-references: #eq:einstein
  sortOrder: string;
  parentId?: string; // For nesting (sections contain blocks)
  depth: number;
}

/**
 * Section block - contains other blocks
 */
export interface SectionBlock extends BaseBlock {
  type: "section";
  content: {
    title: string;
    level: 1 | 2 | 3 | 4; // section, subsection, subsubsection, paragraph
  };
}

/**
 * Paragraph block - rich text content
 */
export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  content: {
    text: string; // With inline formatting: *bold* _italic_ `code` $math$ @ref{} @cite{}
  };
}

/**
 * Heading block - standalone heading (not section)
 */
export interface HeadingBlock extends BaseBlock {
  type: "heading";
  content: {
    text: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
  };
}

/**
 * Equation block - LaTeX math
 */
export interface EquationBlock extends BaseBlock {
  type: "equation";
  content: {
    latex: string;
    numbered: boolean;
  };
}

/**
 * Figure block - image with caption
 */
export interface FigureBlock extends BaseBlock {
  type: "figure";
  content: {
    src: string; // URL or asset ID
    alt: string;
    caption: string;
    width?: number; // Percentage: 50, 75, 100
  };
}

/**
 * Table block - structured data
 */
export interface TableBlock extends BaseBlock {
  type: "table";
  content: {
    caption: string;
    headers: string[];
    rows: string[][];
    alignment?: ("left" | "center" | "right")[];
  };
}

/**
 * Code block - syntax highlighted
 */
export interface CodeBlock extends BaseBlock {
  type: "code";
  content: {
    code: string;
    language: string;
    caption?: string;
    lineNumbers?: boolean;
  };
}

/**
 * List block - ordered or unordered
 */
export interface ListBlock extends BaseBlock {
  type: "list";
  content: {
    ordered: boolean;
    items: string[]; // Each item can have inline formatting
  };
}

/**
 * Quote block - blockquote
 */
export interface QuoteBlock extends BaseBlock {
  type: "quote";
  content: {
    text: string;
    attribution?: string;
  };
}

/**
 * Horizontal rule block
 */
export interface HrBlock extends BaseBlock {
  type: "hr";
  content: Record<string, never>;
}

/**
 * Union type for all blocks
 */
export type Block =
  | SectionBlock
  | ParagraphBlock
  | HeadingBlock
  | EquationBlock
  | FigureBlock
  | TableBlock
  | CodeBlock
  | ListBlock
  | QuoteBlock
  | HrBlock;

/**
 * Bibliography entry
 */
export interface BibEntry {
  key: string; // Citation key: feynman1982
  type: "article" | "book" | "inproceedings" | "thesis" | "misc";
  author: string;
  title: string;
  year: number;
  journal?: string;
  booktitle?: string;
  publisher?: string;
  volume?: string;
  pages?: string;
  doi?: string;
  url?: string;
}

/**
 * Complete document with all data
 */
export interface LiliaDocumentData {
  document: LiliaDocument;
  blocks: Block[];
  bibliography: BibEntry[];
}

// ============================================================================
// Inline Formatting Types
// ============================================================================

export type InlineType = "text" | "bold" | "italic" | "code" | "math" | "ref" | "cite" | "link";

export interface InlineNode {
  type: InlineType;
  content: string;
  attrs?: {
    href?: string; // For links
    label?: string; // For refs
    key?: string; // For citations
  };
}

/**
 * Parse inline formatting from text
 * Input: "This is *bold* and _italic_ with $x^2$ math"
 * Output: InlineNode[]
 */
export interface ParsedInline {
  nodes: InlineNode[];
  raw: string;
}
