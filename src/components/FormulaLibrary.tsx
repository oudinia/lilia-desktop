import { useEffect } from "react";
import {
  Search,
  Plus,
  Star,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { FormulaCard } from "./FormulaCard";
import { FormulaBuilder } from "./FormulaBuilder";
import { useFormulaStore } from "@/store/formula-store";
import { useAppStore } from "@/store/app-store";
import { insertTextAtCursor } from "./Editor";
import {
  Formula,
  FORMULA_CATEGORIES,
  FORMULA_SUBCATEGORIES,
} from "@/types/formula";

export function FormulaLibrary() {
  const { ui, setFormulaLibraryOpen, showToast } = useAppStore();
  const {
    view,
    setView,
    selectedFormula,
    setSelectedFormula,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    favoritesOnly,
    setFavoritesOnly,
    loadFormulas,
    toggleFavorite,
    incrementUsage,
    deleteFormula,
    getFilteredFormulas,
  } = useFormulaStore();

  useEffect(() => {
    if (ui.formulaLibraryOpen) {
      loadFormulas();
    }
  }, [ui.formulaLibraryOpen, loadFormulas]);

  const handleInsert = async (formula: Formula) => {
    const slug = formula.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const lml = `\n@equation(label: eq:${slug || "formula"}, mode: display)\n${formula.latex_content}\n`;
    insertTextAtCursor(lml);
    await incrementUsage(formula.id);
    setFormulaLibraryOpen(false);
    showToast(`Inserted "${formula.name}"`, "success");
  };

  const handleEdit = (formula: Formula) => {
    setSelectedFormula(formula);
    setView("edit");
  };

  const handleDelete = async (formula: Formula) => {
    const result = await deleteFormula(formula.id);
    if (result) {
      showToast(`Deleted "${formula.name}"`, "success");
    } else {
      showToast("Failed to delete formula", "error");
    }
  };

  const handleBack = () => {
    setView("browse");
    setSelectedFormula(null);
  };

  const filteredFormulas = getFilteredFormulas();

  return (
    <Dialog
      open={ui.formulaLibraryOpen}
      onOpenChange={setFormulaLibraryOpen}
    >
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Formula Library</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {view === "browse" ? (
            <>
              {/* Left Sidebar */}
              <div className="w-52 shrink-0 border-r p-3 overflow-y-auto">
                {/* All / Favorites */}
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setFavoritesOnly(false);
                  }}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-md mb-0.5 ${
                    !selectedCategory && !favoritesOnly
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  All Formulas
                </button>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setFavoritesOnly(true);
                  }}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-md flex items-center gap-1.5 mb-2 ${
                    favoritesOnly
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  <Star className="h-3.5 w-3.5" />
                  Favorites
                </button>

                <div className="text-xs font-semibold text-muted-foreground mb-1 px-2">
                  Categories
                </div>
                {FORMULA_CATEGORIES.map((cat) => (
                  <div key={cat.id}>
                    <button
                      onClick={() => {
                        setFavoritesOnly(false);
                        setSelectedCategory(
                          selectedCategory === cat.id ? null : cat.id
                        );
                      }}
                      className={`w-full text-left text-sm px-2 py-1.5 rounded-md flex items-center justify-between ${
                        selectedCategory === cat.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span>{cat.label}</span>
                      {(FORMULA_SUBCATEGORIES[cat.id]?.length ?? 0) > 0 && (
                        <ChevronRight
                          className={`h-3 w-3 transition-transform ${
                            selectedCategory === cat.id ? "rotate-90" : ""
                          }`}
                        />
                      )}
                    </button>
                    {selectedCategory === cat.id &&
                      FORMULA_SUBCATEGORIES[cat.id] && (
                        <div className="ml-3 mt-0.5 mb-1">
                          {FORMULA_SUBCATEGORIES[cat.id].map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => setSelectedSubcategory(
                                selectedSubcategory === sub.id ? null : sub.id
                              )}
                              className={`w-full text-left text-xs px-2 py-1 rounded-md ${
                                selectedSubcategory === sub.id
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {sub.label}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>

              {/* Right Content */}
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                {/* Search + New */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search formulas..."
                      className="pl-8 h-9"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={() => setView("create")}
                  >
                    <Plus className="h-4 w-4" />
                    New Formula
                  </Button>
                </div>

                {/* Formula Grid */}
                <div className="flex-1 overflow-y-auto pr-1">
                  {filteredFormulas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <p className="text-sm">No formulas found</p>
                      <p className="text-xs mt-1">
                        Try adjusting your search or create a new formula
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-2">
                      {filteredFormulas.map((formula) => (
                        <FormulaCard
                          key={formula.id}
                          formula={formula}
                          onInsert={handleInsert}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onToggleFavorite={() => toggleFavorite(formula.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Create / Edit View */
            <div className="flex-1 p-6 overflow-hidden">
              <FormulaBuilder
                formula={view === "edit" ? selectedFormula : null}
                onBack={handleBack}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
