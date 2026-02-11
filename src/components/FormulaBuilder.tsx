import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import {
  Formula,
  FORMULA_CATEGORIES,
  FORMULA_SUBCATEGORIES,
} from "@/types/formula";
import { useFormulaStore } from "@/store/formula-store";
import { useAppStore } from "@/store/app-store";
import katex from "katex";

interface FormulaBuilderProps {
  formula?: Formula | null;
  onBack: () => void;
}

export function FormulaBuilder({ formula, onBack }: FormulaBuilderProps) {
  const { createFormula, updateFormula } = useFormulaStore();
  const { showToast } = useAppStore();

  const [name, setName] = useState(formula?.name ?? "");
  const [description, setDescription] = useState(formula?.description ?? "");
  const [latexContent, setLatexContent] = useState(
    formula?.latex_content ?? ""
  );
  const [category, setCategory] = useState(formula?.category ?? "math");
  const [subcategory, setSubcategory] = useState(formula?.subcategory ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(formula?.tags ?? []);

  const previewRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isEditing = !!formula;

  const renderPreview = useCallback((latex: string) => {
    if (previewRef.current) {
      if (!latex.trim()) {
        previewRef.current.innerHTML =
          '<span class="text-muted-foreground text-sm">LaTeX preview will appear here...</span>';
        return;
      }
      try {
        previewRef.current.innerHTML = katex.renderToString(latex, {
          displayMode: true,
          throwOnError: false,
          trust: true,
        });
      } catch {
        previewRef.current.innerHTML = `<span class="text-destructive text-sm">Invalid LaTeX</span>`;
      }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => renderPreview(latexContent), 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [latexContent, renderPreview]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (!tags.includes(tag)) {
        setTags([...tags, tag]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast("Formula name is required", "error");
      return;
    }
    if (!latexContent.trim()) {
      showToast("LaTeX content is required", "error");
      return;
    }

    if (isEditing && formula) {
      const result = await updateFormula(formula.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        latex_content: latexContent.trim(),
        category,
        subcategory: subcategory || undefined,
        tags,
      });
      if (result) {
        showToast("Formula updated", "success");
        onBack();
      } else {
        showToast("Failed to update formula", "error");
      }
    } else {
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const now = new Date().toISOString();
      const result = await createFormula({
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim() || null,
        latex_content: latexContent.trim(),
        lml_content: `\n@equation(label: eq:${slug || "formula"}, mode: display)\n${latexContent.trim()}\n`,
        category,
        subcategory: subcategory || null,
        tags,
        is_favorite: false,
        is_system: false,
        usage_count: 0,
        created_at: now,
        updated_at: now,
      });
      if (result) {
        showToast("Formula created", "success");
        onBack();
      } else {
        showToast("Failed to create formula", "error");
      }
    }
  };

  const subcategories = FORMULA_SUBCATEGORIES[category] ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Library
        </Button>
        <h2 className="text-lg font-semibold">
          {isEditing ? "Edit Formula" : "New Formula"}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="formula-name">Name *</Label>
          <Input
            id="formula-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Quadratic Formula"
          />
        </div>

        {/* Category + Subcategory */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="formula-category">Category *</Label>
            <select
              id="formula-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubcategory("");
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {FORMULA_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="formula-subcategory">Subcategory</Label>
            <select
              id="formula-subcategory"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {subcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="formula-desc">Description</Label>
          <textarea
            id="formula-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the formula..."
            rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
          />
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <Label htmlFor="formula-tags">Tags</Label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <Input
            id="formula-tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Type a tag and press Enter..."
          />
        </div>

        {/* LaTeX Content */}
        <div className="space-y-1.5">
          <Label htmlFor="formula-latex">LaTeX Content *</Label>
          <textarea
            id="formula-latex"
            value={latexContent}
            onChange={(e) => setLatexContent(e.target.value)}
            placeholder="e.g., x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none"
          />
        </div>

        {/* Live Preview */}
        <div className="space-y-1.5">
          <Label>Preview</Label>
          <div
            ref={previewRef}
            className="min-h-[60px] p-4 rounded-md border border-border bg-muted/30 flex items-center justify-center overflow-x-auto"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <Button variant="ghost" onClick={onBack}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          {isEditing ? "Save Changes" : "Create Formula"}
        </Button>
      </div>
    </div>
  );
}
