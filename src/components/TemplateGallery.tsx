import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/Dialog";
import { useAppStore } from "@/store/app-store";
import { templates, Template } from "@/lib/templates";

const categoryLabels: Record<string, string> = {
  academic: "Academic",
  professional: "Professional",
  personal: "Personal",
};

const categoryColors: Record<string, string> = {
  academic: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  professional: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  personal: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

function TemplateCard({ template, onSelect }: { template: Template; onSelect: (t: Template) => void }) {
  // Generate a mini-preview from the first few lines
  const previewLines = template.content
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("@document") && !l.match(/^\w+:\s/))
    .slice(0, 6)
    .map((l) => l.replace(/^#+\s*/, "").replace(/@\w+(\([^)]*\))?/g, "").trim())
    .filter(Boolean);

  return (
    <button
      onClick={() => onSelect(template)}
      className="group text-left p-4 rounded-lg border border-border bg-card hover:border-primary hover:shadow-md transition-all cursor-pointer"
    >
      {/* Preview area */}
      <div className="h-24 mb-3 rounded bg-muted/50 p-3 overflow-hidden">
        <div className="space-y-1">
          {previewLines.map((line, i) => (
            <div
              key={i}
              className="text-[9px] text-muted-foreground truncate leading-tight"
              style={{ opacity: 1 - i * 0.12 }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
            {template.title}
          </h3>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${categoryColors[template.category]}`}>
            {categoryLabels[template.category]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {template.description}
        </p>
      </div>
    </button>
  );
}

export function TemplateGallery() {
  const { ui, setTemplateGalleryOpen, setContent, showToast } = useAppStore();

  const handleSelect = (template: Template) => {
    setContent(template.content);
    useAppStore.setState((state) => ({
      document: {
        ...state.document,
        content: template.content,
        fileName: template.fileName,
        isDirty: false,
        filePath: null,
        lastSaved: null,
        saveStatus: "saved" as const,
      },
    }));
    setTemplateGalleryOpen(false);
    showToast(`Created from "${template.title}" template`, "success");
  };

  return (
    <Dialog open={ui.templateGalleryOpen} onOpenChange={setTemplateGalleryOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>New from Template</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-2">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
