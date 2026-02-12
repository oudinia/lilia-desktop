import { invoke } from "@tauri-apps/api/tauri";
import { save } from "@tauri-apps/api/dialog";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
} from "./ui/Menubar";
import { useAppStore } from "@/store/app-store";
import { useSettingsStore } from "@/store/settings-store";
import { exportToLatex, exportToHtml, exportToMarkdown, exportToPdf } from "@/lib/exports";
import { parseLmlToHtml } from "@/lib/lml-renderer";
import { insertTextAtCursor } from "./Editor";

export function MenuBar() {
  const {
    document,
    newDocument,
    openDocument,
    openFile,
    saveDocument,
    saveDocumentAs,
    setSettingsOpen,
    setFindReplaceOpen,
    setAboutOpen,
    setKeyboardShortcutsOpen,
    setTemplateGalleryOpen,
    setShareDialogOpen,
    setFormulaLibraryOpen,
    showToast,
    ui,
  } = useAppStore();
  const { theme, setTheme, activePanel, setActivePanel } = useSettingsStore();

  const handleExport = async (format: "latex" | "html" | "markdown") => {
    const extensions: Record<string, string[]> = {
      latex: ["tex"],
      html: ["html"],
      markdown: ["md"],
    };
    const names: Record<string, string> = {
      latex: "LaTeX",
      html: "HTML",
      markdown: "Markdown",
    };

    try {
      const filePath = await save({
        filters: [
          { name: names[format] + " Files", extensions: extensions[format] },
          { name: "All Files", extensions: ["*"] },
        ],
        defaultPath: document.fileName.replace(".lml", "." + extensions[format][0]),
      });

      if (!filePath) return;

      let content: string;
      if (format === "latex") {
        content = exportToLatex(document.content);
      } else if (format === "html") {
        const renderedHtml = parseLmlToHtml(document.content);
        content = exportToHtml(document.content, renderedHtml);
      } else {
        content = exportToMarkdown(document.content);
      }

      await invoke("export_to_format", {
        options: {
          format,
          content,
          output_path: filePath,
        },
      });

      showToast(`Exported to ${names[format]}`, "success");
    } catch (error) {
      showToast(`Export failed: ${error}`, "error");
    }
  };

  const handleClearRecentFiles = async () => {
    try {
      await invoke("clear_recent_files");
      // Refresh recent files list
      const files = await invoke<string[]>("get_recent_files");
      useAppStore.setState((state) => ({
        ui: { ...state.ui, recentFiles: files },
      }));
    } catch (error) {
      showToast(`Failed to clear recent files: ${error}`, "error");
    }
  };

  return (
    <Menubar className="rounded-none border-b border-t-0 border-l-0 border-r-0 px-2">
      {/* File Menu */}
      <MenubarMenu>
        <MenubarTrigger className="font-medium">File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={newDocument}>
            New Document
            <MenubarShortcut>Ctrl+N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={() => setTemplateGalleryOpen(true)}>
            New from Template...
          </MenubarItem>
          <MenubarItem onClick={openDocument}>
            Open...
            <MenubarShortcut>Ctrl+O</MenubarShortcut>
          </MenubarItem>
          <MenubarSub>
            <MenubarSubTrigger>Open Recent</MenubarSubTrigger>
            <MenubarSubContent>
              {ui.recentFiles.length === 0 ? (
                <MenubarItem disabled>No recent files</MenubarItem>
              ) : (
                ui.recentFiles.map((file) => (
                  <MenubarItem key={file} onClick={() => openFile(file)}>
                    {file.split(/[/\\]/).pop()}
                  </MenubarItem>
                ))
              )}
              {ui.recentFiles.length > 0 && (
                <>
                  <MenubarSeparator />
                  <MenubarItem onClick={handleClearRecentFiles}>
                    Clear Recent Files
                  </MenubarItem>
                </>
              )}
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem onClick={saveDocument}>
            Save
            <MenubarShortcut>Ctrl+S</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={saveDocumentAs}>
            Save As...
            <MenubarShortcut>Ctrl+Shift+S</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={() => setShareDialogOpen(true)}>
            Share...
          </MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>Export</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onClick={() => {
                const renderedHtml = parseLmlToHtml(document.content);
                exportToPdf(document.content, renderedHtml);
              }}>
                PDF (Print)
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onClick={() => handleExport("latex")}>
                LaTeX (.tex)
              </MenubarItem>
              <MenubarItem onClick={() => handleExport("html")}>
                HTML (.html)
              </MenubarItem>
              <MenubarItem onClick={() => handleExport("markdown")}>
                Markdown (.md)
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>

      {/* Edit Menu */}
      <MenubarMenu>
        <MenubarTrigger className="font-medium">Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            Undo
            <MenubarShortcut>Ctrl+Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Redo
            <MenubarShortcut>Ctrl+Shift+Z</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Cut
            <MenubarShortcut>Ctrl+X</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Copy
            <MenubarShortcut>Ctrl+C</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Paste
            <MenubarShortcut>Ctrl+V</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={() => setFindReplaceOpen(true)}>
            Find and Replace
            <MenubarShortcut>Ctrl+F</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* View Menu */}
      <MenubarMenu>
        <MenubarTrigger className="font-medium">View</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={() => setActivePanel("outline")}>
            {activePanel === "outline" ? "Hide" : "Show"} Outline
            <MenubarShortcut>Ctrl+Shift+O</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={() => setActivePanel("bibliography")}>
            {activePanel === "bibliography" ? "Hide" : "Show"} Bibliography
            <MenubarShortcut>Ctrl+Shift+B</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={() => setActivePanel("history")}>
            {activePanel === "history" ? "Hide" : "Show"} History
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            Toggle Theme
            <MenubarShortcut>Ctrl+T</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Zoom In
            <MenubarShortcut>Ctrl++</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Zoom Out
            <MenubarShortcut>Ctrl+-</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Reset Zoom
            <MenubarShortcut>Ctrl+0</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Insert Menu */}
      <MenubarMenu>
        <MenubarTrigger className="font-medium">Insert</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={() => setFormulaLibraryOpen(true)}>
            Formula Library...
            <MenubarShortcut>Ctrl+Shift+E</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={() => insertTextAtCursor("\n# Heading\n")}>
            Heading
          </MenubarItem>
          <MenubarItem onClick={() => insertTextAtCursor("\n@equation(label: eq:, mode: display)\nE = mc^2\n")}>
            Equation
          </MenubarItem>
          <MenubarItem onClick={() => insertTextAtCursor("\n@code(python)\n# Your code here\n")}>
            Code Block
          </MenubarItem>
          <MenubarItem onClick={() => insertTextAtCursor("\n@table\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n")}>
            Table
          </MenubarItem>
          <MenubarItem onClick={() => insertTextAtCursor("\n@figure(src: /path/to/image.png, alt: Description)\nFigure caption here.\n")}>
            Figure
          </MenubarItem>
          <MenubarItem onClick={() => insertTextAtCursor("\n@list\n- Item 1\n- Item 2\n- Item 3\n")}>
            List
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={() => insertTextAtCursor("\n---\n")}>
            Horizontal Rule
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* Help Menu */}
      <MenubarMenu>
        <MenubarTrigger className="font-medium">Help</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Documentation</MenubarItem>
          <MenubarItem onClick={() => setKeyboardShortcutsOpen(true)}>
            Keyboard Shortcuts
            <MenubarShortcut>F1</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={() => setSettingsOpen(true)}>
            Settings
            <MenubarShortcut>Ctrl+,</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={() => setAboutOpen(true)}>
            About Lilia
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
