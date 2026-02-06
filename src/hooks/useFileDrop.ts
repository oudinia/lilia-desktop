import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "@/store/app-store";

export function useFileDrop() {
  const { openFile, showToast } = useAppStore();

  useEffect(() => {
    // Listen for file drop events from Tauri
    const unlisten = listen<string[]>("tauri://file-drop", async (event) => {
      const files = event.payload;
      if (files.length > 0) {
        const file = files[0];
        // Check if it's an LML file
        if (file.endsWith(".lml")) {
          await openFile(file);
        } else {
          showToast("Please drop an .lml file", "error");
        }
      }
    });

    // Also handle drag over for visual feedback
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Tauri handles the actual file reading
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      unlisten.then((fn) => fn());
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [openFile, showToast]);
}
