import { useEffect, useRef } from "react";
import { Star, Pencil, Trash2 } from "lucide-react";
import { Button } from "./ui/Button";
import { Formula, CATEGORY_COLORS, FORMULA_CATEGORIES } from "@/types/formula";
import katex from "katex";

interface FormulaCardProps {
  formula: Formula;
  onInsert: (formula: Formula) => void;
  onEdit: (formula: Formula) => void;
  onDelete: (formula: Formula) => void;
  onToggleFavorite: (formula: Formula) => void;
}

export function FormulaCard({
  formula,
  onInsert,
  onEdit,
  onDelete,
  onToggleFavorite,
}: FormulaCardProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previewRef.current) {
      try {
        previewRef.current.innerHTML = katex.renderToString(
          formula.latex_content,
          {
            displayMode: true,
            throwOnError: false,
            trust: true,
          }
        );
      } catch {
        previewRef.current.textContent = formula.latex_content;
      }
    }
  }, [formula.latex_content]);

  const categoryLabel =
    FORMULA_CATEGORIES.find((c) => c.id === formula.category)?.label ??
    formula.category;
  const colorClass =
    CATEGORY_COLORS[formula.category] ?? CATEGORY_COLORS.other;

  return (
    <div className="group relative p-4 rounded-lg border border-border bg-card hover:border-primary hover:shadow-md transition-all">
      {/* KaTeX Preview */}
      <div
        ref={previewRef}
        className="h-16 mb-3 flex items-center justify-center overflow-hidden text-sm"
      />

      {/* Info */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm truncate">{formula.name}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(formula);
            }}
            className="shrink-0"
            title={formula.is_favorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className={`h-4 w-4 ${
                formula.is_favorite
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground hover:text-yellow-400"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colorClass}`}
          >
            {categoryLabel}
          </span>
          {formula.is_system && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
              Built-in
            </span>
          )}
        </div>

        {formula.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {formula.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-3">
        <Button
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={() => onInsert(formula)}
        >
          Insert
        </Button>
        {!formula.is_system && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="Edit"
              onClick={() => onEdit(formula)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              title="Delete"
              onClick={() => onDelete(formula)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
