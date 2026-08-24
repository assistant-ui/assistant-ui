import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import {
  defaultGenerativeUILibrary,
  generativeUIToJSX,
} from "@assistant-ui/react-generative-ui";
import { cn } from "@/lib/utils";
import { mono } from "@/components/elements/surfaces";
import { createOgMetadata } from "@/lib/og";
import { highlightElementSource } from "@/lib/element-source";
import {
  COMPONENT_CATEGORIES,
  COMPONENT_EXAMPLES,
} from "@/lib/component-reference";
import { describeComponentProps } from "@/lib/component-props";
import { demoCanvasClass } from "@/components/pages/elements/demos/canvas";
import { IconGlyphGrid } from "@/components/gallery/icon-glyph-grid";
import { TemplatePreview } from "@/components/gallery/template-preview";
import { VocabCodeTabs } from "@/components/pages/elements/vocab-code-tabs";
import { VocabularyToc } from "@/components/pages/elements/vocabulary-toc";
import { PageFrame } from "@/components/shared/page-frame";

const title = "Component vocabulary";
const description =
  "Intrinsic generative-ui components the model can emit through the present tool, rendered through the elements theme.";

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
    <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] overflow-hidden rounded-2xl">
      <div
        className={cn(
          mono,
          "text-foreground/35 hidden items-baseline gap-4 px-5 pt-3.5 pb-2 md:flex",
        )}
      >
        <span className="w-36 shrink-0">Prop</span>
        <span className="w-48 shrink-0">Type</span>
        <span className="flex-1">Description</span>
      </div>
      <div className="bg-foreground/[0.06] mx-5 hidden h-px md:block" />
      {rows.map((row) => (
        <div
          key={row.name}
          className="hover:bg-foreground/[0.02] flex flex-col gap-1 px-5 py-3 text-[13px] transition-colors md:flex-row md:items-baseline md:gap-4"
        >
          <span className="shrink-0 font-mono text-[12.5px] font-medium md:w-36">
            {row.name}
            {row.required && (
              <span
                className="ms-0.5 text-blue-500 dark:text-blue-400"
                title="Required"
              >
                *
              </span>
            )}
          </span>
          <span className="shrink-0 md:w-48">
            <span className="text-foreground/45 font-mono text-[12px] break-words">
              {row.type}
            </span>
            {row.enumValues && row.enumValues.length > 0 && (
              <span className="mt-1 flex flex-wrap gap-1">
                {row.enumValues.map((value) => (
                  <span
                    key={value}
                    className="bg-foreground/[0.05] text-foreground/55 dark:bg-foreground/[0.08] rounded px-1.5 py-0.5 font-mono text-[10.5px]"
                  >
                    {value}
                  </span>
                ))}
              </span>
            )}
          </span>
          <span className="text-foreground/55 flex-1 leading-relaxed">
            {row.description ? renderInlineCode(row.description) : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function VocabularyPage() {
  let runningIndex = 0;

  const highlighted = new Map<
    string,
    { jsonHtml: string; jsxHtml: string; jsonRaw: string; jsxRaw: string }
  >();
  for (const category of COMPONENT_CATEGORIES) {
    for (const name of category.components) {
      const example = COMPONENT_EXAMPLES[name]!;
      const jsonRaw = JSON.stringify(example, null, 2);
      const jsxRaw = generativeUIToJSX(example, { escape: true, pretty: true });
      highlighted.set(name, {
        jsonRaw,
        jsxRaw,
        jsonHtml: await highlightElementSource(jsonRaw, "json"),
        jsxHtml: await highlightElementSource(jsxRaw),
      });
    }
  }

  return (
    <PageFrame pad="sub" className="aui-gallery">
      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-14">
        <VocabularyToc categories={COMPONENT_CATEGORIES} />

        <article className="min-w-0">
          <Link
            href="/elements"
            className="text-foreground/45 hover:text-foreground/90 inline-flex items-center gap-1.5 text-[13px] transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" />
            Elements
          </Link>

          <header className="mt-8">
            <p className={cn(mono, "text-foreground/35")}>Generative</p>
            <h1 className="mt-3 text-2xl font-medium tracking-tight md:text-3xl">
              Component vocabulary
            </h1>
            <p className="text-foreground/55 mt-3 max-w-lg text-[15px] leading-relaxed">
              Intrinsic components the model can emit through the{" "}
              <code className="font-mono text-sm">present</code> tool, rendered
              through the elements theme.
            </p>
          </header>

          <div className="mt-16 flex flex-col gap-20">
            {COMPONENT_CATEGORIES.map((category, categoryIndex) => (
              <section
                key={category.label}
                className="border-foreground/10 border-t border-dashed pt-8"
              >
                <div className="flex items-baseline gap-3">
                  <span className={cn(mono, "text-foreground/30 tabular-nums")}>
                    {String(categoryIndex + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-sm font-medium">{category.label}</h2>
                  <span
                    className={cn(
                      mono,
                      "text-foreground/35 ms-auto tabular-nums",
                    )}
                  >
                    {category.components.length} components
                  </span>
                </div>

                <div className="mt-10 flex flex-col gap-16">
                  {category.components.map((name) => {
                    runningIndex += 1;
                    const entry = defaultGenerativeUILibrary[name]!;
                    const example = COMPONENT_EXAMPLES[name]!;
                    const props = describeComponentProps(entry);
                    const code = highlighted.get(name)!;

                    return (
                      <section key={name} id={name} className="scroll-mt-24">
                        <div className="flex items-baseline gap-2.5">
                          <span
                            className={cn(
                              mono,
                              "text-foreground/30 tabular-nums",
                            )}
                          >
                            {String(runningIndex).padStart(2, "0")}
                          </span>
                          <h3 className="text-[15px] font-medium">{name}</h3>
                        </div>
                        <p className="text-foreground/55 mt-2 max-w-lg text-[13.5px] leading-relaxed">
                          {renderInlineCode(entry.description)}
                        </p>

                        <div className="mt-5 flex flex-col gap-5">
                          <div
                            data-aui-theme="elements"
                            className={cn(
                              demoCanvasClass,
                              "[&_[data-aui='card']]:bg-background min-h-[180px] rounded-[20px] py-10",
                            )}
                          >
                            <div className="w-full max-w-sm">
                              <TemplatePreview tree={example} />
                            </div>
                          </div>
                          <VocabCodeTabs {...code} />
                          <PropsTable rows={props} />
                          {name === "Icon" && (
                            <div>
                              <p
                                className={cn(mono, "text-foreground/35 mb-3")}
                              >
                                Built-in icon set
                              </p>
                              <IconGlyphGrid />
                            </div>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </PageFrame>
  );
}
