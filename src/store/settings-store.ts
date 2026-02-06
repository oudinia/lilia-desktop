import { create } from "zustand";
import { invoke } from "@tauri-apps/api/tauri";

interface SettingsState {
  // Editor settings
  editorFontSize: number;
  editorFontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;

  // Theme
  theme: "light" | "dark";

  // Preview settings
  livePreview: boolean;
  previewFontSize: number;

  // Auto-save
  autoSave: boolean;
  autoSaveDelay: number;

  // Actions
  setEditorFontSize: (size: number) => void;
  setEditorFontFamily: (family: string) => void;
  setTabSize: (size: number) => void;
  setWordWrap: (wrap: boolean) => void;
  setLineNumbers: (show: boolean) => void;
  setMinimap: (show: boolean) => void;
  setTheme: (theme: "light" | "dark") => void;
  setLivePreview: (enabled: boolean) => void;
  setPreviewFontSize: (size: number) => void;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveDelay: (delay: number) => void;
  setAll: (settings: Partial<SettingsState>) => void;
  save: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  editorFontSize: 14,
  editorFontFamily: "JetBrains Mono, Consolas, monospace",
  tabSize: 2,
  wordWrap: false,
  lineNumbers: true,
  minimap: true,
  theme: "dark",
  livePreview: true,
  previewFontSize: 16,
  autoSave: false,
  autoSaveDelay: 5000,

  setEditorFontSize: (size) => {
    set({ editorFontSize: size });
    get().save();
  },

  setEditorFontFamily: (family) => {
    set({ editorFontFamily: family });
    get().save();
  },

  setTabSize: (size) => {
    set({ tabSize: size });
    get().save();
  },

  setWordWrap: (wrap) => {
    set({ wordWrap: wrap });
    get().save();
  },

  setLineNumbers: (show) => {
    set({ lineNumbers: show });
    get().save();
  },

  setMinimap: (show) => {
    set({ minimap: show });
    get().save();
  },

  setTheme: (theme) => {
    set({ theme });
    get().save();
  },

  setLivePreview: (enabled) => {
    set({ livePreview: enabled });
    get().save();
  },

  setPreviewFontSize: (size) => {
    set({ previewFontSize: size });
    get().save();
  },

  setAutoSave: (enabled) => {
    set({ autoSave: enabled });
    get().save();
  },

  setAutoSaveDelay: (delay) => {
    set({ autoSaveDelay: delay });
    get().save();
  },

  setAll: (settings) => {
    set(settings);
  },

  save: async () => {
    const state = get();
    try {
      await invoke("update_settings", {
        settings: {
          editorFontSize: state.editorFontSize,
          editorFontFamily: state.editorFontFamily,
          tabSize: state.tabSize,
          wordWrap: state.wordWrap,
          lineNumbers: state.lineNumbers,
          minimap: state.minimap,
          theme: state.theme,
          livePreview: state.livePreview,
          previewFontSize: state.previewFontSize,
          autoSave: state.autoSave,
          autoSaveDelay: state.autoSaveDelay,
        },
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  },
}));
