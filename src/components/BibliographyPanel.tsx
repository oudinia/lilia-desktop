import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Plus, Trash2, Import, BookOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/store/app-store";
import { useBibliographyStore } from "@/store/bibliography-store";
import { getEditorInstance } from "./Editor";

export function BibliographyPanel() {
  const filePath = useAppStore((s) => s.document.filePath);
  const {
    entries,
    isLoading,
    lookupLoading,
    isDirty,
    loadFromFile,
    saveToFile,
    removeEntry,
    lookupDoi,
    lookupIsbn,
    importBibTeX,
    setBibFilePath,
  } = useBibliographyStore();

  const [lookupMode, setLookupMode] = useState<"doi" | "isbn">("doi");
  const [lookupValue, setLookupValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Debounced auto-save
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToFile();
    }, 2000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [isDirty, saveToFile]);

  // Auto-load .bib when document path changes
  useEffect(() => {
    if (filePath) {
      const bibPath = filePath.replace(/\.lml$/, ".bib");
      setBibFilePath(bibPath);
      loadFromFile(bibPath);
    }
  }, [filePath, loadFromFile, setBibFilePath]);

  const handleLookup = useCallback(async () => {
    if (!lookupValue.trim()) return;
    setError(null);
    try {
      if (lookupMode === "doi") {
        await lookupDoi(lookupValue.trim());
      } else {
        await lookupIsbn(lookupValue.trim());
      }
      setLookupValue("");
    } catch (err) {
      setError(String(err));
    }
  }, [lookupMode, lookupValue, lookupDoi, lookupIsbn]);

  const handleImportFile = useCallback(async () => {
    try {
      const selected = await open({
        filters: [
          { name: "BibTeX Files", extensions: ["bib"] },
          { name: "All Files", extensions: ["*"] },
        ],
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        const content = await invoke<string>("read_bib_file", { path: selected });
        importBibTeX(content);
      }
    } catch (err) {
      setError(String(err));
    }
  }, [importBibTeX]);

  const handleInsertCite = useCallback((key: string) => {
    const editor = getEditorInstance();
    if (editor) {
      const position = editor.getPosition();
      if (position) {
        editor.executeEdits("bibliography", [
          {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            text: `\\cite{${key}}`,
          },
        ]);
        editor.focus();
      }
    }
  }, []);

  if (!filePath) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-2 border-b bg-muted/30">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <BookOpen size={14} />
            Bibliography
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Save your document first to manage bibliography entries.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b bg-muted/30">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <BookOpen size={14} />
          Bibliography
        </h3>
        <p className="text-xs text-muted-foreground">{entries.length} entries</p>
      </div>

      {/* Lookup form */}
      <div className="px-3 py-2 border-b space-y-2">
        <div className="flex gap-1">
          <button
            onClick={() => setLookupMode("doi")}
            className={`px-2 py-0.5 text-xs rounded ${
              lookupMode === "doi"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            DOI
          </button>
          <button
            onClick={() => setLookupMode("isbn")}
            className={`px-2 py-0.5 text-xs rounded ${
              lookupMode === "isbn"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            ISBN
          </button>
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            value={lookupValue}
            onChange={(e) => setLookupValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder={lookupMode === "doi" ? "10.1038/nature12373" : "978-0-13-468599-1"}
            className="flex-1 px-2 py-1 text-xs bg-background border rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleLookup}
            disabled={lookupLoading || !lookupValue.trim()}
            className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {lookupLoading ? "..." : <Search size={12} />}
          </button>
        </div>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        {/* Import button */}
        <button
          onClick={handleImportFile}
          className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs border rounded hover:bg-muted/50 transition-colors"
        >
          <Import size={12} />
          Import .bib file
        </button>
      </div>

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No entries yet.<br />
              Look up a DOI or import a .bib file.
            </p>
          </div>
        ) : (
          <div className="py-1">
            {entries.map((entry) => (
              <div
                key={entry.key}
                className="px-3 py-2 border-b last:border-b-0 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-primary truncate">[{entry.key}]</p>
                    <p className="text-xs text-muted-foreground truncate">{entry.author}</p>
                    <p className="text-xs truncate" title={entry.title}>{entry.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.year > 0 && entry.year}
                      {entry.journal && ` · ${entry.journal}`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleInsertCite(entry.key)}
                      title="Insert \\cite{key}"
                      className="p-1 text-xs text-muted-foreground hover:text-primary rounded hover:bg-muted/50"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeEntry(entry.key)}
                      title="Delete entry"
                      className="p-1 text-xs text-muted-foreground hover:text-destructive rounded hover:bg-muted/50"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
