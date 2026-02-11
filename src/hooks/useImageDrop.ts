import { useEffect, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useAppStore } from "@/store/app-store";
import { insertTextAtCursor } from "@/components/Editor";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"];

function isImageFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTENSIONS.includes(ext);
}

function getAssetsDir(filePath: string | null): string | null {
  if (!filePath) return null;
  const dir = filePath.replace(/[/\\][^/\\]+$/, "");
  return dir + "/assets";
}

export function useImageDrop() {
  const { document, showToast } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleImageFile = useCallback(
    async (file: File) => {
      const assetsDir = getAssetsDir(document.filePath);

      if (!assetsDir) {
        showToast("Save the document first to enable image drop", "info");
        return;
      }

      const fileName = file.name.replace(/\s+/g, "-");
      const destination = assetsDir + "/" + fileName;

      try {
        // Read file as bytes and send to Tauri
        const arrayBuffer = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(arrayBuffer));

        await invoke("save_image_bytes", { bytes, destination });

        // Insert @figure directive at cursor
        const relativePath = "./assets/" + fileName;
        const nameNoExt = fileName.replace(/\.[^.]+$/, "");
        const directive = `\n@figure(src: ${relativePath}, alt: ${nameNoExt})\n${nameNoExt}\n`;
        insertTextAtCursor(directive);

        showToast(`Image added: ${fileName}`, "success");
      } catch (error) {
        showToast(`Failed to save image: ${error}`, "error");
      }
    },
    [document.filePath, showToast]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (!files) return;

      for (let i = 0; i < files.length; i++) {
        if (isImageFile(files[i].name)) {
          handleImageFile(files[i]);
        }
      }
    },
    [handleImageFile]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if dragging files
    if (e.dataTransfer?.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  // Handle clipboard paste with images
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            // Create a name for pasted images
            const ext = file.type.split("/")[1] || "png";
            const timestamp = Date.now();
            const pasteFile = new File([file], `paste-${timestamp}.${ext}`, {
              type: file.type,
            });
            handleImageFile(pasteFile);
          }
          break;
        }
      }
    },
    [handleImageFile]
  );

  useEffect(() => {
    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("paste", handlePaste);
    };
  }, [handleDrop, handleDragOver, handleDragLeave, handlePaste]);

  return { isDragging };
}
