import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import MonacoEditor from "@monaco-editor/react";
import { useAppStore } from "@/store/app-store";
import { useSettingsStore } from "@/store/settings-store";
import { parseLmlToHtml } from "@/lib/lml-renderer";
import { exportToLatex } from "@/lib/exports";

type PreviewTab = "preview" | "latex" | "lml";

export function Preview() {
  const { document, editor } = useAppStore();
  const { previewFontSize, livePreview, theme } = useSettingsStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState<PreviewTab>("preview");

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

  // Generate LaTeX only when tab is active (memoized)
  const latexContent = useMemo(() => {
    if (activeTab !== "latex") return "";
    try {
      return exportToLatex(document.content);
    } catch (error) {
      return `% LaTeX generation error: ${error}`;
    }
  }, [document.content, activeTab]);

  // Line-based scroll sync from editor (only on preview tab)
  const syncScroll = useCallback((topLine: number) => {
    if (activeTab !== "preview") return;
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
  }, [activeTab]);

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

  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as PreviewTab)}
      className="h-full flex flex-col"
    >
      <Tabs.List className="flex border-b bg-muted/30 shrink-0">
        <Tabs.Trigger
          value="preview"
          className="px-3 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors"
        >
          Preview
        </Tabs.Trigger>
        <Tabs.Trigger
          value="latex"
          className="px-3 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors"
        >
          LaTeX
        </Tabs.Trigger>
        <Tabs.Trigger
          value="lml"
          className="px-3 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors"
        >
          LML
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="preview" className="flex-1 overflow-hidden">
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
      </Tabs.Content>

      <Tabs.Content value="latex" className="flex-1 overflow-hidden">
        <MonacoEditor
          language="latex"
          theme={monacoTheme}
          value={latexContent}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            wordWrap: "on",
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            renderLineHighlight: "none",
          }}
        />
      </Tabs.Content>

      <Tabs.Content value="lml" className="flex-1 overflow-hidden">
        <MonacoEditor
          language="lml"
          theme={monacoTheme}
          value={document.content}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            wordWrap: "on",
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            renderLineHighlight: "none",
          }}
        />
      </Tabs.Content>
    </Tabs.Root>
  );
}
