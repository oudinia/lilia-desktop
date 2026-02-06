import { useRef, useEffect, useCallback } from "react";
import MonacoEditor, { OnMount, BeforeMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useAppStore } from "@/store/app-store";
import { useSettingsStore } from "@/store/settings-store";
import { registerLmlLanguage } from "@/lib/lml-language";

// Global editor reference for external access (symbol insertion, etc.)
let globalEditorRef: editor.IStandaloneCodeEditor | null = null;

export function getEditorInstance() {
  return globalEditorRef;
}

export function insertTextAtCursor(text: string) {
  const editor = globalEditorRef;
  if (!editor) return;

  const selection = editor.getSelection();
  if (!selection) return;

  editor.executeEdits("insert", [
    {
      range: selection,
      text,
      forceMoveMarkers: true,
    },
  ]);
  editor.focus();
}

export function Editor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { document, setContent, setCursorPosition, setScrollPercent } = useAppStore();
  const {
    editorFontSize,
    editorFontFamily,
    tabSize,
    wordWrap,
    lineNumbers,
    minimap,
    theme,
  } = useSettingsStore();

  // Register LML language before editor mounts
  const handleBeforeMount: BeforeMount = (monaco) => {
    registerLmlLanguage(monaco);
  };

  // Setup editor after mount
  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    globalEditorRef = editor;

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition(e.position.lineNumber, e.position.column);
    });

    // Track scroll position for sync
    editor.onDidScrollChange((e) => {
      const scrollTop = e.scrollTop;
      const scrollHeight = e.scrollHeight - editor.getLayoutInfo().height;
      if (scrollHeight > 0) {
        const percent = scrollTop / scrollHeight;
        setScrollPercent(percent);
      }
    });

    // Focus editor
    editor.focus();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      globalEditorRef = null;
    };
  }, []);

  // Handle content changes
  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
    }
  };

  return (
    <div className="h-full w-full">
      <MonacoEditor
        height="100%"
        language="lml"
        theme={theme === "dark" ? "vs-dark" : "vs"}
        value={document.content}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        options={{
          fontSize: editorFontSize,
          fontFamily: editorFontFamily,
          tabSize,
          wordWrap: wordWrap ? "on" : "off",
          lineNumbers: lineNumbers ? "on" : "off",
          minimap: { enabled: minimap },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          lineHeight: 1.6,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          folding: true,
          foldingStrategy: "indentation",
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
        }}
      />
    </div>
  );
}
