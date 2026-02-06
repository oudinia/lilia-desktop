import { useRef, useEffect, useCallback } from "react";
import MonacoEditor, { OnMount, BeforeMount } from "@monaco-editor/react";
import type { editor, MarkerSeverity } from "monaco-editor";
import { useAppStore } from "@/store/app-store";
import { useSettingsStore } from "@/store/settings-store";
import { registerLmlLanguage } from "@/lib/lml-language";
import { validateLml } from "@/lib/lml-validator";

// Global editor reference for external access (symbol insertion, etc.)
let globalEditorRef: editor.IStandaloneCodeEditor | null = null;
let globalMonacoRef: typeof import("monaco-editor") | null = null;

export function getEditorInstance() {
  return globalEditorRef;
}

export function getMonacoInstance() {
  return globalMonacoRef;
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

export interface FindResult {
  matches: editor.FindMatch[];
  currentIndex: number;
}

export function findInEditor(
  searchText: string,
  options: { caseSensitive?: boolean; useRegex?: boolean; wholeWord?: boolean } = {}
): FindResult {
  const editorInstance = globalEditorRef;
  const monaco = globalMonacoRef;
  if (!editorInstance || !monaco) return { matches: [], currentIndex: -1 };

  const model = editorInstance.getModel();
  if (!model) return { matches: [], currentIndex: -1 };

  const matches = model.findMatches(
    searchText,
    true, // searchOnlyEditableRange
    options.useRegex ?? false,
    options.caseSensitive ?? false,
    options.wholeWord ? "\\b" : null,
    true // captureMatches
  );

  return { matches, currentIndex: matches.length > 0 ? 0 : -1 };
}

export function selectMatch(match: editor.FindMatch) {
  const editorInstance = globalEditorRef;
  if (!editorInstance) return;

  editorInstance.setSelection(match.range);
  editorInstance.revealRangeInCenter(match.range);
  editorInstance.focus();
}

export function replaceMatch(match: editor.FindMatch, replaceText: string) {
  const editorInstance = globalEditorRef;
  if (!editorInstance) return;

  editorInstance.executeEdits("replace", [
    {
      range: match.range,
      text: replaceText,
      forceMoveMarkers: true,
    },
  ]);
}

export function replaceAllMatches(
  searchText: string,
  replaceText: string,
  options: { caseSensitive?: boolean; useRegex?: boolean } = {}
): number {
  const editorInstance = globalEditorRef;
  if (!editorInstance) return 0;

  const model = editorInstance.getModel();
  if (!model) return 0;

  const matches = model.findMatches(
    searchText,
    true,
    options.useRegex ?? false,
    options.caseSensitive ?? false,
    null,
    true
  );

  if (matches.length === 0) return 0;

  // Replace from end to start to maintain positions
  const edits = matches
    .slice()
    .reverse()
    .map((match) => ({
      range: match.range,
      text: replaceText,
      forceMoveMarkers: true,
    }));

  editorInstance.executeEdits("replace-all", edits);
  return matches.length;
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

  // Run validation on content
  const runValidation = useCallback((content: string, monaco: typeof import("monaco-editor"), model: editor.ITextModel) => {
    const result = validateLml(content);

    const severityMap: Record<string, MarkerSeverity> = {
      error: monaco.MarkerSeverity.Error,
      warning: monaco.MarkerSeverity.Warning,
      info: monaco.MarkerSeverity.Info,
    };

    const markers = result.messages.map((msg) => ({
      severity: severityMap[msg.severity] || monaco.MarkerSeverity.Info,
      startLineNumber: msg.line,
      startColumn: msg.column,
      endLineNumber: msg.line,
      endColumn: msg.endColumn || msg.column + 1,
      message: msg.message,
      source: "lml",
      code: msg.code,
    }));

    monaco.editor.setModelMarkers(model, "lml-validator", markers);
  }, []);

  // Setup editor after mount
  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    globalEditorRef = editor;
    globalMonacoRef = monaco;

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

    // Run initial validation
    const model = editor.getModel();
    if (model) {
      runValidation(model.getValue(), monaco, model);

      // Validate on content change (debounced)
      let validationTimeout: ReturnType<typeof setTimeout>;
      model.onDidChangeContent(() => {
        clearTimeout(validationTimeout);
        validationTimeout = setTimeout(() => {
          runValidation(model.getValue(), monaco, model);
        }, 500);
      });
    }

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
