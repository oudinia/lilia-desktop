import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useVersionStore, type VersionEntry } from "@/store/version-store";

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VersionHistoryPanel() {
  const filePath = useAppStore((s) => s.document.filePath);
  const content = useAppStore((s) => s.document.content);
  const setContent = useAppStore((s) => s.setContent);
  const showToast = useAppStore((s) => s.showToast);
  const { versions, isLoading, loadVersions, createVersion, restoreVersion, deleteVersion } =
    useVersionStore();

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load versions when panel opens or file changes
  useEffect(() => {
    if (filePath) {
      loadVersions(filePath);
    }
  }, [filePath, loadVersions]);

  // Clear confirm timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  const handleCreateSnapshot = useCallback(async () => {
    if (!filePath) return;
    await createVersion(filePath, content, "Manual snapshot");
    showToast("Snapshot created", "success");
  }, [filePath, content, createVersion, showToast]);

  const handleRestore = useCallback(
    async (version: VersionEntry) => {
      if (confirmId !== version.id) {
        // First click: highlight and set timeout
        setConfirmId(version.id);
        if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
        confirmTimeoutRef.current = setTimeout(() => setConfirmId(null), 3000);
        return;
      }

      // Second click: actually restore
      if (!filePath) return;
      try {
        const restoredContent = await restoreVersion(version.id, filePath);
        setContent(restoredContent);
        setConfirmId(null);
        showToast("Version restored", "success");
      } catch (error) {
        showToast(`Restore failed: ${error}`, "error");
      }
    },
    [confirmId, filePath, restoreVersion, setContent, showToast]
  );

  const handleDelete = useCallback(
    async (version: VersionEntry) => {
      if (!filePath) return;
      try {
        await deleteVersion(version.id, filePath);
        showToast("Version deleted", "info");
      } catch (error) {
        showToast(`Delete failed: ${error}`, "error");
      }
    },
    [filePath, deleteVersion, showToast]
  );

  if (!filePath) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-2 border-b bg-muted/30">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Clock size={14} />
            History
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Save your document first to use version history.
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
          <Clock size={14} />
          History
        </h3>
        <p className="text-xs text-muted-foreground">{versions.length} snapshots</p>
      </div>

      {/* Create snapshot button */}
      <div className="px-3 py-2 border-b">
        <button
          onClick={handleCreateSnapshot}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          <Plus size={12} />
          Create Snapshot
        </button>
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex items-center justify-center p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No snapshots yet.<br />
              Click "Create Snapshot" to save a version.
            </p>
          </div>
        ) : (
          <div className="py-1">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`px-3 py-2 border-b last:border-b-0 transition-colors group ${
                  confirmId === version.id
                    ? "bg-primary/10 border-primary/30"
                    : "hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">
                      {formatRelativeTime(version.timestamp)}
                    </p>
                    {version.comment && (
                      <p className="text-xs text-muted-foreground truncate">{version.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {version.word_count} words · {formatBytes(version.file_size_bytes)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRestore(version)}
                      title={confirmId === version.id ? "Click again to confirm" : "Restore version"}
                      className={`p-1 text-xs rounded hover:bg-muted/50 ${
                        confirmId === version.id
                          ? "text-primary"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(version)}
                      title="Delete version"
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
