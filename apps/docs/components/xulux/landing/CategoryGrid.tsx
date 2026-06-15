"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { XuluxTemplate } from "../templates/types";
import { useXuluxTemplateCatalog } from "../templates/useXuluxTemplateCatalog";
import { TemplateDetailModal } from "./TemplateDetailModal";
import { Thumbnail } from "./Thumbnail";

type Props = {
  onBrowseAll: () => void;
  onSelectTemplate: (template: XuluxTemplate) => void;
};

export function CategoryGrid({ onBrowseAll, onSelectTemplate }: Props) {
  const { templates, isLoading, error } = useXuluxTemplateCatalog();
  const [selected, setSelected] = useState<XuluxTemplate | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    void templates;
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState, templates]);

  if (isLoading) {
    return <TemplateGridSkeleton />;
  }

  const scrollLeft = () => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: -(el.clientWidth / 4), behavior: "smooth" });
  };

  const scrollRight = () => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: el.clientWidth / 4, behavior: "smooth" });
  };

  if (error) {
    return (
      <section className="border-border bg-card/40 w-full rounded-lg border px-4 py-3">
        <div className="text-sm font-medium">Catalog unavailable</div>
        <div className="text-muted-foreground mt-1 text-sm">{error}</div>
      </section>
    );
  }

  if (templates.length === 0) return null;

  return (
    <>
      <section className="w-full">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Templates</h2>
          <button
            type="button"
            onClick={onBrowseAll}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
          >
            Browse All
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={scrollLeft}
            aria-label="Scroll left"
            className={cn(
              "absolute top-1/2 -left-4 z-10 -translate-y-1/2",
              "flex size-8 items-center justify-center rounded-full",
              "border-border bg-background border shadow-md",
              "transition-opacity duration-150",
              canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <ChevronLeft className="size-4" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth"
            style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
          >
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelected(template)}
                style={{
                  scrollSnapAlign: "start",
                  flexShrink: 0,
                  width: "calc(25% - 12px)",
                }}
                className="border-border bg-card/40 hover:border-border/80 hover:bg-card/60 flex min-w-[190px] flex-col gap-2 rounded-xl border p-2 text-left transition-colors"
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

          <button
            type="button"
            onClick={scrollRight}
            aria-label="Scroll right"
            className={cn(
              "absolute top-1/2 -right-4 z-10 -translate-y-1/2",
              "flex size-8 items-center justify-center rounded-full",
              "border-border bg-background border shadow-md",
              "transition-opacity duration-150",
              canScrollRight ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </section>

      <TemplateDetailModal
        template={selected}
        allTemplates={templates}
        onClose={() => setSelected(null)}
        onSelect={(template) => {
          setSelected(null);
          onSelectTemplate(template);
        }}
      />
    </>
  );
}

function TemplateGridSkeleton() {
  return (
    <section className="w-full">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Templates</h2>
        <div className="bg-muted h-4 w-20 animate-pulse rounded" />
      </div>

      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="border-border bg-card/40 flex min-w-[190px] flex-1 flex-col gap-2 rounded-xl border p-2"
          >
            <div className="bg-muted aspect-video w-full animate-pulse rounded-md" />
            <div className="space-y-2 px-1 pb-1">
              <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
              <div className="space-y-1">
                <div className="bg-muted h-3 w-full animate-pulse rounded" />
                <div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
