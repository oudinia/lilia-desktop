import { useState } from "react";
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

export function FindReplaceDialog() {
  const { ui, setFindReplaceOpen } = useAppStore();
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  const handleFindNext = () => {
    // TODO: Implement find next in editor
    console.log("Find next:", findText);
  };

  const handleFindPrevious = () => {
    // TODO: Implement find previous in editor
    console.log("Find previous:", findText);
  };

  const handleReplace = () => {
    // TODO: Implement replace in editor
    console.log("Replace:", findText, "with:", replaceText);
  };

  const handleReplaceAll = () => {
    // TODO: Implement replace all in editor
    console.log("Replace all:", findText, "with:", replaceText);
  };

  return (
    <Dialog open={ui.findReplaceOpen} onOpenChange={setFindReplaceOpen}>
      <DialogContent className="max-w-md">
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
              />
              <Button variant="outline" size="sm" onClick={handleFindPrevious}>
                ↑
              </Button>
              <Button variant="outline" size="sm" onClick={handleFindNext}>
                ↓
              </Button>
            </div>
            {matchCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {currentMatch} of {matchCount} matches
              </p>
            )}
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
              <Button variant="outline" size="sm" onClick={handleReplace}>
                Replace
              </Button>
              <Button variant="outline" size="sm" onClick={handleReplaceAll}>
                Replace All
              </Button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label>Case Sensitive</Label>
              <Switch
                checked={caseSensitive}
                onCheckedChange={setCaseSensitive}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Use Regular Expression</Label>
              <Switch checked={useRegex} onCheckedChange={setUseRegex} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
