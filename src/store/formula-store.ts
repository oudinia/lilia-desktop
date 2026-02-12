import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { Formula, CreateFormula, UpdateFormula } from "@/types/formula";

type ViewMode = "browse" | "create" | "edit";

interface FormulaState {
  formulas: Formula[];
  selectedFormula: Formula | null;
  isLoading: boolean;
  view: ViewMode;
  searchQuery: string;
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  favoritesOnly: boolean;

  // Actions
  loadFormulas: () => Promise<void>;
  createFormula: (formula: CreateFormula) => Promise<Formula | null>;
  updateFormula: (id: string, updates: UpdateFormula) => Promise<Formula | null>;
  deleteFormula: (id: string) => Promise<boolean>;
  toggleFavorite: (id: string) => Promise<void>;
  incrementUsage: (id: string) => Promise<void>;

  // UI actions
  setView: (view: ViewMode) => void;
  setSelectedFormula: (formula: Formula | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedSubcategory: (subcategory: string | null) => void;
  setFavoritesOnly: (favoritesOnly: boolean) => void;

  // Derived
  getFilteredFormulas: () => Formula[];
}

export const useFormulaStore = create<FormulaState>((set, get) => ({
  formulas: [],
  selectedFormula: null,
  isLoading: false,
  view: "browse",
  searchQuery: "",
  selectedCategory: null,
  selectedSubcategory: null,
  favoritesOnly: false,

  loadFormulas: async () => {
    set({ isLoading: true });
    try {
      const formulas = await invoke<Formula[]>("get_formulas");
      set({ formulas, isLoading: false });
    } catch (error) {
      console.error("Failed to load formulas:", error);
      set({ isLoading: false });
    }
  },

  createFormula: async (formula) => {
    try {
      const created = await invoke<Formula>("create_formula", { formula });
      set((state) => ({
        formulas: [...state.formulas, created],
        view: "browse",
      }));
      return created;
    } catch (error) {
      console.error("Failed to create formula:", error);
      return null;
    }
  },

  updateFormula: async (id, updates) => {
    try {
      const updated = await invoke<Formula | null>("update_formula", {
        id,
        updates,
      });
      if (updated) {
        set((state) => ({
          formulas: state.formulas.map((f) => (f.id === id ? updated : f)),
          view: "browse",
          selectedFormula: null,
        }));
      }
      return updated;
    } catch (error) {
      console.error("Failed to update formula:", error);
      return null;
    }
  },

  deleteFormula: async (id) => {
    try {
      const result = await invoke<boolean>("delete_formula", { id });
      if (result) {
        set((state) => ({
          formulas: state.formulas.filter((f) => f.id !== id),
        }));
      }
      return result;
    } catch (error) {
      console.error("Failed to delete formula:", error);
      return false;
    }
  },

  toggleFavorite: async (id) => {
    try {
      const updated = await invoke<Formula | null>("toggle_formula_favorite", {
        id,
      });
      if (updated) {
        set((state) => ({
          formulas: state.formulas.map((f) => (f.id === id ? updated : f)),
        }));
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  },

  incrementUsage: async (id) => {
    try {
      const updated = await invoke<Formula | null>(
        "increment_formula_usage",
        { id }
      );
      if (updated) {
        set((state) => ({
          formulas: state.formulas.map((f) => (f.id === id ? updated : f)),
        }));
      }
    } catch (error) {
      console.error("Failed to increment usage:", error);
    }
  },

  setView: (view) => set({ view }),
  setSelectedFormula: (formula) => set({ selectedFormula: formula }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) =>
    set({ selectedCategory: category, selectedSubcategory: null }),
  setSelectedSubcategory: (subcategory) =>
    set({ selectedSubcategory: subcategory }),
  setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly }),

  getFilteredFormulas: () => {
    const {
      formulas,
      searchQuery,
      selectedCategory,
      selectedSubcategory,
      favoritesOnly,
    } = get();

    let filtered = formulas;

    if (favoritesOnly) {
      filtered = filtered.filter((f) => f.is_favorite);
    }

    if (selectedCategory) {
      filtered = filtered.filter((f) => f.category === selectedCategory);
    }

    if (selectedSubcategory) {
      filtered = filtered.filter((f) => f.subcategory === selectedSubcategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.description && f.description.toLowerCase().includes(q)) ||
          f.latex_content.toLowerCase().includes(q) ||
          f.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort: favorites first, then by usage, then alphabetically
    return filtered.sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      if (a.usage_count !== b.usage_count) return b.usage_count - a.usage_count;
      return a.name.localeCompare(b.name);
    });
  },
}));
