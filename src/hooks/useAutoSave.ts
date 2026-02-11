import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { useSettingsStore } from "@/store/settings-store";

export function useAutoSave() {
  const { document, saveDocument } = useAppStore();
  const { autoSave, autoSaveDelay } = useSettingsStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!autoSave || !document.isDirty || !document.filePath) return;

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new debounced save
    timerRef.current = setTimeout(() => {
      saveDocument();
    }, autoSaveDelay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [autoSave, autoSaveDelay, document.isDirty, document.content, document.filePath, saveDocument]);
}
