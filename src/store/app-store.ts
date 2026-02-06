import { create } from "zustand";
import { invoke } from "@tauri-apps/api/tauri";
import { open, save } from "@tauri-apps/api/dialog";
import { useSettingsStore } from "./settings-store";

interface DocumentState {
  content: string;
  filePath: string | null;
  fileName: string;
  isDirty: boolean;
  lastSaved: Date | null;
}

interface EditorState {
  cursorLine: number;
  cursorColumn: number;
  selection: string | null;
  scrollPercent: number;
}

interface UIState {
  settingsOpen: boolean;
  findReplaceOpen: boolean;
  aboutOpen: boolean;
  recentFiles: string[];
}

interface AppState {
  // Document state
  document: DocumentState;
  editor: EditorState;
  ui: UIState;

  // Document actions
  setContent: (content: string) => void;
  newDocument: () => void;
  openDocument: () => Promise<void>;
  openFile: (path: string) => Promise<void>;
  saveDocument: () => Promise<void>;
  saveDocumentAs: () => Promise<void>;

  // Editor actions
  setCursorPosition: (line: number, column: number) => void;
  setSelection: (selection: string | null) => void;
  setScrollPercent: (percent: number) => void;

  // UI actions
  setSettingsOpen: (open: boolean) => void;
  setFindReplaceOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  loadRecentFiles: () => Promise<void>;
  loadSettings: () => Promise<void>;

  // Toast
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  toasts: Array<{ id: string; message: string; type: string }>;
  removeToast: (id: string) => void;
}

const DEFAULT_CONTENT = `@document
title: Untitled Document
language: en
paperSize: a4
fontFamily: charter
fontSize: 11

# Introduction

Start writing your document here...

## Section 1

This is a paragraph with **bold**, *italic*, and \`inline code\`.

You can write equations:

@equation(label: eq:example, mode: display)
E = mc^2

And code blocks:

@code(python)
def hello():
    print("Hello, Lilia!")

## Section 2

Create tables:

@table
| Feature | Description |
|---------|-------------|
| LML | Human-readable markup |
| LaTeX | Math equations |
| Preview | Live rendering |

And lists:

@list
- First item
- Second item
- Third item

`;

export const useAppStore = create<AppState>((set, get) => ({
  document: {
    content: DEFAULT_CONTENT,
    filePath: null,
    fileName: "Untitled.lml",
    isDirty: false,
    lastSaved: null,
  },
  editor: {
    cursorLine: 1,
    cursorColumn: 1,
    selection: null,
    scrollPercent: 0,
  },
  ui: {
    settingsOpen: false,
    findReplaceOpen: false,
    aboutOpen: false,
    recentFiles: [],
  },
  toasts: [],

  setContent: (content) => {
    set((state) => ({
      document: {
        ...state.document,
        content,
        isDirty: true,
      },
    }));
  },

  newDocument: () => {
    const state = get();
    if (state.document.isDirty) {
      // TODO: Show confirmation dialog
    }
    set({
      document: {
        content: DEFAULT_CONTENT,
        filePath: null,
        fileName: "Untitled.lml",
        isDirty: false,
        lastSaved: null,
      },
    });
  },

  openDocument: async () => {
    try {
      const selected = await open({
        filters: [
          { name: "LML Files", extensions: ["lml"] },
          { name: "All Files", extensions: ["*"] },
        ],
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        await get().openFile(selected);
      }
    } catch (error) {
      get().showToast(`Failed to open file: ${error}`, "error");
    }
  },

  openFile: async (path) => {
    try {
      const content = await invoke<string>("read_file", { path });
      const fileName = path.split(/[/\\]/).pop() || "Untitled.lml";

      set({
        document: {
          content,
          filePath: path,
          fileName,
          isDirty: false,
          lastSaved: new Date(),
        },
      });

      // Add to recent files
      await invoke("add_recent_file", { path });
      await get().loadRecentFiles();

      get().showToast(`Opened ${fileName}`, "success");
    } catch (error) {
      get().showToast(`Failed to open file: ${error}`, "error");
    }
  },

  saveDocument: async () => {
    const state = get();
    if (!state.document.filePath) {
      await state.saveDocumentAs();
      return;
    }

    try {
      await invoke("write_file", {
        path: state.document.filePath,
        content: state.document.content,
      });

      set((state) => ({
        document: {
          ...state.document,
          isDirty: false,
          lastSaved: new Date(),
        },
      }));

      get().showToast("Document saved", "success");
    } catch (error) {
      get().showToast(`Failed to save: ${error}`, "error");
    }
  },

  saveDocumentAs: async () => {
    try {
      const state = get();
      const filePath = await save({
        filters: [
          { name: "LML Files", extensions: ["lml"] },
          { name: "All Files", extensions: ["*"] },
        ],
        defaultPath: state.document.fileName,
      });

      if (filePath) {
        await invoke("write_file", {
          path: filePath,
          content: state.document.content,
        });

        const fileName = filePath.split(/[/\\]/).pop() || "Untitled.lml";

        set((state) => ({
          document: {
            ...state.document,
            filePath,
            fileName,
            isDirty: false,
            lastSaved: new Date(),
          },
        }));

        // Add to recent files
        await invoke("add_recent_file", { path: filePath });
        await get().loadRecentFiles();

        get().showToast(`Saved as ${fileName}`, "success");
      }
    } catch (error) {
      get().showToast(`Failed to save: ${error}`, "error");
    }
  },

  setCursorPosition: (line, column) => {
    set((state) => ({
      editor: {
        ...state.editor,
        cursorLine: line,
        cursorColumn: column,
      },
    }));
  },

  setSelection: (selection) => {
    set((state) => ({
      editor: {
        ...state.editor,
        selection,
      },
    }));
  },

  setSettingsOpen: (open) => {
    set((state) => ({
      ui: { ...state.ui, settingsOpen: open },
    }));
  },

  setFindReplaceOpen: (open) => {
    set((state) => ({
      ui: { ...state.ui, findReplaceOpen: open },
    }));
  },

  setAboutOpen: (open) => {
    set((state) => ({
      ui: { ...state.ui, aboutOpen: open },
    }));
  },

  setScrollPercent: (percent) => {
    set((state) => ({
      editor: { ...state.editor, scrollPercent: percent },
    }));
  },

  loadRecentFiles: async () => {
    try {
      const files = await invoke<string[]>("get_recent_files");
      set((state) => ({
        ui: { ...state.ui, recentFiles: files },
      }));
    } catch (error) {
      console.error("Failed to load recent files:", error);
    }
  },

  loadSettings: async () => {
    try {
      const settings = await invoke<{
        editorFontSize: number;
        editorFontFamily: string;
        tabSize: number;
        wordWrap: boolean;
        lineNumbers: boolean;
        minimap: boolean;
        theme: "light" | "dark";
        livePreview: boolean;
        previewFontSize: number;
        autoSave: boolean;
        autoSaveDelay: number;
      }>("get_settings");

      useSettingsStore.getState().setAll(settings);
      await get().loadRecentFiles();
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  },

  showToast: (message, type = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));

    // Auto-remove after 3 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
