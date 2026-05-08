import { useMemo, useState, useEffect } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/agent-playground/ui/dialog";
import { Input } from "@/components/agent-playground/ui/input";
import { useTemplateCatalog } from "@/components/agent-playground/hooks/useTemplateCatalog";
import type { Template } from "@/components/agent-playground/lib/templates";
import { Thumbnail } from "./Thumbnail";
import { TemplateDetailModal } from "./TemplateDetailModal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategoryId?: string | null | undefined;
  onSelect: (template: Template) => void;
};

export function TemplatesModal({ open, onOpenChange, initialCategoryId, onSelect }: Props) {
  const { categories, templates, isLoading, error } = useTemplateCatalog();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [detailTemplate, setDetailTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (open) {
      setActiveCat(initialCategoryId ?? "all");
      setQuery("");
    }
  }, [open, initialCategoryId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (activeCat !== "all" && t.categoryId !== activeCat) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [query, activeCat, templates]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle>Templates</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="px-6 pb-3 flex flex-wrap gap-2">
          <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")}>
            All
          </CatChip>
          {categories.map((c) => (
            <CatChip
              key={c.id}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
            >
              {c.name}
            </CatChip>
          ))}
        </div>
        <div className="scrollbar-thin max-h-[60vh] overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading templates...
            </div>
          ) : error ? (
            <div className="mx-auto max-w-md py-10 text-center">
              <div className="text-sm font-medium text-foreground">Catalog unavailable</div>
              <div className="mt-2 text-sm text-muted-foreground">{error}</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {query ? `No templates match “${query}”.` : 'No templates available.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDetailTemplate(t)}
                  className="group flex flex-col gap-2 rounded-xl border border-border bg-card/40 p-2 text-left transition-colors hover:border-border/80 hover:bg-card/60"
                >
                  <Thumbnail gradient={t.gradient} src={t.screenshotUrl} label={t.title} className="aspect-video w-full" />
                  <div className="px-1 pb-1">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</div>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {t.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <TemplateDetailModal
      template={detailTemplate}
      allTemplates={templates}
      onClose={() => setDetailTemplate(null)}
      onSelect={(t) => {
        setDetailTemplate(null);
        onOpenChange(false);
        onSelect(t);
      }}
    />
    </>
  );
}

function CatChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-foreground/40 bg-foreground/10 text-foreground"
          : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-border/80",
      )}
    >
      {children}
    </button>
  );
}
