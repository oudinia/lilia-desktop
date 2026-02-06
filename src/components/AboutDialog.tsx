import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/Dialog";
import { useAppStore } from "@/store/app-store";

export function AboutDialog() {
  const { ui, setAboutOpen } = useAppStore();

  return (
    <Dialog open={ui.aboutOpen} onOpenChange={setAboutOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">About Lilia</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="text-6xl">L</div>
          <div className="text-center">
            <h2 className="text-xl font-semibold">Lilia Editor</h2>
            <p className="text-sm text-muted-foreground">Version 1.0.0</p>
          </div>

          <p className="text-center text-sm text-muted-foreground max-w-sm">
            A lightweight, cross-platform editor for LML (Lilia Markup Language).
            Write beautiful academic documents with live preview and LaTeX math support.
          </p>

          <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
            <p>Built with Tauri, React, and Monaco Editor</p>
            <p>Math rendering by KaTeX</p>
          </div>

          <div className="border-t w-full pt-4 mt-2">
            <div className="text-center text-xs text-muted-foreground">
              <p>Copyright 2024 Lilia</p>
              <p className="mt-1">Licensed under MIT License</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
