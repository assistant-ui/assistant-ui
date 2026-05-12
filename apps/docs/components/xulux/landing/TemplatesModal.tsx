"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { XuluxTemplate } from "../templates/types";
import { useXuluxTemplateCatalog } from "../templates/useXuluxTemplateCatalog";
import { TemplateDetailModal } from "./TemplateDetailModal";
import { Thumbnail } from "./Thumbnail";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategoryId?: string | null | undefined;
  onSelect: (template: XuluxTemplate) => void;
};

export function TemplatesModal({
  open,
  onOpenChange,
  initialCategoryId,
  onSelect,
}: Props) {
  const { categories, templates, isLoading, error } = useXuluxTemplateCatalog();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [detailTemplate, setDetailTemplate] = useState<XuluxTemplate | null>(
    null,
  );

  useEffect(() => {
    if (open) {
      setActiveCategory(initialCategoryId ?? "all");
      setQuery("");
    }
  }, [open, initialCategoryId]);

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
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
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
          <div className="scrollbar-thin max-h-[60vh] overflow-y-auto px-6 pb-6">
            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                Loading templates...
              </div>
            ) : error ? (
              <div className="mx-auto max-w-md py-10 text-center">
                <div className="font-medium text-foreground text-sm">
                  Catalog unavailable
                </div>
                <div className="mt-2 text-muted-foreground text-sm">
                  {error}
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
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
                    onClick={() => setDetailTemplate(template)}
                    className="group flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-2 text-left transition-colors hover:border-border/80 hover:bg-card/60"
                  >
                    <Thumbnail
                      gradient={template.gradient}
                      src={template.screenshotUrl}
                      label={template.title}
                      className="aspect-video w-full"
                    />
                    <div className="px-1 pb-1">
                      <div className="min-w-0 flex-1 truncate font-medium text-sm">
                        {template.title}
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-muted-foreground text-xs">
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
          : "border-border bg-transparent text-muted-foreground hover:border-border/80 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
