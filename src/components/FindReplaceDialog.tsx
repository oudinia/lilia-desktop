import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/Dialog";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Label } from "./ui/Label";
import { Switch } from "./ui/Switch";
import { useAppStore } from "@/store/app-store";
import {
  findInEditor,
  selectMatch,
  replaceMatch,
  replaceAllMatches,
} from "./Editor";
import type { editor } from "monaco-editor";

export function FindReplaceDialog() {
  const { ui, setFindReplaceOpen } = useAppStore();
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matches, setMatches] = useState<editor.FindMatch[]>([]);
  const [currentMatch, setCurrentMatch] = useState(-1);

  // Search when text or options change
  const performSearch = useCallback(() => {
    if (!findText) {
      setMatches([]);
      setCurrentMatch(-1);
      return;
    }

    const result = findInEditor(findText, { caseSensitive, useRegex, wholeWord });
    setMatches(result.matches);
    setCurrentMatch(result.currentIndex);

    // Select first match if found
    if (result.matches.length > 0) {
      selectMatch(result.matches[0]);
    }
  }, [findText, caseSensitive, useRegex, wholeWord]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(performSearch, 150);
    return () => clearTimeout(timeout);
  }, [performSearch]);

  // Clear state when dialog closes
  useEffect(() => {
    if (!ui.findReplaceOpen) {
      setFindText("");
      setReplaceText("");
      setMatches([]);
      setCurrentMatch(-1);
    }
  }, [ui.findReplaceOpen]);

  const handleFindNext = () => {
    if (matches.length === 0) return;
    const nextIndex = (currentMatch + 1) % matches.length;
    setCurrentMatch(nextIndex);
    selectMatch(matches[nextIndex]);
  };

  const handleFindPrevious = () => {
    if (matches.length === 0) return;
    const prevIndex = currentMatch <= 0 ? matches.length - 1 : currentMatch - 1;
    setCurrentMatch(prevIndex);
    selectMatch(matches[prevIndex]);
  };

  const handleReplace = () => {
    if (matches.length === 0 || currentMatch < 0) return;

    replaceMatch(matches[currentMatch], replaceText);

    // Re-search after replace
    setTimeout(() => {
      const result = findInEditor(findText, { caseSensitive, useRegex, wholeWord });
      setMatches(result.matches);

      // Stay at current index or move to next available
      const newIndex = Math.min(currentMatch, result.matches.length - 1);
      setCurrentMatch(newIndex >= 0 ? newIndex : -1);

      if (newIndex >= 0 && result.matches[newIndex]) {
        selectMatch(result.matches[newIndex]);
      }
    }, 50);
  };

  const handleReplaceAll = () => {
    if (!findText) return;

    const count = replaceAllMatches(findText, replaceText, { caseSensitive, useRegex });
    setMatches([]);
    setCurrentMatch(-1);

    if (count > 0) {
      // Could show a toast notification here
      console.log(`Replaced ${count} occurrence(s)`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        handleFindPrevious();
      } else {
        handleFindNext();
      }
      e.preventDefault();
    } else if (e.key === "Escape") {
      setFindReplaceOpen(false);
    }
  };

  return (
    <Dialog open={ui.findReplaceOpen} onOpenChange={setFindReplaceOpen}>
      <DialogContent className="max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Find and Replace</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Find */}
          <div className="space-y-2">
            <Label htmlFor="find">Find</Label>
            <div className="flex gap-2">
              <Input
                id="find"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="Search..."
                className="flex-1"
                autoFocus
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleFindPrevious}
                disabled={matches.length === 0}
                title="Previous match (Shift+Enter)"
              >
                ↑
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFindNext}
                disabled={matches.length === 0}
                title="Next match (Enter)"
              >
                ↓
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {findText ? (
                matches.length > 0 ? (
                  `${currentMatch + 1} of ${matches.length} matches`
                ) : (
                  "No matches"
                )
              ) : (
                "Enter text to search"
              )}
            </p>
          </div>

          {/* Replace */}
          <div className="space-y-2">
            <Label htmlFor="replace">Replace</Label>
            <Input
              id="replace"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace with..."
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReplace}
                disabled={matches.length === 0}
              >
                Replace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReplaceAll}
                disabled={!findText}
              >
                Replace All
              </Button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="case-sensitive">Case Sensitive</Label>
              <Switch
                id="case-sensitive"
                checked={caseSensitive}
                onCheckedChange={setCaseSensitive}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="whole-word">Whole Word</Label>
              <Switch
                id="whole-word"
                checked={wholeWord}
                onCheckedChange={setWholeWord}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="use-regex">Use Regular Expression</Label>
              <Switch
                id="use-regex"
                checked={useRegex}
                onCheckedChange={setUseRegex}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
