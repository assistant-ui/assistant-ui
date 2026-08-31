import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import {
  defaultGenerativeUILibrary,
  generativeUIToJSX,
} from "@assistant-ui/react-generative-ui";
import { cn } from "@/lib/utils";
import { createOgMetadata } from "@/lib/og";
import { highlightElementSource } from "@/lib/element-source";
import {
  COMPONENT_CATEGORIES,
  COMPONENT_EXAMPLES,
} from "@/lib/component-reference";
import { describeComponentProps } from "@/lib/component-props";
import { demoCanvasClass } from "@/components/demo/utils/canvas";
import { IconGlyphGrid } from "@/components/gallery/icon-glyph-grid";
import { TemplatePreview } from "@/components/gallery/template-preview";
import { VocabCodeTabs } from "@/components/pages/elements/vocab-code-tabs";
import { VocabularyToc } from "@/components/pages/elements/vocabulary-toc";
import { SectionHeader } from "@/components/pages/elements/section-index";
import { ParametersTable } from "@/components/pages/docs/parameters-table";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";

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
    <ParametersTable
      parameters={rows.map((row) => ({
        name: row.name,
        type:
          row.enumValues && row.enumValues.length > 0
            ? row.enumValues.map((value) => `"${value}"`).join(" | ")
            : row.type,
        description: row.description ? renderInlineCode(row.description) : "",
        ...(row.required ? { required: true } : {}),
      }))}
    />
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
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <VocabularyToc categories={COMPONENT_CATEGORIES} />

        <article className="min-w-0">
          <Link
            href="/elements"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px] transition-colors lg:hidden"
          >
            <ArrowLeftIcon className="size-3.5" />
            Elements
          </Link>

          <header className="mt-8 lg:mt-0">
            <p className={typeEyebrow}>Generative</p>
            <h1 className={cn("mt-4", typePage)}>Component vocabulary</h1>
            <p className={cn("mt-4", typeDeck)}>
              Intrinsic components the model can emit through the{" "}
              <code className="font-mono text-sm">present</code> tool, rendered
              through the elements theme.
            </p>
          </header>

          <div className="mt-16 flex flex-col gap-20">
            {COMPONENT_CATEGORIES.map((category, categoryIndex) => (
              <section
                key={category.label}
                className="border-foreground/10 border-t pt-6"
              >
                <SectionHeader
                  index={categoryIndex + 1}
                  label={category.label}
                  count={category.components.length}
                />

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
                          <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                            {String(runningIndex).padStart(2, "0")}
                          </span>
                          <h3 className="text-[15px] font-medium">{name}</h3>
                        </div>
                        <p className="text-muted-foreground mt-2 max-w-lg text-[13.5px] leading-relaxed">
                          {renderInlineCode(entry.description)}
                        </p>

                        <div className="mt-5 flex flex-col gap-5">
                          <div
                            data-aui-theme="elements"
                            className={cn(
                              demoCanvasClass,
                              "[&_[data-aui='card']]:bg-background min-h-[180px] py-10",
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
                              <p className={cn(typeEyebrow, "mb-3")}>
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
