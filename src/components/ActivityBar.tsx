import { FileText, BookOpen, Clock } from "lucide-react";
import { useSettingsStore, type SidePanel } from "@/store/settings-store";
import { useAppStore } from "@/store/app-store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/Tooltip";

interface PanelButton {
  id: SidePanel;
  icon: typeof FileText;
  label: string;
  shortcut: string;
  requiresDocument: boolean;
}

const panelButtons: PanelButton[] = [
  { id: "outline", icon: FileText, label: "Outline", shortcut: "Ctrl+Shift+O", requiresDocument: false },
  { id: "bibliography", icon: BookOpen, label: "Bibliography", shortcut: "Ctrl+Shift+B", requiresDocument: true },
  { id: "history", icon: Clock, label: "History", shortcut: "", requiresDocument: true },
];

export function ActivityBar() {
  const { activePanel, setActivePanel } = useSettingsStore();
  const filePath = useAppStore((s) => s.document.filePath);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full w-10 flex flex-col items-center py-2 gap-1 border-r bg-muted/30">
        {panelButtons.map((btn) => {
          const Icon = btn.icon;
          const isActive = activePanel === btn.id;
          const isDisabled = btn.requiresDocument && !filePath;

          return (
            <Tooltip key={btn.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => !isDisabled && setActivePanel(btn.id)}
                  disabled={isDisabled}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : isDisabled
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>
                  {btn.label}
                  {btn.shortcut && (
                    <span className="ml-2 text-xs text-muted-foreground">{btn.shortcut}</span>
                  )}
                </p>
                {isDisabled && (
                  <p className="text-xs text-muted-foreground">Save document first</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
