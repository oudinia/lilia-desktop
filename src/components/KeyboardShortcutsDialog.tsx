import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/Dialog";
import { useAppStore } from "@/store/app-store";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "File",
    shortcuts: [
      { keys: ["Ctrl", "N"], description: "New document" },
      { keys: ["Ctrl", "O"], description: "Open document" },
      { keys: ["Ctrl", "S"], description: "Save document" },
      { keys: ["Ctrl", "Shift", "S"], description: "Save as" },
      { keys: ["Ctrl", "W"], description: "Close document" },
    ],
  },
  {
    title: "Edit",
    shortcuts: [
      { keys: ["Ctrl", "Z"], description: "Undo" },
      { keys: ["Ctrl", "Y"], description: "Redo" },
      { keys: ["Ctrl", "X"], description: "Cut" },
      { keys: ["Ctrl", "C"], description: "Copy" },
      { keys: ["Ctrl", "V"], description: "Paste" },
      { keys: ["Ctrl", "A"], description: "Select all" },
      { keys: ["Ctrl", "F"], description: "Find" },
      { keys: ["Ctrl", "H"], description: "Find and replace" },
    ],
  },
  {
    title: "View",
    shortcuts: [
      { keys: ["Ctrl", "Shift", "P"], description: "Toggle preview" },
      { keys: ["Ctrl", "Shift", "O"], description: "Toggle outline" },
      { keys: ["Ctrl", "+"], description: "Zoom in" },
      { keys: ["Ctrl", "-"], description: "Zoom out" },
      { keys: ["Ctrl", "0"], description: "Reset zoom" },
      { keys: ["F11"], description: "Toggle fullscreen" },
    ],
  },
  {
    title: "Text Formatting",
    shortcuts: [
      { keys: ["Ctrl", "B"], description: "Bold (**text**)" },
      { keys: ["Ctrl", "I"], description: "Italic (*text*)" },
      { keys: ["Ctrl", "`"], description: "Code (`text`)" },
    ],
  },
  {
    title: "Editor",
    shortcuts: [
      { keys: ["Ctrl", "/"], description: "Toggle comment" },
      { keys: ["Ctrl", "D"], description: "Duplicate line" },
      { keys: ["Alt", "\u2191"], description: "Move line up" },
      { keys: ["Alt", "\u2193"], description: "Move line down" },
      { keys: ["Ctrl", "Shift", "K"], description: "Delete line" },
      { keys: ["Ctrl", "G"], description: "Go to line" },
    ],
  },
  {
    title: "Export",
    shortcuts: [
      { keys: ["Ctrl", "E"], description: "Export document" },
      { keys: ["Ctrl", "P"], description: "Print / Export PDF" },
    ],
  },
];

function KeyboardKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog() {
  const { ui, setKeyboardShortcutsOpen } = useAppStore();

  return (
    <Dialog open={ui.keyboardShortcutsOpen} onOpenChange={setKeyboardShortcutsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="font-semibold text-sm mb-3 text-foreground">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <span key={keyIdx} className="flex items-center">
                          <KeyboardKey>{key}</KeyboardKey>
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 mt-4 border-t text-sm text-muted-foreground">
          <p>
            Press <KeyboardKey>?</KeyboardKey> or <KeyboardKey>F1</KeyboardKey> to
            show this dialog at any time.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
