import { useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useAppStore } from "@/store/app-store";

export function useFileDrop() {
  const { openFile, showToast } = useAppStore();

  useEffect(() => {
    const appWindow = getCurrentWebviewWindow();

    // Listen for drag-drop events from Tauri v2
    const unlisten = appWindow.onDragDropEvent(async (event) => {
      if (event.payload.type === "drop") {
        const paths = event.payload.paths;
        if (paths.length > 0) {
          const file = paths[0];
          if (file.endsWith(".lml")) {
            await openFile(file);
          } else {
            showToast("Please drop an .lml file", "error");
          }
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
