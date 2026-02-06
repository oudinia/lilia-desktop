import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { useSettingsStore } from "@/store/settings-store";

export function useKeyboardShortcuts() {
  const {
    newDocument,
    openDocument,
    saveDocument,
    saveDocumentAs,
    setSettingsOpen,
    setFindReplaceOpen,
  } = useAppStore();
  const { theme, setTheme } = useSettingsStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      // File operations
      if (isMod && e.key === "n") {
        e.preventDefault();
        newDocument();
      }
      if (isMod && e.key === "o") {
        e.preventDefault();
        openDocument();
      }
      if (isMod && e.key === "s") {
        e.preventDefault();
        if (isShift) {
          saveDocumentAs();
        } else {
          saveDocument();
        }
      }

      // Edit operations
      if (isMod && e.key === "f") {
        e.preventDefault();
        setFindReplaceOpen(true);
      }

      // View operations
      if (isMod && e.key === "t") {
        e.preventDefault();
        setTheme(theme === "dark" ? "light" : "dark");
      }

      // Settings
      if (isMod && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }

      // Close dialogs with Escape
      if (e.key === "Escape") {
        setSettingsOpen(false);
        setFindReplaceOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    newDocument,
    openDocument,
    saveDocument,
    saveDocumentAs,
    setSettingsOpen,
    setFindReplaceOpen,
    theme,
    setTheme,
  ]);
}
