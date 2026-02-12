import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { parseBibTeX } from "@/lib/lilia";
import type { BibEntry } from "@/lib/lilia";

interface BibliographyState {
  entries: BibEntry[];
  selectedKey: string | null;
  isDirty: boolean;
  bibFilePath: string | null;
  isLoading: boolean;
  lookupLoading: boolean;

  // Actions
  loadFromFile: (path: string) => Promise<void>;
  saveToFile: () => Promise<void>;
  addEntry: (entry: BibEntry) => void;
  updateEntry: (key: string, entry: Partial<BibEntry>) => void;
  removeEntry: (key: string) => void;
  selectEntry: (key: string | null) => void;
  lookupDoi: (doi: string) => Promise<void>;
  lookupIsbn: (isbn: string) => Promise<void>;
  importBibTeX: (content: string) => void;
  exportBibTeX: () => string;
  setBibFilePath: (path: string | null) => void;
  clear: () => void;
}

function entriesToBibTeX(entries: BibEntry[]): string {
  return entries
    .map((entry) => {
      const fields: string[] = [];
      fields.push(`  author = {${entry.author}}`);
      fields.push(`  title = {${entry.title}}`);
      fields.push(`  year = {${entry.year}}`);
      if (entry.journal) fields.push(`  journal = {${entry.journal}}`);
      if (entry.booktitle) fields.push(`  booktitle = {${entry.booktitle}}`);
      if (entry.publisher) fields.push(`  publisher = {${entry.publisher}}`);
      if (entry.volume) fields.push(`  volume = {${entry.volume}}`);
      if (entry.pages) fields.push(`  pages = {${entry.pages}}`);
      if (entry.doi) fields.push(`  doi = {${entry.doi}}`);
      if (entry.url) fields.push(`  url = {${entry.url}}`);
      return `@${entry.type}{${entry.key},\n${fields.join(",\n")}\n}`;
    })
    .join("\n\n");
}

export const useBibliographyStore = create<BibliographyState>((set, get) => ({
  entries: [],
  selectedKey: null,
  isDirty: false,
  bibFilePath: null,
  isLoading: false,
  lookupLoading: false,

  loadFromFile: async (path: string) => {
    set({ isLoading: true });
    try {
      const content = await invoke<string>("read_bib_file", { path });
      const entries = parseBibTeX(content);
      set({ entries, bibFilePath: path, isDirty: false, isLoading: false });
    } catch {
      // File might not exist yet — that's fine
      set({ entries: [], bibFilePath: path, isDirty: false, isLoading: false });
    }
  },

  saveToFile: async () => {
    const { bibFilePath, entries } = get();
    if (!bibFilePath) return;

    try {
      const content = entriesToBibTeX(entries);
      await invoke("write_bib_file", { path: bibFilePath, content });
      set({ isDirty: false });
    } catch (error) {
      console.error("Failed to save bibliography:", error);
    }
  },

  addEntry: (entry: BibEntry) => {
    set((state) => ({
      entries: [...state.entries, entry],
      isDirty: true,
    }));
  },

  updateEntry: (key: string, updates: Partial<BibEntry>) => {
    set((state) => ({
      entries: state.entries.map((e) =>
        e.key === key ? { ...e, ...updates } : e
      ),
      isDirty: true,
    }));
  },

  removeEntry: (key: string) => {
    set((state) => ({
      entries: state.entries.filter((e) => e.key !== key),
      isDirty: true,
    }));
  },

  selectEntry: (key: string | null) => {
    set({ selectedKey: key });
  },

  lookupDoi: async (doi: string) => {
    set({ lookupLoading: true });
    try {
      const entry = await invoke<BibEntry>("lookup_doi", { doi });
      // Ensure unique key
      const state = get();
      let finalKey = entry.key;
      let counter = 1;
      while (state.entries.some((e) => e.key === finalKey)) {
        finalKey = `${entry.key}${String.fromCharCode(96 + counter)}`;
        counter++;
      }
      const finalEntry = { ...entry, key: finalKey };
      set((s) => ({
        entries: [...s.entries, finalEntry],
        isDirty: true,
        lookupLoading: false,
      }));
    } catch (error) {
      set({ lookupLoading: false });
      throw error;
    }
  },

  lookupIsbn: async (isbn: string) => {
    set({ lookupLoading: true });
    try {
      const entry = await invoke<BibEntry>("lookup_isbn", { isbn });
      const state = get();
      let finalKey = entry.key;
      let counter = 1;
      while (state.entries.some((e) => e.key === finalKey)) {
        finalKey = `${entry.key}${String.fromCharCode(96 + counter)}`;
        counter++;
      }
      const finalEntry = { ...entry, key: finalKey };
      set((s) => ({
        entries: [...s.entries, finalEntry],
        isDirty: true,
        lookupLoading: false,
      }));
    } catch (error) {
      set({ lookupLoading: false });
      throw error;
    }
  },

  importBibTeX: (content: string) => {
    const newEntries = parseBibTeX(content);
    if (newEntries.length === 0) return;

    set((state) => {
      const existingKeys = new Set(state.entries.map((e) => e.key));
      const filtered = newEntries.filter((e) => !existingKeys.has(e.key));
      return {
        entries: [...state.entries, ...filtered],
        isDirty: true,
      };
    });
  },

  exportBibTeX: () => {
    return entriesToBibTeX(get().entries);
  },

  setBibFilePath: (path: string | null) => {
    set({ bibFilePath: path });
  },

  clear: () => {
    set({ entries: [], selectedKey: null, isDirty: false, bibFilePath: null });
  },
}));
