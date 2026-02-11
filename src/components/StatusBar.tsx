import { useMemo, useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/Popover";

function SaveIndicator({
  status,
  lastSaved,
}: {
  status: "saved" | "saving" | "unsaved";
  lastSaved: Date | null;
}) {
  const [, setTick] = useState(0);

  // Re-render every 30s to update "saved X ago" text
  useEffect(() => {
    if (status !== "saved" || !lastSaved) return;
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [status, lastSaved]);

  if (status === "saving") {
    return (
      <span className="flex items-center gap-1 text-blue-400">
        <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
        Saving...
      </span>
    );
  }

  if (status === "unsaved") {
    return (
      <span className="flex items-center gap-1 text-yellow-500">
        <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
        Unsaved
      </span>
    );
  }

  // status === "saved"
  const timeAgo = lastSaved ? formatTimeAgo(lastSaved) : "";
  return (
    <span className="flex items-center gap-1 text-green-500" title={lastSaved?.toLocaleTimeString()}>
      <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
      Saved{timeAgo ? ` ${timeAgo}` : ""}
    </span>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

interface DocumentStats {
  wordCount: number;
  charCount: number;
  charNoSpaces: number;
  lineCount: number;
  paragraphCount: number;
  headingCount: number;
  equationCount: number;
  codeBlockCount: number;
  tableCount: number;
  figureCount: number;
  readingMinutes: number;
}

function calculateStats(content: string): DocumentStats {
  const lines = content.split("\n");
  const lineCount = lines.length;

  // Clean content for word/char counting (remove LML markup)
  const cleanContent = content
    .replace(/@\w+(\([^)]*\))?/g, "") // Remove block markers and params
    .replace(/[#*_`$\\{}[\]|]/g, ""); // Remove formatting

  const wordCount = cleanContent
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const charCount = content.length;
  const charNoSpaces = content.replace(/\s/g, "").length;

  // Count paragraphs (blocks of text separated by blank lines)
  const paragraphCount = content
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0 && !p.trim().startsWith("@")).length;

  // Count elements
  const headingCount = (content.match(/^#{1,6}\s/gm) || []).length;
  const equationCount = (content.match(/@equation/g) || []).length;
  const codeBlockCount = (content.match(/@code/g) || []).length;
  const tableCount = (content.match(/@table/g) || []).length;
  const figureCount = (content.match(/@figure|@img/g) || []).length;

  // Estimate reading time (average 200 words per minute)
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return {
    wordCount,
    charCount,
    charNoSpaces,
    lineCount,
    paragraphCount,
    headingCount,
    equationCount,
    codeBlockCount,
    tableCount,
    figureCount,
    readingMinutes,
  };
}

export function StatusBar() {
  const { document, editor } = useAppStore();

  const stats = useMemo(
    () => calculateStats(document.content),
    [document.content]
  );

  return (
    <div className="flex items-center justify-between px-4 py-1 border-t bg-muted/50 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>
          Ln {editor.cursorLine}, Col {editor.cursorColumn}
        </span>
        {editor.selection && (
          <span>{editor.selection.length} selected</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <button className="hover:text-foreground transition-colors cursor-pointer">
              {stats.wordCount.toLocaleString()} words
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Document Statistics</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Words</span>
                <span className="text-right font-medium">
                  {stats.wordCount.toLocaleString()}
                </span>

                <span className="text-muted-foreground">Characters</span>
                <span className="text-right font-medium">
                  {stats.charCount.toLocaleString()}
                </span>

                <span className="text-muted-foreground">Chars (no spaces)</span>
                <span className="text-right font-medium">
                  {stats.charNoSpaces.toLocaleString()}
                </span>

                <span className="text-muted-foreground">Lines</span>
                <span className="text-right font-medium">
                  {stats.lineCount.toLocaleString()}
                </span>

                <span className="text-muted-foreground">Paragraphs</span>
                <span className="text-right font-medium">
                  {stats.paragraphCount.toLocaleString()}
                </span>
              </div>

              <div className="pt-2 border-t">
                <h5 className="font-medium text-xs text-muted-foreground mb-2">
                  Document Elements
                </h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Headings</span>
                  <span className="text-right font-medium">
                    {stats.headingCount}
                  </span>

                  {stats.equationCount > 0 && (
                    <>
                      <span className="text-muted-foreground">Equations</span>
                      <span className="text-right font-medium">
                        {stats.equationCount}
                      </span>
                    </>
                  )}

                  {stats.codeBlockCount > 0 && (
                    <>
                      <span className="text-muted-foreground">Code blocks</span>
                      <span className="text-right font-medium">
                        {stats.codeBlockCount}
                      </span>
                    </>
                  )}

                  {stats.tableCount > 0 && (
                    <>
                      <span className="text-muted-foreground">Tables</span>
                      <span className="text-right font-medium">
                        {stats.tableCount}
                      </span>
                    </>
                  )}

                  {stats.figureCount > 0 && (
                    <>
                      <span className="text-muted-foreground">Figures</span>
                      <span className="text-right font-medium">
                        {stats.figureCount}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t text-sm">
                <span className="text-muted-foreground">Reading time: </span>
                <span className="font-medium">~{stats.readingMinutes} min</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <span>~{stats.readingMinutes} min read</span>
        <span>{stats.headingCount} sections</span>
        <SaveIndicator
          status={document.saveStatus}
          lastSaved={document.lastSaved}
        />
        <span className="font-medium">{document.fileName}</span>
      </div>
    </div>
  );
}
