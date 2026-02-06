import { useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { MenuBar } from "./components/MenuBar";
import { Editor } from "./components/Editor";
import { Preview } from "./components/Preview";
import { StatusBar } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import { Toaster } from "./components/ui/Toaster";
import { SettingsDialog } from "./components/SettingsDialog";
import { FindReplaceDialog } from "./components/FindReplaceDialog";
import { AboutDialog } from "./components/AboutDialog";
import { useAppStore } from "./store/app-store";
import { useSettingsStore } from "./store/settings-store";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useFileDrop } from "./hooks/useFileDrop";

function App() {
  const { theme } = useSettingsStore();
  const { loadSettings } = useAppStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Initialize file drop handling
  useFileDrop();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Menu Bar */}
      <MenuBar />

      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Editor Panel */}
          <Panel defaultSize={50} minSize={30}>
            <Editor />
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

          {/* Preview Panel */}
          <Panel defaultSize={50} minSize={30}>
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

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}

export default App;
