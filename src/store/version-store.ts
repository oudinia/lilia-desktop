import { create } from "zustand";
import { invoke } from "@tauri-apps/api/tauri";

export interface VersionEntry {
  id: string;
  document_path: string;
  timestamp: string;
  comment: string | null;
  word_count: number;
  file_size_bytes: number;
  content_hash: string;
}

interface VersionState {
  versions: VersionEntry[];
  isLoading: boolean;

  loadVersions: (path: string) => Promise<void>;
  createVersion: (path: string, content: string, comment?: string) => Promise<void>;
  restoreVersion: (id: string, path: string) => Promise<string>;
  deleteVersion: (id: string, path: string) => Promise<void>;
}

export const useVersionStore = create<VersionState>((set, get) => ({
  versions: [],
  isLoading: false,

  loadVersions: async (path: string) => {
    set({ isLoading: true });
    try {
      const versions = await invoke<VersionEntry[]>("list_versions", {
        documentPath: path,
      });
      set({ versions, isLoading: false });
    } catch (error) {
      console.error("Failed to load versions:", error);
      set({ versions: [], isLoading: false });
    }
  },

  createVersion: async (path: string, content: string, comment?: string) => {
    try {
      await invoke<VersionEntry>("create_version", {
        documentPath: path,
        content,
        comment: comment || null,
      });
      // Reload versions list
      await get().loadVersions(path);
    } catch (error) {
      console.error("Failed to create version:", error);
    }
  },

  restoreVersion: async (id: string, path: string) => {
    const content = await invoke<string>("restore_version", {
      versionId: id,
      documentPath: path,
    });
    return content;
  },

  deleteVersion: async (id: string, path: string) => {
    await invoke("delete_version", {
      versionId: id,
      documentPath: path,
    });
    await get().loadVersions(path);
  },
}));
