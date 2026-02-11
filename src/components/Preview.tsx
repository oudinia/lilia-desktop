import { useMemo, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { useSettingsStore } from "@/store/settings-store";
import { parseLmlToHtml } from "@/lib/lml-renderer";

export function Preview() {
  const { document, editor } = useAppStore();
  const { previewFontSize, livePreview } = useSettingsStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse and render LML content
  const htmlContent = useMemo(() => {
    if (!livePreview) {
      return "<p class='text-muted-foreground italic'>Live preview disabled</p>";
    }
    try {
      return parseLmlToHtml(document.content);
    } catch (error) {
      return `<p class="text-destructive">Parse error: ${error}</p>`;
    }
  }, [document.content, livePreview]);

  // Line-based scroll sync from editor
  const syncScroll = useCallback((topLine: number) => {
    const container = containerRef.current;
    if (!container) return;

    const elements = container.querySelectorAll<HTMLElement>("[data-source-line]");
    if (elements.length === 0) return;

    // Find the closest element at or before the top visible line
    let target: HTMLElement | null = null;
    for (const el of elements) {
      const line = parseInt(el.dataset.sourceLine || "0", 10);
      if (line <= topLine) {
        target = el;
      } else {
        break;
      }
    }

    if (target) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + container.scrollTop;
      container.scrollTo({ top: offset, behavior: "smooth" });
    }
  }, []);

  // Debounced sync on editor scroll
  useEffect(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncScroll(editor.topVisibleLine);
    }, 50);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [editor.topVisibleLine, syncScroll]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-auto bg-card"
    >
      <div
        className="lml-preview max-w-4xl mx-auto p-8"
        style={{ fontSize: `${previewFontSize}px` }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
