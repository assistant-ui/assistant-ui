import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  defaultGenerativeUILibrary,
  generativeUIToJSX,
} from "@assistant-ui/react-generative-ui";
import { createOgMetadata } from "@/lib/og";
import {
  COMPONENT_CATEGORIES,
  COMPONENT_EXAMPLES,
} from "@/lib/component-reference";
import { describeComponentProps } from "@/lib/component-props";
import { UsageCodeSwitcher } from "@/components/gallery/code-panel";
import { ComponentsToc } from "@/components/gallery/components-toc";
import { IconGlyphGrid } from "@/components/gallery/icon-glyph-grid";
import { TemplatePreview } from "@/components/gallery/template-preview";

const title = "Components";
const description =
  "Intrinsic generative-ui components the model can emit through the present tool, rendered through the styled library.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

function renderInlineCode(text: string) {
  return text.split("`").map((part, index) =>
    index % 2 === 1 ? (
      <code key={index} className="text-foreground font-mono text-[0.85em]">
        {part}
      </code>
    ) : (
      part
    ),
  );
}

function PropsTable({
  rows,
}: {
  rows: ReturnType<typeof describeComponentProps>;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="border-border/60 overflow-x-auto rounded-xl border">
      <table className="w-full text-left">
        <thead>
          <tr className="text-muted-foreground border-border/60 border-b text-xs">
            <th className="px-3 py-2 font-medium">Prop</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.name}
              className="border-border/60 border-b text-sm last:border-b-0"
            >
              <td className="px-3 py-2 align-top">
                <span className="font-mono text-[13px]">{row.name}</span>
                {row.required ? (
                  <span className="text-muted-foreground ml-1.5 text-[11px]">
                    required
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2 align-top">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[13px]">{row.type}</span>
                  {row.enumValues?.map((value) => (
                    <span
                      key={value}
                      className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </td>
              <td className="text-muted-foreground px-3 py-2 align-top">
                {row.description ? renderInlineCode(row.description) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GalleryComponentsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 md:py-24">
      <Link
        href="/gallery"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Gallery
      </Link>

      <header className="mt-8 mb-12 max-w-2xl">
        <h1 className="text-2xl font-medium tracking-tight">Components</h1>
        <p className="text-muted-foreground mt-2">
          Intrinsic components the model can emit through the{" "}
          <code className="text-foreground text-sm">present</code> tool,
          rendered here through the styled library.
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
        <ComponentsToc categories={COMPONENT_CATEGORIES} />

        <div className="flex flex-col gap-16">
          {COMPONENT_CATEGORIES.map((category) => (
            <section key={category.label}>
              <h2 className="mb-8 text-lg font-medium tracking-tight">
                {category.label}
              </h2>
              <div className="flex flex-col gap-14">
                {category.components.map((name) => {
                  const entry = defaultGenerativeUILibrary[name]!;
                  const example = COMPONENT_EXAMPLES[name]!;
                  const props = describeComponentProps(entry);

                  return (
                    <section key={name} id={name} className="scroll-mt-24">
                      <h3 className="text-base font-medium tracking-tight">
                        {name}
                      </h3>
                      <p className="text-muted-foreground mt-1.5 text-sm">
                        {renderInlineCode(entry.description)}
                      </p>

                      <div className="mt-5 flex flex-col gap-4">
                        <div className="aui-gallery-canvas">
                          <TemplatePreview tree={example} />
                        </div>
                        <UsageCodeSwitcher
                          json={JSON.stringify(example, null, 2)}
                          jsx={generativeUIToJSX(example, {
                            escape: true,
                            pretty: true,
                          })}
                        />
                        <PropsTable rows={props} />
                        {name === "Icon" ? (
                          <div className="mt-2">
                            <p className="text-muted-foreground mb-3 text-xs font-medium">
                              Built-in icon set
                            </p>
                            <IconGlyphGrid />
                          </div>
                        ) : null}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
