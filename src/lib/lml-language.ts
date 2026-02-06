import type { Monaco } from "@monaco-editor/react";

export function registerLmlLanguage(monaco: Monaco) {
  // Register the language
  monaco.languages.register({ id: "lml" });

  // Define tokens
  monaco.languages.setMonarchTokensProvider("lml", {
    defaultToken: "",
    tokenPostfix: ".lml",

    // Keywords and block types
    blockTypes: [
      "document",
      "equation",
      "figure",
      "code",
      "table",
      "list",
      "abstract",
      "definition",
      "theorem",
      "proof",
      "lemma",
      "proposition",
      "corollary",
      "remark",
      "example",
      "bibliography",
      "bib",
      "pagebreak",
      "latex",      // Raw LaTeX passthrough block
      "endlatex",   // End of raw LaTeX block
      "lorem",      // Lorem ipsum placeholder text
      "date",       // Current date
      "toc",        // Table of contents
      "footnote",   // Footnote reference
    ],

    // LaTeX commands
    latexCommands: [
      "frac",
      "sqrt",
      "sum",
      "prod",
      "int",
      "lim",
      "infty",
      "partial",
      "nabla",
      "alpha",
      "beta",
      "gamma",
      "delta",
      "epsilon",
      "theta",
      "lambda",
      "mu",
      "pi",
      "sigma",
      "omega",
      "mathbf",
      "mathrm",
      "text",
      "left",
      "right",
      "begin",
      "end",
      "cdot",
      "times",
      "div",
      "pm",
      "mp",
      "leq",
      "geq",
      "neq",
      "approx",
      "equiv",
      "subset",
      "supset",
      "in",
      "notin",
      "forall",
      "exists",
      "rightarrow",
      "leftarrow",
      "Rightarrow",
      "Leftarrow",
      "ref",
      "cite",
      "label",
    ],

    tokenizer: {
      root: [
        // Document header
        [/@document/, "keyword"],

        // Raw LaTeX passthrough block
        [/@latex/, "keyword.latex-block", "@latexBlock"],
        [/@endlatex/, "keyword.latex-block"],

        // Block markers with parameters
        [
          /@(equation|figure|code|table|list|abstract|definition|theorem|proof|lemma|proposition|corollary|remark|example|bib|lorem)/,
          "keyword",
        ],

        // Block parameters
        [/\(([^)]*)\)/, "annotation"],

        // Headings
        [/^#{1,6}\s.*$/, "type.identifier"],

        // Horizontal rule
        [/^---$/, "comment"],

        // YAML-like properties in document header
        [/^(title|language|paperSize|fontFamily|fontSize|author|date|template):/, "attribute.name"],

        // Bibliography entry properties
        [/^(author|title|year|journal|publisher|volume|pages|doi|url|booktitle):/, "attribute.name"],

        // Inline formatting
        [/\*\*[^*]+\*\*/, "strong"], // Bold
        [/\*[^*]+\*/, "emphasis"], // Italic
        [/`[^`]+`/, "string"], // Inline code

        // Math
        [/\$[^$]+\$/, "string.math"], // Inline math
        [/\\\[[^\]]+\\\]/, "string.math"], // Display math

        // LaTeX commands
        [/\\[a-zA-Z]+/, "keyword.latex"],

        // References and citations
        [/\\ref\{[^}]+\}/, "variable.reference"],
        [/\\cite\{[^}]+\}/, "variable.citation"],

        // Table syntax
        [/\|/, "delimiter.table"],

        // List markers
        [/^[-*]\s/, "keyword.list"],
        [/^\d+\.\s/, "keyword.list"],

        // Quote markers
        [/^>\s/, "comment.quote"],

        // Comments (for future use)
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],

        // Strings
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"/, "string", "@string"],

        // Numbers
        [/\d+/, "number"],
      ],

      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],

      // Raw LaTeX block - everything until @endlatex is passed through
      latexBlock: [
        [/@endlatex/, "keyword.latex-block", "@pop"],
        [/.*$/, "string.latex-raw"],
      ],

      string: [
        [/[^\\"]+/, "string"],
        [/\\./, "string.escape"],
        [/"/, "string", "@pop"],
      ],
    },
  });

  // Define language configuration
  monaco.languages.setLanguageConfiguration("lml", {
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "$", close: "$" },
      { open: "*", close: "*" },
      { open: "_", close: "_" },
      { open: "`", close: "`" },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "$", close: "$" },
      { open: "*", close: "*" },
      { open: "_", close: "_" },
      { open: "`", close: "`" },
    ],
    folding: {
      markers: {
        start: /^#/,
        end: /^(?=#)/,
      },
    },
    indentationRules: {
      increaseIndentPattern: /^@(code|equation|table|list|figure)/,
      decreaseIndentPattern: /^$/,
    },
  });

  // Register completion provider
  monaco.languages.registerCompletionItemProvider("lml", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = [
        // Block types
        {
          label: "@document",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@document\ntitle: ${1:Untitled}\nlanguage: en\npaperSize: a4\nfontFamily: charter\nfontSize: 11\n",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Document metadata block",
          range,
        },
        {
          label: "@equation",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@equation(label: ${1:eq:name}, mode: display)\n${2:E = mc^2}\n",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Math equation block",
          range,
        },
        {
          label: "@code",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@code(${1:python})\n${2:# Your code here}\n",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Code block with syntax highlighting",
          range,
        },
        {
          label: "@table",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@table\n| ${1:Header 1} | ${2:Header 2} |\n|------------|------------|\n| ${3:Cell 1}   | ${4:Cell 2}   |\n",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Table block",
          range,
        },
        {
          label: "@figure",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@figure(src: ${1:/path/to/image.png}, alt: ${2:Description})\n${3:Caption text}\n",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Figure with caption",
          range,
        },
        {
          label: "@list",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@list\n- ${1:First item}\n- ${2:Second item}\n- ${3:Third item}\n",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Unordered list",
          range,
        },
        {
          label: "@list(ordered)",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@list(ordered)\n1. ${1:First item}\n2. ${2:Second item}\n3. ${3:Third item}\n",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Ordered list",
          range,
        },
        {
          label: "@theorem",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@theorem(label: ${1:thm:name}, title: ${2:Theorem Title})\n${3:Theorem statement}\n",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Theorem block",
          range,
        },
        {
          label: "@definition",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@definition(label: ${1:def:name}, title: ${2:Definition Title})\n${3:Definition text}\n",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Definition block",
          range,
        },
        {
          label: "@proof",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@proof\n${1:Proof content}$\\square$\n",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Proof block",
          range,
        },
        {
          label: "@bibliography",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@bibliography\n\n@bib(${1:article}, ${2:key2024})\nauthor: ${3:Author Name}\ntitle: ${4:Title}\nyear: ${5:2024}\n",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Bibliography section",
          range,
        },
        {
          label: "@latex",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@latex\n${1:% Raw LaTeX code here}\n${2:\\begin{tikzpicture}}\n${3:  \\draw (0,0) -- (1,1);}\n${4:\\end{tikzpicture}}\n@endlatex\n",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Raw LaTeX passthrough block (no preview, exported as-is)",
          range,
        },
        {
          label: "@raw",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@raw(${1:\\LaTeX})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Inline raw LaTeX (no preview, exported as-is)",
          range,
        },
        {
          label: "@lorem",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@lorem(${1|paragraphs,sentences,words|}: ${2:3})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Generate Lorem Ipsum placeholder text",
          range,
        },
        {
          label: "@date",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@date(${1|long,short,iso|})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Insert current date (long, short, or ISO format)",
          range,
        },
        {
          label: "@toc",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@toc",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Table of contents (auto-generated from headings)",
          range,
        },
        {
          label: "@fn",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@fn(${1:1})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Inline footnote reference",
          range,
        },
        {
          label: "@footnote",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@footnote(${1:1})\n${2:Footnote content here.}",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Footnote definition",
          range,
        },
        {
          label: "@hl",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@hl(${1:highlighted text})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Highlight text (inline)",
          range,
        },
        {
          label: "@note",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@note(${1:Author note here})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Author note/comment (shown as tooltip)",
          range,
        },
        {
          label: "@del",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@del(${1:deleted text})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Strikethrough text",
          range,
        },
        {
          label: "@todo",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@todo(${1:task description})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Todo marker for draft tracking",
          range,
        },
        {
          label: "@link",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@link(${1:text}, ${2:https://example.com})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Hyperlink with custom text",
          range,
        },
        {
          label: "@kbd",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@kbd(${1:Ctrl+S})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Keyboard shortcut styling",
          range,
        },
        {
          label: "@abbr",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@abbr(${1:abbr}, ${2:full text})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Abbreviation with tooltip",
          range,
        },
        {
          label: "@sub",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@sub(${1:text})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Subscript text",
          range,
        },
        {
          label: "@sup",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@sup(${1:text})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Superscript text",
          range,
        },
        {
          label: "@sc",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@sc(${1:text})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Small caps text",
          range,
        },
        {
          label: "@color",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "@color(${1:text}, ${2|red,blue,green,orange,purple|})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Colored text",
          range,
        },
        // Greek letters
        ...greekLetters.map((letter) => ({
          label: `\\${letter}`,
          kind: monaco.languages.CompletionItemKind.Constant,
          insertText: `\\${letter}`,
          documentation: `Greek letter ${letter}`,
          range,
        })),
        // Math operators
        ...mathOperators.map((op) => ({
          label: `\\${op.name}`,
          kind: monaco.languages.CompletionItemKind.Operator,
          insertText: op.insert || `\\${op.name}`,
          documentation: op.doc,
          range,
        })),
      ];

      return { suggestions };
    },
  });
}

const greekLetters = [
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
  "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "rho", "sigma",
  "tau", "upsilon", "phi", "chi", "psi", "omega",
  "Alpha", "Beta", "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi",
  "Sigma", "Phi", "Psi", "Omega",
];

const mathOperators = [
  { name: "frac", insert: "\\frac{${1:num}}{${2:den}}", doc: "Fraction" },
  { name: "sqrt", insert: "\\sqrt{${1:x}}", doc: "Square root" },
  { name: "sum", insert: "\\sum_{${1:i=0}}^{${2:n}}", doc: "Summation" },
  { name: "prod", insert: "\\prod_{${1:i=0}}^{${2:n}}", doc: "Product" },
  { name: "int", insert: "\\int_{${1:a}}^{${2:b}}", doc: "Integral" },
  { name: "lim", insert: "\\lim_{${1:x \\to 0}}", doc: "Limit" },
  { name: "infty", doc: "Infinity symbol" },
  { name: "partial", doc: "Partial derivative" },
  { name: "nabla", doc: "Nabla (gradient)" },
  { name: "cdot", doc: "Center dot" },
  { name: "times", doc: "Times" },
  { name: "div", doc: "Division" },
  { name: "pm", doc: "Plus-minus" },
  { name: "leq", doc: "Less than or equal" },
  { name: "geq", doc: "Greater than or equal" },
  { name: "neq", doc: "Not equal" },
  { name: "approx", doc: "Approximately equal" },
  { name: "rightarrow", doc: "Right arrow" },
  { name: "leftarrow", doc: "Left arrow" },
  { name: "Rightarrow", doc: "Double right arrow (implies)" },
  { name: "forall", doc: "For all" },
  { name: "exists", doc: "Exists" },
  { name: "in", doc: "Element of" },
  { name: "subset", doc: "Subset" },
];
