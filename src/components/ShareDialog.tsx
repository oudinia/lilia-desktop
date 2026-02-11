import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/Dialog";
import { useAppStore } from "@/store/app-store";

export function ShareDialog() {
  const { ui, setShareDialogOpen, showToast } = useAppStore();
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"viewer" | "editor">("viewer");

  // @ts-ignore - Vite env
  const API_URL = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "http://localhost:5000";

  const handleGenerateLink = async () => {
    try {
      // This would call the API: POST /api/documents/{id}/share
      const link = `${API_URL}/shared/${crypto.randomUUID().slice(0, 8)}`;
      setShareLink(link);
      setIsPublic(true);
      showToast("Share link generated", "success");
    } catch (error) {
      showToast(`Failed to generate share link: ${error}`, "error");
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Failed to copy link", "error");
    }
  };

  const handleRevokeLink = () => {
    setShareLink(null);
    setIsPublic(false);
    showToast("Share link revoked", "info");
  };

  const handleInvite = () => {
    if (!email.trim()) return;
    // This would call: POST /api/documents/{id}/collaborators/users
    showToast(`Invited ${email} as ${permission}`, "success");
    setEmail("");
  };

  return (
    <Dialog open={ui.shareDialogOpen} onOpenChange={setShareDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite by email */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Invite people</label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as "viewer" | "editor")}
                className="px-2 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={!email.trim()}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                Invite
              </button>
            </div>
          </div>

          {/* Share link section */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Share via link</label>
              {!shareLink ? (
                <button
                  onClick={handleGenerateLink}
                  className="text-xs px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  Generate link
                </button>
              ) : (
                <button
                  onClick={handleRevokeLink}
                  className="text-xs px-3 py-1.5 rounded-md text-destructive hover:bg-destructive/10"
                >
                  Revoke
                </button>
              )}
            </div>

            {shareLink && (
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  className="flex-1 px-3 py-2 rounded-md border border-input bg-muted text-sm text-muted-foreground"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            )}

            {isPublic && (
              <p className="text-xs text-muted-foreground">
                Anyone with the link can view this document.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
