import { useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { getEditorInstance } from "./Editor";

interface OutlineItem {
  level: number;
  text: string;
  line: number;
}

export function OutlinePanel() {
  const { document } = useAppStore();

  // Parse headings from content
  const outline = useMemo(() => {
    const items: OutlineItem[] = [];
    const lines = document.content.split("\n");

    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        items.push({
          level: match[1].length,
          text: match[2].replace(/[*_`]/g, ""), // Remove inline formatting
          line: index + 1,
        });
      }
    });

    return items;
  }, [document.content]);

  // Navigate to heading in editor
  const goToLine = (lineNumber: number) => {
    const editor = getEditorInstance();
    if (editor) {
      editor.revealLineInCenter(lineNumber);
      editor.setPosition({ lineNumber, column: 1 });
      editor.focus();
    }
  };

  if (outline.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-2 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">Outline</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No headings found.<br />
            Add headings with # syntax.
          </p>
        </div>
      </div>
    );
  }

  // Find minimum level for proper indentation
  const minLevel = Math.min(...outline.map((h) => h.level));

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">Outline</h3>
        <p className="text-xs text-muted-foreground">{outline.length} sections</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="py-2">
          {outline.map((item, index) => (
            <button
              key={index}
              onClick={() => goToLine(item.line)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors truncate"
              style={{ paddingLeft: `${(item.level - minLevel) * 12 + 12}px` }}
              title={item.text}
            >
              <span className="text-muted-foreground mr-2 text-xs">
                {"#".repeat(item.level)}
              </span>
              {item.text}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
