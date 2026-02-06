import { useState } from "react";
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Table,
  Image,
  Quote,
  Minus,
  Calculator,
  ChevronDown,
} from "lucide-react";
import { Button } from "./ui/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/Popover";
import { Separator } from "./ui/Separator";
import { insertTextAtCursor } from "./Editor";

export function Toolbar() {
  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b bg-background">
      {/* Text Formatting */}
      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        tooltip="Bold (wrap selection)"
        onClick={() => insertTextAtCursor("**bold**")}
      />
      <ToolbarButton
        icon={<Italic className="h-4 w-4" />}
        tooltip="Italic (wrap selection)"
        onClick={() => insertTextAtCursor("*italic*")}
      />
      <ToolbarButton
        icon={<Code className="h-4 w-4" />}
        tooltip="Inline Code"
        onClick={() => insertTextAtCursor("`code`")}
      />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Insert Blocks */}
      <ToolbarButton
        icon={<Calculator className="h-4 w-4" />}
        tooltip="Equation"
        onClick={() => insertTextAtCursor("\n@equation(label: eq:, mode: display)\nE = mc^2\n")}
      />
      <ToolbarButton
        icon={<Code className="h-4 w-4" />}
        tooltip="Code Block"
        onClick={() => insertTextAtCursor("\n@code(python)\n# Your code here\n")}
      />
      <ToolbarButton
        icon={<Table className="h-4 w-4" />}
        tooltip="Table"
        onClick={() => insertTextAtCursor("\n@table\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n")}
      />
      <ToolbarButton
        icon={<Image className="h-4 w-4" />}
        tooltip="Figure"
        onClick={() => insertTextAtCursor("\n@figure(src: /path/to/image.png, alt: Description)\nFigure caption here.\n")}
      />
      <ToolbarButton
        icon={<List className="h-4 w-4" />}
        tooltip="Unordered List"
        onClick={() => insertTextAtCursor("\n@list\n- Item 1\n- Item 2\n- Item 3\n")}
      />
      <ToolbarButton
        icon={<ListOrdered className="h-4 w-4" />}
        tooltip="Ordered List"
        onClick={() => insertTextAtCursor("\n@list(ordered)\n1. Step 1\n2. Step 2\n3. Step 3\n")}
      />
      <ToolbarButton
        icon={<Quote className="h-4 w-4" />}
        tooltip="Quote"
        onClick={() => insertTextAtCursor("\n@quote\nYour quote here.\n")}
      />
      <ToolbarButton
        icon={<Minus className="h-4 w-4" />}
        tooltip="Horizontal Rule"
        onClick={() => insertTextAtCursor("\n---\n")}
      />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Symbol Palettes */}
      <SymbolPalette
        label="Greek"
        symbols={greekLetters}
      />
      <SymbolPalette
        label="Math"
        symbols={mathSymbols}
      />
      <SymbolPalette
        label="Arrows"
        symbols={arrowSymbols}
      />
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
}

function ToolbarButton({ icon, tooltip, onClick }: ToolbarButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      title={tooltip}
      onClick={onClick}
    >
      {icon}
    </Button>
  );
}

interface SymbolPaletteProps {
  label: string;
  symbols: Array<{ name: string; latex: string; display?: string }>;
}

function SymbolPalette({ label, symbols }: SymbolPaletteProps) {
  const [open, setOpen] = useState(false);

  const handleInsert = (latex: string) => {
    insertTextAtCursor(latex);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
          {label}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="grid grid-cols-6 gap-1">
          {symbols.map((symbol) => (
            <Button
              key={symbol.name}
              variant="ghost"
              size="sm"
              className="h-8 w-full p-0 font-mono text-lg"
              title={`\\${symbol.name}`}
              onClick={() => handleInsert(symbol.latex)}
            >
              {symbol.display || symbol.name}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const greekLetters = [
  { name: "alpha", latex: "\\alpha", display: "α" },
  { name: "beta", latex: "\\beta", display: "β" },
  { name: "gamma", latex: "\\gamma", display: "γ" },
  { name: "delta", latex: "\\delta", display: "δ" },
  { name: "epsilon", latex: "\\epsilon", display: "ε" },
  { name: "zeta", latex: "\\zeta", display: "ζ" },
  { name: "eta", latex: "\\eta", display: "η" },
  { name: "theta", latex: "\\theta", display: "θ" },
  { name: "iota", latex: "\\iota", display: "ι" },
  { name: "kappa", latex: "\\kappa", display: "κ" },
  { name: "lambda", latex: "\\lambda", display: "λ" },
  { name: "mu", latex: "\\mu", display: "μ" },
  { name: "nu", latex: "\\nu", display: "ν" },
  { name: "xi", latex: "\\xi", display: "ξ" },
  { name: "pi", latex: "\\pi", display: "π" },
  { name: "rho", latex: "\\rho", display: "ρ" },
  { name: "sigma", latex: "\\sigma", display: "σ" },
  { name: "tau", latex: "\\tau", display: "τ" },
  { name: "upsilon", latex: "\\upsilon", display: "υ" },
  { name: "phi", latex: "\\phi", display: "φ" },
  { name: "chi", latex: "\\chi", display: "χ" },
  { name: "psi", latex: "\\psi", display: "ψ" },
  { name: "omega", latex: "\\omega", display: "ω" },
  { name: "Gamma", latex: "\\Gamma", display: "Γ" },
  { name: "Delta", latex: "\\Delta", display: "Δ" },
  { name: "Theta", latex: "\\Theta", display: "Θ" },
  { name: "Lambda", latex: "\\Lambda", display: "Λ" },
  { name: "Pi", latex: "\\Pi", display: "Π" },
  { name: "Sigma", latex: "\\Sigma", display: "Σ" },
  { name: "Phi", latex: "\\Phi", display: "Φ" },
  { name: "Psi", latex: "\\Psi", display: "Ψ" },
  { name: "Omega", latex: "\\Omega", display: "Ω" },
];

const mathSymbols = [
  { name: "pm", latex: "\\pm", display: "±" },
  { name: "mp", latex: "\\mp", display: "∓" },
  { name: "times", latex: "\\times", display: "×" },
  { name: "div", latex: "\\div", display: "÷" },
  { name: "cdot", latex: "\\cdot", display: "·" },
  { name: "leq", latex: "\\leq", display: "≤" },
  { name: "geq", latex: "\\geq", display: "≥" },
  { name: "neq", latex: "\\neq", display: "≠" },
  { name: "approx", latex: "\\approx", display: "≈" },
  { name: "equiv", latex: "\\equiv", display: "≡" },
  { name: "infty", latex: "\\infty", display: "∞" },
  { name: "partial", latex: "\\partial", display: "∂" },
  { name: "nabla", latex: "\\nabla", display: "∇" },
  { name: "sum", latex: "\\sum", display: "∑" },
  { name: "prod", latex: "\\prod", display: "∏" },
  { name: "int", latex: "\\int", display: "∫" },
  { name: "sqrt", latex: "\\sqrt{}", display: "√" },
  { name: "frac", latex: "\\frac{}{}", display: "÷" },
  { name: "in", latex: "\\in", display: "∈" },
  { name: "notin", latex: "\\notin", display: "∉" },
  { name: "subset", latex: "\\subset", display: "⊂" },
  { name: "supset", latex: "\\supset", display: "⊃" },
  { name: "forall", latex: "\\forall", display: "∀" },
  { name: "exists", latex: "\\exists", display: "∃" },
];

const arrowSymbols = [
  { name: "rightarrow", latex: "\\rightarrow", display: "→" },
  { name: "leftarrow", latex: "\\leftarrow", display: "←" },
  { name: "leftrightarrow", latex: "\\leftrightarrow", display: "↔" },
  { name: "Rightarrow", latex: "\\Rightarrow", display: "⇒" },
  { name: "Leftarrow", latex: "\\Leftarrow", display: "⇐" },
  { name: "Leftrightarrow", latex: "\\Leftrightarrow", display: "⇔" },
  { name: "uparrow", latex: "\\uparrow", display: "↑" },
  { name: "downarrow", latex: "\\downarrow", display: "↓" },
  { name: "mapsto", latex: "\\mapsto", display: "↦" },
  { name: "longrightarrow", latex: "\\longrightarrow", display: "⟶" },
  { name: "longleftarrow", latex: "\\longleftarrow", display: "⟵" },
  { name: "hookrightarrow", latex: "\\hookrightarrow", display: "↪" },
];
