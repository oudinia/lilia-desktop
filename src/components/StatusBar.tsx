import { useAppStore } from "@/store/app-store";

export function StatusBar() {
  const { document, editor } = useAppStore();

  // Calculate word count
  const wordCount = document.content
    .replace(/@\w+[^]*?\n/g, "") // Remove block markers
    .replace(/[#*_`$\\{}[\]|]/g, "") // Remove formatting
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  // Calculate character count
  const charCount = document.content.length;

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
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
        {document.isDirty && <span className="text-yellow-500">●</span>}
        <span>{document.fileName}</span>
      </div>
    </div>
  );
}
