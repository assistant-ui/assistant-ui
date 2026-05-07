import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTemplateCatalog } from "@/components/agent-playground/hooks/useTemplateCatalog";
import type { Template } from "@/components/agent-playground/lib/templates";
import { Thumbnail } from "./Thumbnail";
import { TemplateDetailModal } from "./TemplateDetailModal";
import { cn } from "@/lib/utils";

type Props = {
  onBrowseAll: () => void;
  onSelectTemplate: (template: Template) => void;
};

export function CategoryGrid({ onBrowseAll, onSelectTemplate }: Props) {
  const { templates, error } = useTemplateCatalog();
  const [selected, setSelected] = useState<Template | null>(null);
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
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, templates]);

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
      <section className="w-full rounded-lg border border-border bg-card/40 px-4 py-3">
        <div className="text-sm font-medium">Catalog unavailable</div>
        <div className="mt-1 text-sm text-muted-foreground">{error}</div>
      </section>
    );
  }

  if (templates.length === 0) return null;

  return (
    <>
      <section className="w-full">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Templates</h2>
          <button
            type="button"
            onClick={onBrowseAll}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
              "absolute -left-4 top-1/2 -translate-y-1/2 z-10",
              "flex items-center justify-center size-8 rounded-full",
              "bg-background border border-border shadow-md",
              "transition-opacity duration-150",
              canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            <ChevronLeft className="size-4" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth"
            style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
          >
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t)}
                style={{ scrollSnapAlign: "start", flexShrink: 0, width: "calc(25% - 12px)" }}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card/40 p-2 text-left transition-colors hover:border-border/80 hover:bg-card/60"
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

          <button
            type="button"
            onClick={scrollRight}
            aria-label="Scroll right"
            className={cn(
              "absolute -right-4 top-1/2 -translate-y-1/2 z-10",
              "flex items-center justify-center size-8 rounded-full",
              "bg-background border border-border shadow-md",
              "transition-opacity duration-150",
              canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none",
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
        onSelect={(t) => {
          setSelected(null);
          onSelectTemplate(t);
        }}
      />
    </>
  );
}
