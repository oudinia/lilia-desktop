import katex from "katex";

// Collected data during rendering (module-level for access by render functions)
let collectedHeadings: Array<{ level: number; text: string; id: string }> = [];
let collectedFootnotes: Map<string, string> = new Map();
// Reserved for future use when @cite references are connected to bibliography entries
// let collectedCitations: Set<string> = new Set();

/**
 * Parse LML text and convert to HTML for preview.
 * Adds data-source-line attributes for scroll sync.
 * Collects footnotes, headings, and citations for @toc, @footnote, and @bibliography.
 */
export function parseLmlToHtml(content: string): string {
  const lines = content.split("\n");
  const htmlParts: string[] = [];
  let currentBlock: string[] = [];
  let currentBlockType: string | null = null;
  let currentBlockStartLine = 0;
  let inDocumentHeader = false;
  let inLatexBlock = false;

  // Reset collected data
  collectedHeadings = [];
  collectedFootnotes = new Map();
  // collectedCitations = new Set();

  // First pass: collect all headings (needed for @toc which may appear early)
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2];
      const id = "heading-" + text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      collectedHeadings.push({ level, text, id });
    }
  }

  // Also pre-collect footnote definitions
  let inFootnote = false;
  let footnoteId = "";
  let footnoteLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("@footnote")) {
      if (inFootnote && footnoteId) {
        collectedFootnotes.set(footnoteId, footnoteLines.join(" ").trim());
      }
      footnoteId = trimmed.match(/\(([^)]+)\)/)?.[1] || "";
      footnoteLines = [];
      inFootnote = true;
      continue;
    }
    if (inFootnote) {
      if (trimmed === "" || trimmed.startsWith("@") || trimmed.startsWith("#")) {
        collectedFootnotes.set(footnoteId, footnoteLines.join(" ").trim());
        inFootnote = false;
        footnoteId = "";
        footnoteLines = [];
      } else {
        footnoteLines.push(trimmed);
      }
    }
  }
  if (inFootnote && footnoteId) {
    collectedFootnotes.set(footnoteId, footnoteLines.join(" ").trim());
  }

  // Main rendering pass
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Handle @latex block specially - collect until @endlatex
    if (inLatexBlock) {
      if (trimmed === "@endlatex") {
        htmlParts.push(addSourceLine(renderBlock("latex", currentBlock), currentBlockStartLine));
        currentBlockType = null;
        currentBlock = [];
        inLatexBlock = false;
      } else {
        currentBlock.push(line);
      }
      continue;
    }

    // Skip document header
    if (trimmed === "@document") {
      inDocumentHeader = true;
      continue;
    }
    if (inDocumentHeader) {
      if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("@")) {
        inDocumentHeader = false;
      } else {
        continue;
      }
    }

    // Detect block starts
    const blockStart = detectBlockStart(trimmed);
    if (blockStart) {
      // Flush previous block
      if (currentBlock.length > 0) {
        htmlParts.push(addSourceLine(renderBlock(currentBlockType, currentBlock), currentBlockStartLine));
      }

      currentBlockType = blockStart.type;
      currentBlockStartLine = i + 1; // 1-indexed line number
      currentBlock = blockStart.params ? [blockStart.params] : [];

      // Handle @latex block start
      if (blockStart.type === "latex") {
        inLatexBlock = true;
        continue;
      }

      // Single-line blocks
      if (blockStart.type === "heading" || blockStart.type === "hr") {
        htmlParts.push(addSourceLine(renderBlock(blockStart.type, [trimmed]), i + 1));
        currentBlockType = null;
        currentBlock = [];
      }
      continue;
    }

    // Empty line ends certain blocks
    if (trimmed === "") {
      if (currentBlock.length > 0 && shouldEndBlock(currentBlockType)) {
        htmlParts.push(addSourceLine(renderBlock(currentBlockType, currentBlock), currentBlockStartLine));
        currentBlockType = null;
        currentBlock = [];
      }
      continue;
    }

    // Continue current block or start paragraph
    if (currentBlockType === null) {
      currentBlockType = "paragraph";
      currentBlockStartLine = i + 1;
    }
    currentBlock.push(line);
  }

  // Flush final block
  if (currentBlock.length > 0) {
    htmlParts.push(addSourceLine(renderBlock(currentBlockType, currentBlock), currentBlockStartLine));
  }

  // Append footnotes section if any were collected
  if (collectedFootnotes.size > 0) {
    let fnHtml = '<section class="footnotes-section"><hr /><h4>Footnotes</h4><ol class="footnotes-list">';
    for (const [id, text] of collectedFootnotes) {
      fnHtml += `<li id="fn-${escapeHtml(id)}" class="footnote-item"><span class="footnote-back"><a href="#fnref-${escapeHtml(id)}">↩</a></span> ${formatInline(text)}</li>`;
    }
    fnHtml += "</ol></section>";
    htmlParts.push(fnHtml);
  }

  return htmlParts.join("\n");
}

/**
 * Add data-source-line attribute to the first HTML tag for scroll sync.
 */
function addSourceLine(html: string, lineNumber: number): string {
  if (!html) return html;
  // Add attribute to the first HTML opening tag
  return html.replace(/^(\s*<\w+)/, `$1 data-source-line="${lineNumber}"`);
}

interface BlockStart {
  type: string;
  params?: string;
}

function detectBlockStart(line: string): BlockStart | null {
  // Headings
  const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    return { type: "heading", params: line };
  }

  // HR
  if (line === "---") {
    return { type: "hr" };
  }

  // Blocks with parameters
  if (line.startsWith("@equation")) {
    const params = line.match(/\(([^)]*)\)/)?.[1] || "";
    return { type: "equation", params };
  }
  if (line.startsWith("@code")) {
    const lang = line.match(/\((\w+)\)/)?.[1] || "text";
    return { type: "code", params: lang };
  }
  if (line.startsWith("@table")) {
    return { type: "table" };
  }
  if (line.startsWith("@list")) {
    const ordered = line.includes("ordered");
    return { type: "list", params: ordered ? "ordered" : "unordered" };
  }
  if (line.startsWith("@figure")) {
    const params = line.match(/\(([^)]*)\)/)?.[1] || "";
    return { type: "figure", params };
  }
  if (line.startsWith("@definition") || line.startsWith("@theorem") ||
      line.startsWith("@lemma") || line.startsWith("@proof") ||
      line.startsWith("@proposition") || line.startsWith("@corollary") ||
      line.startsWith("@remark") || line.startsWith("@example")) {
    const type = line.match(/@(\w+)/)?.[1] || "theorem";
    const params = line.match(/\(([^)]*)\)/)?.[1] || "";
    return { type: "theorem", params: `${type}:${params}` };
  }
  if (line.startsWith("@abstract")) {
    return { type: "abstract" };
  }

  // Lorem ipsum placeholder
  if (line.startsWith("@lorem")) {
    const params = line.match(/\(([^)]*)\)/)?.[1] || "";
    return { type: "lorem", params };
  }

  // Date
  if (line.startsWith("@date")) {
    const params = line.match(/\(([^)]*)\)/)?.[1] || "long";
    return { type: "date", params };
  }

  // Table of contents
  if (line === "@toc") {
    return { type: "toc" };
  }

  // Bibliography section
  if (line === "@bibliography") {
    return { type: "bibliography" };
  }

  // Footnote definition
  if (line.startsWith("@footnote")) {
    const id = line.match(/\(([^)]+)\)/)?.[1] || "1";
    return { type: "footnote", params: id };
  }

  // Alert/callout blocks
  if (line.startsWith("@alert")) {
    const type = line.match(/\((\w+)\)/)?.[1] || "info";
    return { type: "alert", params: type };
  }

  // Centered text block
  if (line.startsWith("@center")) {
    return { type: "center" };
  }

  // Epigraph (quotation at start of chapter)
  if (line.startsWith("@epigraph")) {
    return { type: "epigraph" };
  }

  // Drop cap paragraph
  if (line.startsWith("@dropcap")) {
    return { type: "dropcap" };
  }

  // Decorative divider
  if (line === "@divider" || line.startsWith("@divider(")) {
    const style = line.match(/\((\w+)\)/)?.[1] || "stars";
    return { type: "divider", params: style };
  }

  // Raw LaTeX passthrough block
  if (line === "@latex") {
    return { type: "latex" };
  }

  // Quote
  if (line.startsWith(">")) {
    return { type: "quote" };
  }

  return null;
}

function shouldEndBlock(type: string | null): boolean {
  return type === "paragraph" || type === "quote";
}

function renderBlock(type: string | null, lines: string[]): string {
  if (!type || lines.length === 0) return "";

  switch (type) {
    case "heading":
      return renderHeading(lines[0]);
    case "paragraph":
      return renderParagraph(lines);
    case "equation":
      return renderEquation(lines);
    case "code":
      return renderCode(lines);
    case "table":
      return renderTable(lines);
    case "list":
      return renderList(lines);
    case "figure":
      return renderFigure(lines);
    case "quote":
      return renderQuote(lines);
    case "theorem":
      return renderTheorem(lines);
    case "abstract":
      return renderAbstract(lines);
    case "latex":
      return renderLatexPassthrough(lines);
    case "lorem":
      return renderLorem(lines);
    case "date":
      return renderDate(lines);
    case "toc":
      return renderToc();
    case "footnote":
      return renderFootnote(lines);
    case "bibliography":
      return renderBibliography(lines);
    case "alert":
      return renderAlert(lines);
    case "center":
      return renderCenter(lines);
    case "epigraph":
      return renderEpigraph(lines);
    case "dropcap":
      return renderDropcap(lines);
    case "divider":
      return renderDivider(lines);
    case "hr":
      return "<hr />";
    default:
      return `<p>${escapeHtml(lines.join("\n"))}</p>`;
  }
}

function renderHeading(line: string): string {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return "";
  const level = match[1].length;
  const rawText = match[2];
  const text = formatInline(rawText);
  const id = "heading-" + rawText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `<h${level} id="${id}">${text}</h${level}>`;
}

function renderParagraph(lines: string[]): string {
  const text = formatInline(lines.join(" "));
  return `<p>${text}</p>`;
}

function renderEquation(lines: string[]): string {
  const params = lines[0] || "";
  const latex = lines.slice(1).join("\n").trim();

  // Parse label from params
  const labelMatch = params.match(/label:\s*([^,\s]+)/);
  const label = labelMatch ? labelMatch[1] : null;

  try {
    const rendered = katex.renderToString(latex, {
      displayMode: true,
      throwOnError: false,
      trust: true,
    });

    let html = `<div class="equation">${rendered}`;
    if (label) {
      html += `<span class="equation-number">(${label})</span>`;
    }
    html += "</div>";
    return html;
  } catch (error) {
    return `<div class="equation text-destructive">Error: ${error}</div>`;
  }
}

function renderCode(lines: string[]): string {
  const language = lines[0] || "text";
  const code = lines.slice(1).join("\n");
  return `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
}

function renderTable(lines: string[]): string {
  const tableLines = lines.filter((l) => l.trim().startsWith("|"));
  if (tableLines.length < 2) return "";

  const rows: string[][] = [];
  let alignments: string[] = [];

  for (const line of tableLines) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

    // Check if separator row
    if (cells.every((c) => /^:?-+:?$/.test(c))) {
      alignments = cells.map((c) => {
        if (c.startsWith(":") && c.endsWith(":")) return "center";
        if (c.endsWith(":")) return "right";
        return "left";
      });
    } else {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return "";

  const headers = rows[0];
  const dataRows = rows.slice(1);

  let html = "<table><thead><tr>";
  for (let i = 0; i < headers.length; i++) {
    const align = alignments[i] || "left";
    html += `<th style="text-align: ${align}">${formatInline(headers[i])}</th>`;
  }
  html += "</tr></thead><tbody>";

  for (const row of dataRows) {
    html += "<tr>";
    for (let i = 0; i < row.length; i++) {
      const align = alignments[i] || "left";
      html += `<td style="text-align: ${align}">${formatInline(row[i] || "")}</td>`;
    }
    html += "</tr>";
  }

  html += "</tbody></table>";
  return html;
}

function renderList(lines: string[]): string {
  const ordered = lines[0] === "ordered";
  const items = lines
    .slice(1)
    .filter((l) => l.match(/^[-*]\s+/) || l.match(/^\d+\.\s+/))
    .map((l) => l.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""));

  const tag = ordered ? "ol" : "ul";
  const itemsHtml = items.map((item) => `<li>${formatInline(item)}</li>`).join("");
  return `<${tag}>${itemsHtml}</${tag}>`;
}

function renderFigure(lines: string[]): string {
  const params = lines[0] || "";
  const caption = lines.slice(1).join(" ").trim();

  const srcMatch = params.match(/src:\s*([^,]+)/);
  const altMatch = params.match(/alt:\s*([^,]+)/);
  const widthMatch = params.match(/width:\s*(\d+)/);

  const src = srcMatch ? srcMatch[1].trim() : "";
  const alt = altMatch ? altMatch[1].trim() : "";
  const width = widthMatch ? `width: ${widthMatch[1]}%` : "";

  let html = "<figure>";
  html += `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="${width}" />`;
  if (caption) {
    html += `<figcaption>${formatInline(caption)}</figcaption>`;
  }
  html += "</figure>";
  return html;
}

function renderQuote(lines: string[]): string {
  const textLines: string[] = [];
  let attribution = "";

  for (const line of lines) {
    const content = line.replace(/^>\s*/, "");
    if (content.startsWith("--")) {
      attribution = content.slice(2).trim();
    } else {
      textLines.push(content);
    }
  }

  let html = `<blockquote><p>${formatInline(textLines.join(" "))}</p>`;
  if (attribution) {
    html += `<cite>— ${formatInline(attribution)}</cite>`;
  }
  html += "</blockquote>";
  return html;
}

function renderTheorem(lines: string[]): string {
  const [typeAndParams, ...contentLines] = lines;
  const [type, params] = typeAndParams.split(":");

  const titleMatch = params?.match(/title:\s*([^,]+)/);
  const title = titleMatch ? titleMatch[1].trim() : "";

  const typeName = type.charAt(0).toUpperCase() + type.slice(1);
  const titleText = title ? ` (${title})` : "";

  const content = formatInline(contentLines.join(" "));

  return `
    <div class="theorem-block ${type}">
      <div class="theorem-title">${typeName}${titleText}</div>
      <div>${content}</div>
    </div>
  `;
}

function renderAbstract(lines: string[]): string {
  const content = formatInline(lines.slice(1).join(" "));
  return `
    <div class="abstract">
      <h4>Abstract</h4>
      <p>${content}</p>
    </div>
  `;
}

function renderLatexPassthrough(lines: string[]): string {
  // Filter out @endlatex if present
  const content = lines.filter(l => l.trim() !== "@endlatex").join("\n");
  const preview = escapeHtml(content.substring(0, 150));
  const truncated = content.length > 150 ? "..." : "";

  return `
    <div class="latex-passthrough">
      <div class="latex-passthrough-header">
        <span class="latex-passthrough-icon">⚡</span>
        <span>Raw LaTeX — will render in final PDF</span>
      </div>
      <pre class="latex-passthrough-code"><code>${preview}${truncated}</code></pre>
    </div>
  `;
}

/**
 * Format inline content (bold, italic, code, math)
 */
function formatInline(text: string): string {
  let result = escapeHtml(text);

  // Bold: **text** or *text*
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic: _text_ or *text* (after bold)
  result = result.replace(/_([^_]+)_/g, "<em>$1</em>");
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");

  // Inline code: `text`
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Inline math: $text$
  result = result.replace(/\$([^$]+)\$/g, (_, latex) => {
    try {
      return katex.renderToString(latex, {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `<code class="text-destructive">${latex}</code>`;
    }
  });

  // References: \ref{label}
  result = result.replace(/\\ref\{([^}]+)\}/g, '<span class="reference">[$1]</span>');

  // Citations: \cite{key}
  result = result.replace(/\\cite\{([^}]+)\}/g, '<span class="citation">[$1]</span>');

  // Inline raw LaTeX: @raw(content) - show placeholder in preview
  result = result.replace(/@raw\(([^)]+)\)/g, '<code class="raw-latex" title="Will render in final PDF: $1">⚡$1</code>');

  // Inline footnote reference: @fn(id)
  result = result.replace(/@fn\(([^)]+)\)/g, '<sup class="footnote-ref" id="fnref-$1"><a href="#fn-$1">[$1]</a></sup>');

  // Inline highlight: @hl(text) or @highlight(text)
  result = result.replace(/@(?:hl|highlight)\(([^)]+)\)/g, '<mark class="highlight">$1</mark>');

  // Inline comment/note: @note(text) - shown as tooltip
  result = result.replace(/@(?:note|comment)\(([^)]+)\)/g, '<span class="author-note" title="$1">📝</span>');

  // Strikethrough: @del(text) or @strike(text)
  result = result.replace(/@(?:del|strike)\(([^)]+)\)/g, '<del>$1</del>');

  // Todo markers: @todo(text) - for draft tracking
  result = result.replace(/@todo\(([^)]+)\)/g, '<span class="todo-marker"><span class="todo-icon">☐</span> $1</span>');

  // Hyperlinks: @link(text, url) or @link(url)
  result = result.replace(/@link\(([^,)]+),\s*([^)]+)\)/g, '<a href="$2" class="lml-link">$1</a>');
  result = result.replace(/@link\(([^)]+)\)/g, '<a href="$1" class="lml-link">$1</a>');

  // Keyboard shortcuts: @kbd(key) - for keyboard shortcut styling
  result = result.replace(/@kbd\(([^)]+)\)/g, '<kbd class="keyboard-shortcut">$1</kbd>');

  // Abbreviation with tooltip: @abbr(abbr, full text)
  result = result.replace(/@abbr\(([^,]+),\s*([^)]+)\)/g, '<abbr title="$2" class="lml-abbr">$1</abbr>');

  // Subscript: @sub(text)
  result = result.replace(/@sub\(([^)]+)\)/g, '<sub>$1</sub>');

  // Superscript: @sup(text)
  result = result.replace(/@sup\(([^)]+)\)/g, '<sup>$1</sup>');

  // Small caps: @sc(text)
  result = result.replace(/@sc\(([^)]+)\)/g, '<span class="small-caps">$1</span>');

  // Colored text: @color(text, colorname)
  result = result.replace(/@color\(([^,]+),\s*([^)]+)\)/g, '<span style="color: $2">$1</span>');

  // Inline image: @img(src) or @img(src, alt)
  result = result.replace(/@img\(([^,)]+),\s*([^)]+)\)/g, '<img src="$1" alt="$2" class="inline-img" />');
  result = result.replace(/@img\(([^)]+)\)/g, '<img src="$1" alt="" class="inline-img" />');

  return result;
}

/**
 * Render current date
 */
function renderDate(lines: string[]): string {
  const format = lines[0]?.toLowerCase() || "long";
  const now = new Date();

  let dateStr: string;
  if (format === "iso") {
    dateStr = now.toISOString().split("T")[0];
  } else if (format === "short") {
    dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } else {
    dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  return `<span class="date-value">${dateStr}</span>`;
}

/**
 * Render table of contents from collected headings
 */
function renderToc(): string {
  if (collectedHeadings.length === 0) {
    return `<nav class="toc"><p><strong>Table of Contents</strong></p><p class="text-muted-foreground text-sm italic">No headings found.</p></nav>`;
  }

  let html = '<nav class="toc"><p class="toc-title"><strong>Table of Contents</strong></p><ul class="toc-list">';
  const minLevel = Math.min(...collectedHeadings.map(h => h.level));

  for (const heading of collectedHeadings) {
    const indent = heading.level - minLevel;
    const paddingLeft = indent * 1.2;
    html += `<li class="toc-item toc-level-${heading.level}" style="padding-left: ${paddingLeft}rem"><a href="#${heading.id}">${escapeHtml(heading.text)}</a></li>`;
  }

  html += "</ul></nav>";
  return html;
}

/**
 * Render footnote definition — hidden inline since footnotes are
 * collected and rendered as a section at the end of the document.
 */
function renderFootnote(_lines: string[]): string {
  // Footnotes are collected in the pre-pass and rendered at the end
  return "";
}

/**
 * Render bibliography/references section.
 * Entries are lines following @bibliography in the format:
 *   [key] Author. Title. Journal, Year.
 * Or just freeform text lines.
 */
function renderBibliography(lines: string[]): string {
  if (lines.length === 0) {
    return `<section class="bibliography"><h3>References</h3><p class="text-muted-foreground text-sm italic">No entries.</p></section>`;
  }

  let html = '<section class="bibliography"><h3>References</h3><ol class="bib-list">';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Support [key] prefix format
    const keyMatch = trimmed.match(/^\[([^\]]+)\]\s*(.+)$/);
    if (keyMatch) {
      html += `<li id="bib-${escapeHtml(keyMatch[1])}" class="bib-entry"><span class="bib-key">[${escapeHtml(keyMatch[1])}]</span> ${formatInline(keyMatch[2])}</li>`;
    } else {
      html += `<li class="bib-entry">${formatInline(trimmed)}</li>`;
    }
  }
  html += "</ol></section>";
  return html;
}

/**
 * Render Lorem Ipsum placeholder text
 */
function renderLorem(lines: string[]): string {
  const params = lines[0] || "";

  // Parse parameters: paragraphs: 3, sentences: 5, words: 50
  const typeMatch = params.match(/(paragraphs?|sentences?|words?):\s*(\d+)/i);
  const type = typeMatch?.[1]?.toLowerCase() || "paragraphs";
  const count = parseInt(typeMatch?.[2] || "3", 10);

  let text = "";
  if (type.startsWith("word")) {
    text = generateLoremWords(count);
  } else if (type.startsWith("sentence")) {
    text = generateLoremSentences(count);
  } else {
    text = generateLoremParagraphs(count);
  }

  return `<div class="lorem-preview"><p>${text}</p></div>`;
}

// Lorem Ipsum generator (client-side)
const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum"
];

const LOREM_OPENING = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

function generateLoremWords(count: number): string {
  if (count <= 0) return "";
  const words = ["Lorem", "ipsum", "dolor", "sit", "amet"];
  for (let i = 5; i < count; i++) {
    words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
  }
  return words.slice(0, count).join(" ");
}

function generateLoremSentences(count: number): string {
  if (count <= 0) return "";
  const sentences = [LOREM_OPENING];
  for (let i = 1; i < count; i++) {
    sentences.push(generateRandomSentence());
  }
  return sentences.slice(0, count).join(" ");
}

function generateLoremParagraphs(count: number): string {
  if (count <= 0) return "";
  const paragraphs: string[] = [];
  for (let i = 0; i < count; i++) {
    const sentenceCount = 4 + Math.floor(Math.random() * 4);
    paragraphs.push(generateLoremSentences(sentenceCount));
  }
  return paragraphs.join("</p><p>");
}

function generateRandomSentence(): string {
  const wordCount = 8 + Math.floor(Math.random() * 8);
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
  }
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(" ") + ".";
}

/**
 * Render alert/callout block
 */
function renderAlert(lines: string[]): string {
  const type = lines[0] || "info";
  const content = lines.slice(1).join(" ").trim();

  const icons: Record<string, string> = {
    info: "ℹ️",
    warning: "⚠️",
    danger: "🚨",
    success: "✅",
    tip: "💡",
    note: "📝",
  };

  const icon = icons[type] || icons.info;
  const title = type.charAt(0).toUpperCase() + type.slice(1);

  return `<div class="alert alert-${type}">
    <div class="alert-header"><span class="alert-icon">${icon}</span> <strong>${title}</strong></div>
    <div class="alert-content">${formatInline(content)}</div>
  </div>`;
}

/**
 * Render centered text block
 */
function renderCenter(lines: string[]): string {
  const content = lines.map(l => formatInline(l)).join("<br />");
  return `<div class="center-block">${content}</div>`;
}

/**
 * Render epigraph (chapter opening quotation)
 */
function renderEpigraph(lines: string[]): string {
  const textLines: string[] = [];
  let attribution = "";

  for (const line of lines) {
    if (line.startsWith("--")) {
      attribution = line.slice(2).trim();
    } else if (line.trim()) {
      textLines.push(line.trim());
    }
  }

  let html = `<div class="epigraph"><blockquote><p>${formatInline(textLines.join(" "))}</p>`;
  if (attribution) {
    html += `<footer>— ${formatInline(attribution)}</footer>`;
  }
  html += "</blockquote></div>";
  return html;
}

/**
 * Render drop cap paragraph
 */
function renderDropcap(lines: string[]): string {
  const text = lines.join(" ").trim();
  if (!text) return "";

  const firstChar = text.charAt(0);
  const rest = text.slice(1);

  return `<p class="dropcap"><span class="dropcap-letter">${firstChar}</span>${formatInline(rest)}</p>`;
}

/**
 * Render decorative divider
 */
function renderDivider(lines: string[]): string {
  const style = lines[0] || "stars";

  const dividers: Record<string, string> = {
    stars: "⁂",
    asterisk: "* * *",
    dashes: "— — —",
    dots: "• • •",
    fleuron: "❧",
    line: "───────",
  };

  const symbol = dividers[style] || dividers.stars;
  return `<div class="divider divider-${style}">${symbol}</div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
