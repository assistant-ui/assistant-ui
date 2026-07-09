"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { analytics } from "@/lib/analytics";
import {
  getXuluxTemplateAnalyticsId,
  useXuluxAnalytics,
  withXuluxContext,
} from "@/lib/xulux/analytics-context";
import { cn } from "@/lib/utils";
import type { XuluxTemplate } from "../templates/types";
import { useXuluxTemplateCatalog } from "../templates/useXuluxTemplateCatalog";
import { TemplateDetailModal } from "./TemplateDetailModal";
import { Thumbnail } from "./Thumbnail";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openSurface: "landing_carousel" | "header";
  initialCategoryId?: string | null | undefined;
  onSelect: (template: XuluxTemplate) => void;
};

export function TemplatesModal({
  open,
  onOpenChange,
  openSurface,
  initialCategoryId,
  onSelect,
}: Props) {
  const analyticsCtx = useXuluxAnalytics();
  const { categories, templates, isLoading, error } = useXuluxTemplateCatalog();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [detailTemplate, setDetailTemplate] = useState<XuluxTemplate | null>(
    null,
  );
  const openTrackedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setActiveCategory(initialCategoryId ?? "all");
      setQuery("");
    }
  }, [open, initialCategoryId]);

  useEffect(() => {
    if (!open) {
      openTrackedRef.current = false;
      return;
    }
    if (openTrackedRef.current) return;
    openTrackedRef.current = true;
    analytics.xulux.templatesOpened(
      withXuluxContext(analyticsCtx, { surface: openSurface }),
    );
  }, [analyticsCtx, open, openSurface]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((template) => {
      if (activeCategory !== "all" && template.categoryId !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        template.title.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q) ||
        template.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [activeCategory, query, templates]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="px-6 pt-5 pb-3">
            <DialogTitle>Templates</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search templates..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 px-6 pb-3">
            <CategoryChip
              active={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
            >
              All
            </CategoryChip>
            {categories.map((category) => (
              <CategoryChip
                key={category.id}
                active={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </CategoryChip>
            ))}
          </div>
          <div className="max-h-[60vh] scrollbar-thin overflow-y-auto px-6 pb-6">
            {isLoading ? (
              <div className="text-muted-foreground py-10 text-center text-sm">
                Loading templates...
              </div>
            ) : error ? (
              <div className="mx-auto max-w-md py-10 text-center">
                <div className="text-foreground text-sm font-medium">
                  Catalog unavailable
                </div>
                <div className="text-muted-foreground mt-2 text-sm">
                  {error}
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-muted-foreground py-10 text-center text-sm">
                {query
                  ? `No templates match "${query}".`
                  : "No templates available."}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {filtered.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      analytics.xulux.templateSelected(
                        withXuluxContext(analyticsCtx, {
                          template_id: getXuluxTemplateAnalyticsId(template),
                          template_kind: template.kind,
                          surface: "templates_modal",
                          action: "open_detail",
                        }),
                      );
                      setDetailTemplate(template);
                    }}
                    className="group border-border bg-card/40 hover:border-border/80 hover:bg-card/60 flex flex-col gap-2 rounded-lg border p-2 text-left transition-colors"
                  >
                    <Thumbnail
                      gradient={template.gradient}
                      src={template.screenshotUrl}
                      previewUrl={template.previewUrl}
                      label={template.title}
                      className="aspect-video w-full"
                    />
                    <div className="px-1 pb-1">
                      <div className="min-w-0 flex-1 truncate text-sm font-medium">
                        {template.title}
                      </div>
                      <div className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                        {template.description}
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
        onSelect={(template) => {
          setDetailTemplate(null);
          onOpenChange(false);
          onSelect(template);
        }}
      />
    </>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-1 text-xs transition-colors",
        active
          ? "border-foreground/40 bg-foreground/10 text-foreground"
          : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground bg-transparent",
      )}
    >
      {children}
    </button>
  );
}
