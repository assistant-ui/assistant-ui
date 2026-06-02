"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWidget } from "@/lib/gallery";
import { WIDGET_PREVIEWS } from "./previews";
import { CodeBlock } from "./code-block";
import { PropsTable } from "./props-table";
import { JsonUI, JsonUiEditor } from "@/components/generative-ui";
import { GALLERY_REGISTRY } from "./registry";
import { GALLERY_SPECS } from "./specs";

type View = "preview" | "json";

export function WidgetDetail({
  slug,
  source,
}: {
  slug: string;
  source?: string | null;
}) {
  const widget = getWidget(slug);
  const Preview = WIDGET_PREVIEWS[slug];
  const spec = GALLERY_SPECS[slug];
  const [view, setView] = useState<View>("preview");
  if (!widget || (!Preview && !spec)) return null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 md:py-20">
      <Link
        href="/gallery"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Gallery
      </Link>

      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
            {widget.category}
          </span>
          <span className="text-muted-foreground font-mono text-xs">
            {widget.api}
          </span>
        </div>
        <h1 className="text-2xl font-medium tracking-tight">{widget.title}</h1>
        <p className="text-muted-foreground mt-2">{widget.description}</p>
      </header>

      <section className="mb-10">
        {spec && (
          <div className="mb-2 flex justify-end gap-1">
            <ViewTab
              label="Preview"
              value="preview"
              view={view}
              onSelect={setView}
            />
            <ViewTab label="JSON" value="json" view={view} onSelect={setView} />
          </div>
        )}

        {spec && view === "json" ? (
          <JsonUiEditor initialSpec={spec} registry={GALLERY_REGISTRY} />
        ) : (
          <div className="border-border/60 bg-muted/30 flex min-h-[280px] items-center justify-center rounded-xl border p-8">
            {Preview ? (
              <Preview />
            ) : spec ? (
              <div className="w-full max-w-[320px]">
                <JsonUI node={spec} registry={GALLERY_REGISTRY} />
              </div>
            ) : null}
          </div>
        )}
      </section>

      {widget.usage && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium">Usage</h2>
          <CodeBlock code={widget.usage} />
        </section>
      )}

      {source && (
        <section className="mb-10">
          <h2 className="mb-1 text-sm font-medium">Component</h2>
          <p className="text-muted-foreground mb-3 text-sm">
            The React component wired in as{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-[0.85em]">
              render
            </code>
            .
          </p>
          <CodeBlock code={source} />
        </section>
      )}

      {widget.props.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium">Props</h2>
          <PropsTable props={widget.props} />
        </section>
      )}
    </main>
  );
}

function ViewTab({
  label,
  value,
  view,
  onSelect,
}: {
  label: string;
  value: View;
  view: View;
  onSelect: (v: View) => void;
}) {
  const active = view === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs transition-colors",
        active
          ? "bg-muted text-foreground font-medium"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
