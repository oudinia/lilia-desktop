import { useMemo, useRef, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { useSettingsStore } from "@/store/settings-store";
import { parseLmlToHtml } from "@/lib/lml-renderer";

export function Preview() {
  const { document, editor } = useAppStore();
  const { previewFontSize, livePreview } = useSettingsStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingSelf = useRef(false);

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

  // Sync scroll position from editor
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isScrollingSelf.current) return;

    const scrollHeight = container.scrollHeight - container.clientHeight;
    if (scrollHeight > 0) {
      container.scrollTop = editor.scrollPercent * scrollHeight;
    }
  }, [editor.scrollPercent]);

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
