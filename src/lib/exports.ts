// Export utilities for converting LML to various formats

/**
 * Convert LML content to LaTeX
 */
export function exportToLatex(lmlContent: string): string {
  const lines = lmlContent.split("\n");
  const output: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeContent: string[] = [];
  let documentMeta: Record<string, string> = {};
  let inDocument = false;

  // Process document metadata
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "@document") {
      inDocument = true;
      continue;
    }
    if (inDocument) {
      if (line.startsWith("#") || line.startsWith("@") || line.trim() === "") {
        if (line.trim() === "") continue;
        inDocument = false;
      } else {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          documentMeta[match[1]] = match[2];
          continue;
        }
      }
    }
    break;
  }

  // LaTeX preamble
  const paperSize = documentMeta.paperSize || "a4paper";
  const fontSize = documentMeta.fontSize || "11pt";
  const fontFamily = documentMeta.fontFamily || "charter";

  output.push("\\documentclass[" + fontSize + "," + paperSize + "]{article}");
  output.push("\\usepackage[utf8]{inputenc}");
  output.push("\\usepackage{amsmath,amssymb,amsthm}");
  output.push("\\usepackage{graphicx}");
  output.push("\\usepackage{listings}");
  output.push("\\usepackage{hyperref}");
  output.push("\\usepackage{soul}"); // For highlight (\hl) and strikethrough (\st)

  if (fontFamily === "charter") {
    output.push("\\usepackage{charter}");
  } else if (fontFamily === "times") {
    output.push("\\usepackage{times}");
  }

  output.push("");
  output.push("\\theoremstyle{definition}");
  output.push("\\newtheorem{definition}{Definition}");
  output.push("\\newtheorem{theorem}{Theorem}");
  output.push("\\newtheorem{lemma}{Lemma}");
  output.push("\\newtheorem{proposition}{Proposition}");
  output.push("\\newtheorem{corollary}{Corollary}");
  output.push("\\theoremstyle{remark}");
  output.push("\\newtheorem{remark}{Remark}");
  output.push("\\newtheorem{example}{Example}");
  output.push("");

  if (documentMeta.title) {
    output.push("\\title{" + escapeLatex(documentMeta.title) + "}");
  }
  output.push("\\date{}");
  output.push("");
  output.push("\\begin{document}");
  if (documentMeta.title) {
    output.push("\\maketitle");
  }
  output.push("");

  // Process content
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip document metadata
    if (trimmed === "@document") {
      i++;
      while (i < lines.length && !lines[i].startsWith("#") && !lines[i].startsWith("@")) {
        i++;
      }
      continue;
    }

    // Raw LaTeX passthrough - output as-is (no escaping)
    if (trimmed === "@latex") {
      i++;
      while (i < lines.length && lines[i].trim() !== "@endlatex") {
        output.push(lines[i]); // Pass through raw LaTeX unchanged
        i++;
      }
      i++; // Skip @endlatex
      continue;
    }

    // Headings
    if (trimmed.startsWith("####")) {
      output.push("\\paragraph{" + escapeLatex(trimmed.slice(4).trim()) + "}");
    } else if (trimmed.startsWith("###")) {
      output.push("\\subsubsection{" + escapeLatex(trimmed.slice(3).trim()) + "}");
    } else if (trimmed.startsWith("##")) {
      output.push("\\subsection{" + escapeLatex(trimmed.slice(2).trim()) + "}");
    } else if (trimmed.startsWith("#")) {
      output.push("\\section{" + escapeLatex(trimmed.slice(1).trim()) + "}");
    }
    // Abstract
    else if (trimmed === "@abstract") {
      output.push("\\begin{abstract}");
      i++;
      while (i < lines.length && !lines[i].startsWith("@") && !lines[i].startsWith("#")) {
        output.push(convertInlineToLatex(lines[i]));
        i++;
      }
      output.push("\\end{abstract}");
      continue;
    }
    // Equation
    else if (trimmed.startsWith("@equation")) {
      const match = trimmed.match(/@equation\(([^)]*)\)/);
      const params = parseParams(match?.[1] || "");
      const label = params.label;
      const mode = params.mode || "display";

      i++;
      const eqLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith("@") && !lines[i].startsWith("#")) {
        if (lines[i].trim()) eqLines.push(lines[i]);
        i++;
      }

      if (mode === "align") {
        output.push("\\begin{align}");
        if (label) output.push("\\label{" + label + "}");
        output.push(eqLines.join("\n"));
        output.push("\\end{align}");
      } else {
        output.push("\\begin{equation}");
        if (label) output.push("\\label{" + label + "}");
        output.push(eqLines.join("\n"));
        output.push("\\end{equation}");
      }
      continue;
    }
    // Code block
    else if (trimmed.startsWith("@code")) {
      const match = trimmed.match(/@code\((\w+)\)/);
      const lang = match?.[1] || "text";
      output.push("\\begin{lstlisting}[language=" + lang + "]");
      i++;
      while (i < lines.length && !lines[i].startsWith("@") && !lines[i].startsWith("#")) {
        output.push(lines[i]);
        i++;
      }
      output.push("\\end{lstlisting}");
      continue;
    }
    // Table
    else if (trimmed === "@table") {
      i++;
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      output.push(convertTableToLatex(tableLines));
      continue;
    }
    // Figure
    else if (trimmed.startsWith("@figure")) {
      const match = trimmed.match(/@figure\(([^)]*)\)/);
      const params = parseParams(match?.[1] || "");
      output.push("\\begin{figure}[h]");
      output.push("\\centering");
      output.push("\\includegraphics[width=0.8\\textwidth]{" + (params.src || "image") + "}");
      i++;
      if (i < lines.length && lines[i].trim()) {
        output.push("\\caption{" + escapeLatex(lines[i].trim()) + "}");
        i++;
      }
      output.push("\\end{figure}");
      continue;
    }
    // List
    else if (trimmed.startsWith("@list")) {
      const ordered = trimmed.includes("ordered");
      output.push(ordered ? "\\begin{enumerate}" : "\\begin{itemize}");
      i++;
      while (i < lines.length && (lines[i].trim().startsWith("-") || lines[i].trim().match(/^\d+\./))) {
        const item = lines[i].trim().replace(/^[-\d.]+\s*/, "");
        output.push("\\item " + convertInlineToLatex(item));
        i++;
      }
      output.push(ordered ? "\\end{enumerate}" : "\\end{itemize}");
      continue;
    }
    // Quote
    else if (trimmed === "@quote") {
      output.push("\\begin{quote}");
      i++;
      while (i < lines.length && !lines[i].startsWith("@") && !lines[i].startsWith("#")) {
        if (lines[i].trim()) output.push(convertInlineToLatex(lines[i]));
        i++;
      }
      output.push("\\end{quote}");
      continue;
    }
    // Theorem types
    else if (trimmed.match(/^@(definition|theorem|lemma|proposition|corollary|remark|example|proof)/)) {
      const typeMatch = trimmed.match(/^@(\w+)/);
      const theoremType = typeMatch?.[1] || "theorem";
      const paramsMatch = trimmed.match(/@\w+\(([^)]*)\)/);
      const params = parseParams(paramsMatch?.[1] || "");

      if (theoremType === "proof") {
        output.push("\\begin{proof}");
      } else {
        const title = params.title ? "[" + escapeLatex(params.title) + "]" : "";
        output.push("\\begin{" + theoremType + "}" + title);
        if (params.label) output.push("\\label{" + params.label + "}");
      }
      i++;
      while (i < lines.length && !lines[i].startsWith("@") && !lines[i].startsWith("#")) {
        if (lines[i].trim()) output.push(convertInlineToLatex(lines[i]));
        i++;
      }
      output.push("\\end{" + (theoremType === "proof" ? "proof" : theoremType) + "}");
      continue;
    }
    // Horizontal rule
    else if (trimmed === "---") {
      output.push("\\hrulefill");
    }
    // Page break
    else if (trimmed === "@pagebreak") {
      output.push("\\newpage");
    }
    // Lorem ipsum placeholder
    else if (trimmed.startsWith("@lorem")) {
      const typeMatch = trimmed.match(/(paragraphs?|sentences?|words?):\s*(\d+)/i);
      const type = typeMatch?.[1]?.toLowerCase() || "paragraphs";
      const count = parseInt(typeMatch?.[2] || "3", 10);
      output.push(generateLoremForLatex(type, count));
    }
    // Date
    else if (trimmed.startsWith("@date")) {
      const format = trimmed.match(/\((\w+)\)/)?.[1]?.toLowerCase() || "long";
      output.push(formatDateForLatex(format));
    }
    // Table of contents
    else if (trimmed === "@toc") {
      output.push("\\tableofcontents");
      output.push("\\newpage");
    }
    // Footnote definition (collected for end of document, skip in main flow)
    else if (trimmed.startsWith("@footnote")) {
      // Footnotes handled separately at the end
      i++;
      while (i < lines.length && !lines[i].startsWith("@") && !lines[i].startsWith("#")) {
        i++;
      }
      continue;
    }
    // Regular paragraph
    else if (trimmed && !trimmed.startsWith("@")) {
      output.push(convertInlineToLatex(line));
      output.push("");
    }

    i++;
  }

  output.push("");
  output.push("\\end{document}");

  return output.join("\n");
}

/**
 * Convert LML content to HTML (standalone document)
 */
export function exportToHtml(lmlContent: string, renderedHtml: string): string {
  // Extract title from LML
  const titleMatch = lmlContent.match(/title:\s*(.+)/);
  const title = titleMatch?.[1] || "Untitled Document";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3, h4 { margin-top: 2rem; }
    pre {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }
    code {
      font-family: 'SF Mono', Consolas, monospace;
      font-size: 0.9em;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 1rem 0;
      padding-left: 1rem;
      color: #666;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1rem 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 0.5rem;
      text-align: left;
    }
    th { background: #f5f5f5; }
    .theorem-box {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 1rem;
      margin: 1rem 0;
    }
    .theorem-box h4 { margin-top: 0; }
    .equation {
      text-align: center;
      margin: 1.5rem 0;
    }
    .abstract {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
    }
  </style>
</head>
<body>
${renderedHtml}
</body>
</html>`;
}

/**
 * Convert LML content to Markdown
 */
export function exportToMarkdown(lmlContent: string): string {
  const lines = lmlContent.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip document metadata block
    if (trimmed === "@document") {
      i++;
      while (i < lines.length && !lines[i].startsWith("#") && !lines[i].startsWith("@")) {
        i++;
      }
      continue;
    }

    // Raw LaTeX passthrough - wrap in code block for Markdown
    if (trimmed === "@latex") {
      output.push("```latex");
      i++;
      while (i < lines.length && lines[i].trim() !== "@endlatex") {
        output.push(lines[i]);
        i++;
      }
      output.push("```");
      i++; // Skip @endlatex
      continue;
    }

    // Headings pass through
    if (trimmed.startsWith("#")) {
      output.push(line);
    }
    // Abstract becomes blockquote
    else if (trimmed === "@abstract") {
      output.push("> **Abstract**");
      output.push(">");
      i++;
      while (i < lines.length && !lines[i].startsWith("@") && !lines[i].startsWith("#")) {
        if (lines[i].trim()) output.push("> " + lines[i].trim());
        i++;
      }
      output.push("");
      continue;
    }
    // Equation
    else if (trimmed.startsWith("@equation")) {
      i++;
      output.push("");
      output.push("$$");
      while (i < lines.length && !lines[i].startsWith("@") && !lines[i].startsWith("#")) {
        if (lines[i].trim()) output.push(lines[i].trim());
        i++;
      }
      output.push("$$");
      output.push("");
      continue;
    }
    // Code block
    else if (trimmed.startsWith("@code")) {
      const match = trimmed.match(/@code\((\w+)\)/);
      const lang = match?.[1] || "";
      output.push("```" + lang);
      i++;
      while (i < lines.length && !lines[i].startsWith("@") && !lines[i].startsWith("#")) {
        output.push(lines[i]);
        i++;
      }
      output.push("```");
      continue;
    }
    // Table passes through (Markdown compatible)
    else if (trimmed === "@table") {
      i++;
      while (i < lines.length && lines[i].includes("|")) {
        output.push(lines[i]);
        i++;
      }
      continue;
    }
    // Figure becomes image
    else if (trimmed.startsWith("@figure")) {
      const match = trimmed.match(/@figure\(([^)]*)\)/);
      const params = parseParams(match?.[1] || "");
      i++;
      let caption = "";
      if (i < lines.length && lines[i].trim()) {
        caption = lines[i].trim();
        i++;
      }
      output.push("![" + (params.alt || caption) + "](" + (params.src || "") + ")");
      if (caption) output.push("*" + caption + "*");
      output.push("");
      continue;
    }
    // List
    else if (trimmed.startsWith("@list")) {
      i++;
      while (i < lines.length && (lines[i].trim().startsWith("-") || lines[i].trim().match(/^\d+\./))) {
        output.push(lines[i]);
        i++;
      }
      output.push("");
      continue;
    }
    // Quote
    else if (trimmed === "@quote") {
      i++;
      while (i < lines.length && !lines[i].startsWith("@") && !lines[i].startsWith("#")) {
        if (lines[i].trim()) output.push("> " + lines[i].trim());
        i++;
      }
      output.push("");
      continue;
    }
    // Theorem types become blockquotes
    else if (trimmed.match(/^@(definition|theorem|lemma|proposition|corollary|remark|example|proof)/)) {
      const typeMatch = trimmed.match(/^@(\w+)/);
      const theoremType = typeMatch?.[1] || "theorem";
      const paramsMatch = trimmed.match(/@\w+\(([^)]*)\)/);
      const params = parseParams(paramsMatch?.[1] || "");

      const title = params.title || theoremType.charAt(0).toUpperCase() + theoremType.slice(1);
      output.push("> **" + title + "**");
      output.push(">");
      i++;
      while (i < lines.length && !lines[i].startsWith("@") && !lines[i].startsWith("#")) {
        if (lines[i].trim()) output.push("> " + lines[i].trim());
        i++;
      }
      output.push("");
      continue;
    }
    // Horizontal rule
    else if (trimmed === "---") {
      output.push("---");
    }
    // Page break becomes horizontal rule
    else if (trimmed === "@pagebreak") {
      output.push("---");
    }
    // Lorem ipsum placeholder
    else if (trimmed.startsWith("@lorem")) {
      const typeMatch = trimmed.match(/(paragraphs?|sentences?|words?):\s*(\d+)/i);
      const type = typeMatch?.[1]?.toLowerCase() || "paragraphs";
      const count = parseInt(typeMatch?.[2] || "3", 10);
      output.push(generateLoremForLatex(type, count));
      output.push("");
    }
    // Date
    else if (trimmed.startsWith("@date")) {
      const format = trimmed.match(/\((\w+)\)/)?.[1]?.toLowerCase() || "long";
      output.push(formatDateForMarkdown(format));
      output.push("");
    }
    // Table of contents
    else if (trimmed === "@toc") {
      output.push("## Table of Contents");
      output.push("");
      output.push("*[Auto-generated on export]*");
      output.push("");
    }
    // Footnote definition
    else if (trimmed.startsWith("@footnote")) {
      const id = trimmed.match(/\(([^)]+)\)/)?.[1] || "1";
      i++;
      const contentLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith("@") && !lines[i].startsWith("#")) {
        if (lines[i].trim()) contentLines.push(lines[i].trim());
        i++;
      }
      output.push(`[^${id}]: ${contentLines.join(" ")}`);
      continue;
    }
    // Regular content
    else if (trimmed) {
      // Handle inline footnotes in content
      output.push(line.replace(/@fn\(([^)]+)\)/g, "[^$1]"));
    } else {
      output.push("");
    }

    i++;
  }

  return output.join("\n");
}

// Helper functions
function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}]/g, (m) => "\\" + m)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseParams(paramString: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!paramString) return params;

  const matches = paramString.matchAll(/(\w+):\s*([^,]+)/g);
  for (const match of matches) {
    params[match[1]] = match[2].trim();
  }
  return params;
}

function convertInlineToLatex(text: string): string {
  // Convert inline formatting
  return text
    // Inline raw LaTeX passthrough - output as-is
    .replace(/@raw\(([^)]+)\)/g, "$1")
    // Inline footnote - convert to LaTeX footnote
    .replace(/@fn\(([^)]+)\)/g, "\\footnotemark[$1]")
    // Highlight - use soul package or colorbox
    .replace(/@(?:hl|highlight)\(([^)]+)\)/g, "\\hl{$1}")
    // Author note - use marginpar or comment
    .replace(/@(?:note|comment)\(([^)]+)\)/g, "% NOTE: $1")
    // Strikethrough - use soul package
    .replace(/@(?:del|strike)\(([^)]+)\)/g, "\\st{$1}")
    .replace(/\*\*(.+?)\*\*/g, "\\textbf{$1}")
    .replace(/\*(.+?)\*/g, "\\textit{$1}")
    .replace(/`(.+?)`/g, "\\texttt{$1}")
    .replace(/\\cite\{([^}]+)\}/g, "\\cite{$1}");
}

function convertTableToLatex(lines: string[]): string {
  if (lines.length < 2) return "";

  const headerLine = lines[0];
  const headers = headerLine.split("|").filter(c => c.trim()).map(c => c.trim());
  const colCount = headers.length;
  const colSpec = headers.map(() => "l").join(" | ");

  const output: string[] = [];
  output.push("\\begin{table}[h]");
  output.push("\\centering");
  output.push("\\begin{tabular}{| " + colSpec + " |}");
  output.push("\\hline");
  output.push(headers.map(h => escapeLatex(h)).join(" & ") + " \\\\");
  output.push("\\hline");

  // Skip separator line
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split("|").filter(c => c.trim()).map(c => escapeLatex(c.trim()));
    if (cells.length > 0) {
      output.push(cells.join(" & ") + " \\\\");
    }
  }

  output.push("\\hline");
  output.push("\\end{tabular}");
  output.push("\\end{table}");

  return output.join("\n");
}

// Lorem Ipsum generator for exports
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

function generateLoremForLatex(type: string, count: number): string {
  if (type.startsWith("word")) {
    return generateLoremWords(count);
  } else if (type.startsWith("sentence")) {
    return generateLoremSentences(count);
  } else {
    return generateLoremParagraphs(count);
  }
}

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
  return paragraphs.join("\n\n");
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

// Date formatting
function formatDateForLatex(format: string): string {
  const now = new Date();
  if (format === "iso") {
    return now.toISOString().split("T")[0];
  } else if (format === "short") {
    return now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } else {
    return now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
}

function formatDateForMarkdown(format: string): string {
  return formatDateForLatex(format);
}
