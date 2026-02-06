import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/Dialog";
import { Label } from "./ui/Label";
import { Switch } from "./ui/Switch";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Separator } from "./ui/Separator";
import { useAppStore } from "@/store/app-store";
import { useSettingsStore } from "@/store/settings-store";

export function SettingsDialog() {
  const { ui, setSettingsOpen } = useAppStore();
  const settings = useSettingsStore();

  return (
    <Dialog open={ui.settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Appearance */}
          <section>
            <h3 className="text-sm font-semibold mb-4">Appearance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose light or dark theme
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={settings.theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => settings.setTheme("light")}
                  >
                    Light
                  </Button>
                  <Button
                    variant={settings.theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => settings.setTheme("dark")}
                  >
                    Dark
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Editor */}
          <section>
            <h3 className="text-sm font-semibold mb-4">Editor</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Font Size</Label>
                  <p className="text-sm text-muted-foreground">
                    Editor font size in pixels
                  </p>
                </div>
                <Input
                  type="number"
                  min={10}
                  max={24}
                  value={settings.editorFontSize}
                  onChange={(e) => settings.setEditorFontSize(parseInt(e.target.value))}
                  className="w-20"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Tab Size</Label>
                  <p className="text-sm text-muted-foreground">
                    Number of spaces per tab
                  </p>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={settings.tabSize}
                  onChange={(e) => settings.setTabSize(parseInt(e.target.value))}
                  className="w-20"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Word Wrap</Label>
                  <p className="text-sm text-muted-foreground">
                    Wrap long lines
                  </p>
                </div>
                <Switch
                  checked={settings.wordWrap}
                  onCheckedChange={settings.setWordWrap}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Line Numbers</Label>
                  <p className="text-sm text-muted-foreground">
                    Show line numbers
                  </p>
                </div>
                <Switch
                  checked={settings.lineNumbers}
                  onCheckedChange={settings.setLineNumbers}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Minimap</Label>
                  <p className="text-sm text-muted-foreground">
                    Show code minimap
                  </p>
                </div>
                <Switch
                  checked={settings.minimap}
                  onCheckedChange={settings.setMinimap}
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* Preview */}
          <section>
            <h3 className="text-sm font-semibold mb-4">Preview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Live Preview</Label>
                  <p className="text-sm text-muted-foreground">
                    Update preview as you type
                  </p>
                </div>
                <Switch
                  checked={settings.livePreview}
                  onCheckedChange={settings.setLivePreview}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Preview Font Size</Label>
                  <p className="text-sm text-muted-foreground">
                    Preview font size in pixels
                  </p>
                </div>
                <Input
                  type="number"
                  min={12}
                  max={24}
                  value={settings.previewFontSize}
                  onChange={(e) => settings.setPreviewFontSize(parseInt(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* Auto-save */}
          <section>
            <h3 className="text-sm font-semibold mb-4">Auto-save</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Auto-save</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save changes
                  </p>
                </div>
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={settings.setAutoSave}
                />
              </div>

              {settings.autoSave && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-save Delay</Label>
                    <p className="text-sm text-muted-foreground">
                      Delay in milliseconds
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={1000}
                    max={30000}
                    step={1000}
                    value={settings.autoSaveDelay}
                    onChange={(e) => settings.setAutoSaveDelay(parseInt(e.target.value))}
                    className="w-24"
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
