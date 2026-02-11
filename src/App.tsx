import { useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { MenuBar } from "./components/MenuBar";
import { Editor } from "./components/Editor";
import { Preview } from "./components/Preview";
import { StatusBar } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import { OutlinePanel } from "./components/OutlinePanel";
import { Toaster } from "./components/ui/Toaster";
import { SettingsDialog } from "./components/SettingsDialog";
import { FindReplaceDialog } from "./components/FindReplaceDialog";
import { AboutDialog } from "./components/AboutDialog";
import { KeyboardShortcutsDialog } from "./components/KeyboardShortcutsDialog";
import { TemplateGallery } from "./components/TemplateGallery";
import { ShareDialog } from "./components/ShareDialog";
import { FormulaLibrary } from "./components/FormulaLibrary";
import { PresenceBar } from "./components/PresenceBar";
import { useAppStore } from "./store/app-store";
import { useSettingsStore } from "./store/settings-store";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useFileDrop } from "./hooks/useFileDrop";
import { useAutoSave } from "./hooks/useAutoSave";
import { useImageDrop } from "./hooks/useImageDrop";
import { initSpellChecker } from "./lib/spell-checker";

function App() {
  const { theme, showOutline } = useSettingsStore();
  const { loadSettings } = useAppStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Initialize file drop handling
  useFileDrop();

  // Auto-save when enabled
  useAutoSave();

  // Image drag-and-drop + paste
  const { isDragging } = useImageDrop();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    initSpellChecker();
  }, [loadSettings]);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Menu Bar + Presence */}
      <div className="flex items-center justify-between">
        <MenuBar />
        <PresenceBar />
      </div>

      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Outline Panel (collapsible) */}
          {showOutline && (
            <>
              <Panel defaultSize={15} minSize={10} maxSize={25}>
                <div className="h-full border-r bg-muted/20">
                  <OutlinePanel />
                </div>
              </Panel>
              <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />
            </>
          )}

          {/* Editor Panel */}
          <Panel defaultSize={showOutline ? 42 : 50} minSize={30}>
            <Editor />
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

          {/* Preview Panel */}
          <Panel defaultSize={showOutline ? 43 : 50} minSize={30}>
            <Preview />
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Dialogs */}
      <SettingsDialog />
      <FindReplaceDialog />
      <AboutDialog />
      <KeyboardShortcutsDialog />
      <TemplateGallery />
      <ShareDialog />
      <FormulaLibrary />

      {/* Toast notifications */}
      <Toaster />

      {/* Image drop overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="border-2 border-dashed border-primary rounded-xl p-12 text-center">
            <p className="text-2xl font-semibold text-primary">Drop image here</p>
            <p className="text-sm text-muted-foreground mt-2">Image will be saved to the assets folder</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
