import { useRef, useEffect, useCallback } from "react";
import MonacoEditor, { OnMount, BeforeMount } from "@monaco-editor/react";
import type { editor, MarkerSeverity } from "monaco-editor";
import { useAppStore } from "@/store/app-store";
import { useSettingsStore } from "@/store/settings-store";
import { registerLmlLanguage } from "@/lib/lml-language";
import { validateLml } from "@/lib/lml-validator";
import { checkDocument, suggest, addWord, isReady as spellReady } from "@/lib/spell-checker";

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
  const { document, setContent, setCursorPosition, setTopVisibleLine } = useAppStore();
  const {
    editorFontSize,
    editorFontFamily,
    tabSize,
    wordWrap,
    lineNumbers,
    minimap,
    theme,
    spellCheck,
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

  // Run spell checking on content
  const runSpellCheck = useCallback((content: string, monaco: typeof import("monaco-editor"), model: editor.ITextModel) => {
    if (!spellReady()) return;

    const errors = checkDocument(content);
    const markers = errors.map((err) => ({
      severity: monaco.MarkerSeverity.Hint,
      startLineNumber: err.line,
      startColumn: err.startColumn,
      endLineNumber: err.line,
      endColumn: err.endColumn,
      message: err.suggestions.length > 0
        ? `"${err.word}" — Did you mean: ${err.suggestions.join(", ")}?`
        : `"${err.word}" may be misspelled`,
      source: "spell-checker",
      tags: [monaco.MarkerTag.Unnecessary], // Shows as faded underline
    }));

    monaco.editor.setModelMarkers(model, "spell-checker", markers);
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

    // Track top visible line for preview scroll sync
    editor.onDidScrollChange(() => {
      const visibleRanges = editor.getVisibleRanges();
      if (visibleRanges.length > 0) {
        setTopVisibleLine(visibleRanges[0].startLineNumber);
      }
    });

    // Run initial validation and spell check
    const model = editor.getModel();
    if (model) {
      runValidation(model.getValue(), monaco, model);
      if (spellCheck) runSpellCheck(model.getValue(), monaco, model);

      // Validate + spell check on content change (debounced)
      let validationTimeout: ReturnType<typeof setTimeout>;
      let spellTimeout: ReturnType<typeof setTimeout>;
      model.onDidChangeContent(() => {
        clearTimeout(validationTimeout);
        validationTimeout = setTimeout(() => {
          runValidation(model.getValue(), monaco, model);
        }, 500);

        clearTimeout(spellTimeout);
        spellTimeout = setTimeout(() => {
          if (useSettingsStore.getState().spellCheck) {
            runSpellCheck(model.getValue(), monaco, model);
          } else {
            monaco.editor.setModelMarkers(model, "spell-checker", []);
          }
        }, 1000); // Longer debounce for spell check (heavier)
      });
    }

    // Register code action provider for spell suggestions
    monaco.languages.registerCodeActionProvider("lml", {
      provideCodeActions: (_model, _range, context) => {
        const spellMarkers = context.markers.filter(m => m.source === "spell-checker");
        if (spellMarkers.length === 0) return { actions: [], dispose: () => {} };

        const actions: import("monaco-editor").languages.CodeAction[] = [];

        for (const marker of spellMarkers) {
          // Extract the misspelled word from the marker range
          const wordRange = {
            startLineNumber: marker.startLineNumber,
            startColumn: marker.startColumn,
            endLineNumber: marker.endLineNumber,
            endColumn: marker.endColumn,
          };
          const word = _model.getValueInRange(wordRange);

          // Add suggestion actions
          const suggestions = suggest(word);
          for (const suggestion of suggestions) {
            actions.push({
              title: `Change to "${suggestion}"`,
              kind: "quickfix",
              edit: {
                edits: [{
                  resource: _model.uri,
                  textEdit: { range: wordRange, text: suggestion },
                  versionId: _model.getVersionId(),
                }],
              },
            });
          }

          // Add "Add to dictionary" action
          actions.push({
            title: `Add "${word}" to dictionary`,
            kind: "quickfix",
            command: {
              id: "spell.addWord",
              title: "Add to dictionary",
              arguments: [word],
            },
          });
        }

        return { actions, dispose: () => {} };
      },
    });

    // Register the addWord command
    editor.addCommand(0, () => {}, "spell.addWord");
    monaco.editor.registerCommand("spell.addWord", (_accessor, word: string) => {
      addWord(word);
      // Re-run spell check to clear the marker
      const m = editor.getModel();
      if (m) runSpellCheck(m.getValue(), monaco, m);
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
