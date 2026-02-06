import { useAppStore } from "@/store/app-store";

export function StatusBar() {
  const { document, editor } = useAppStore();

  // Calculate word count (excluding LML markup)
  const wordCount = document.content
    .replace(/@\w+(\([^)]*\))?/g, "") // Remove block markers and params
    .replace(/[#*_`$\\{}[\]|]/g, "") // Remove formatting
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  // Estimate reading time (average 200 words per minute)
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Count headings for structure info
  const headingCount = (document.content.match(/^#{1,6}\s/gm) || []).length;

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
        <span>{wordCount.toLocaleString()} words</span>
        <span>~{readingMinutes} min read</span>
        <span>{headingCount} sections</span>
        {document.isDirty && <span className="text-yellow-500">● Modified</span>}
        <span className="font-medium">{document.fileName}</span>
      </div>
    </div>
  );
}
