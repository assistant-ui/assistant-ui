import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono } from "@/components/elements/surfaces";
import { createOgMetadata } from "@/lib/og";
import {
  highlightElementSource,
  readElementSource,
} from "@/lib/element-source";
import { CopyButton } from "@/components/elements/copy-button";
import { demoCanvasClass } from "@/components/elements/canvas";
import { DemoStage } from "@/components/elements/demo-stage";
import { DemoVariants } from "@/components/elements/demo-variants";
import { InstallCommand } from "@/components/elements/install-command";
import { ELEMENT_DOCS } from "@/components/elements/element-docs";
import {
  ELEMENT_COUNT,
  ELEMENTS,
  getElement,
} from "@/components/elements/registry";
import { getGenerativeElement } from "@/lib/generative-elements";

const GENERATIVE_USAGE = `import { renderGenerativeUI } from "@assistant-ui/react-generative-ui";

<div data-aui-theme="elements">
  {renderGenerativeUI(spec, library, { status: "done" })}
</div>`;

export function generateStaticParams() {
  return ELEMENTS.map((element) => ({ slug: element.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const element = getElement(slug);
  if (!element) return {};
  const title = `${element.title} | Elements`;
  return {
    title,
    description: element.description,
    ...createOgMetadata(element.title, element.description),
  };
}

function SectionHeading({
  title,
  meta,
  copyText,
}: {
  title: string;
  meta?: string;
  copyText?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-sm font-medium">{title}</h2>
      {meta !== undefined && (
        <span className={cn(mono, "text-foreground/35")}>{meta}</span>
      )}
      {copyText !== undefined && (
        <CopyButton text={copyText} className="ms-auto" />
      )}
    </div>
  );
}

function CodeSurface({ html }: { html: string }) {
  return (
    <div
      className="bg-foreground/[0.025] dark:bg-foreground/[0.04] mt-4 overflow-hidden rounded-2xl [&_.line]:px-0! [&_pre]:overflow-x-auto [&_pre]:bg-transparent! [&_pre]:p-5 [&_pre]:font-mono [&_pre]:text-[12.5px] [&_pre]:leading-[1.7] md:[&_pre]:p-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default async function ElementPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const element = getElement(slug);
  if (!element) notFound();

  const doc = ELEMENT_DOCS[slug];
  const generativeEntry = element.generative
    ? getGenerativeElement(slug)
    : undefined;
  const registryName = `elements-${element.installName ?? element.slug}`;
  const source = element.file ? await readElementSource(element.file) : null;
  const highlightedSource = source
    ? await highlightElementSource(source)
    : null;
  const highlightedUsage = doc ? await highlightElementSource(doc.usage) : null;
  const specJson = generativeEntry
    ? JSON.stringify(generativeEntry.template.tree, null, 2)
    : null;
  const highlightedSpec = specJson
    ? await highlightElementSource(specJson, "json")
    : null;
  const highlightedGenerativeUsage = generativeEntry
    ? await highlightElementSource(GENERATIVE_USAGE)
    : null;

  const previous = ELEMENTS[element.index - 2];
  const next = ELEMENTS[element.index];

  return (
    <>
      <header className="mt-8 lg:mt-0">
        <p className={cn(mono, "text-foreground/35 tabular-nums")}>
          {String(element.index).padStart(2, "0")} /{" "}
          {String(ELEMENT_COUNT).padStart(2, "0")} · {element.section}
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight md:text-3xl">
          {element.title}
        </h1>
        <p className="text-foreground/55 mt-3 max-w-lg text-[15px] leading-relaxed">
          {element.description}
        </p>
      </header>

      {element.variants ? (
        <DemoVariants
          variants={element.variants}
          replay={element.replay !== false}
        />
      ) : (
        <div
          className={cn(
            demoCanvasClass,
            "mt-8",
            element.generative ? "min-h-[400px] py-10" : "h-[400px]",
          )}
        >
          <DemoStage replay={element.replay !== false}>
            <element.Component />
          </DemoStage>
        </div>
      )}

      <section className="mt-12">
        {element.generative ? (
          <InstallCommand npmPackage="@assistant-ui/react-generative-ui" />
        ) : (
          <InstallCommand registryName={registryName} />
        )}
      </section>

      {highlightedGenerativeUsage && (
        <section className="mt-12">
          <SectionHeading title="Usage" copyText={GENERATIVE_USAGE} />
          <CodeSurface html={highlightedGenerativeUsage} />
        </section>
      )}

      {generativeEntry && highlightedSpec && specJson && (
        <section className="mt-12">
          <SectionHeading
            title="Spec"
            meta={generativeEntry.template.category}
            copyText={specJson}
          />
          <CodeSurface html={highlightedSpec} />
          <p className="mt-4 text-[13px]">
            <Link
              href="/elements/vocabulary"
              className="text-foreground/45 hover:text-foreground/90 transition-colors"
            >
              Component vocabulary →
            </Link>
          </p>
        </section>
      )}

      {doc && highlightedUsage && (
        <section className="mt-12">
          <SectionHeading title="Usage" copyText={doc.usage} />
          <CodeSurface html={highlightedUsage} />
        </section>
      )}

      {doc && doc.props.length > 0 && (
        <section className="mt-12">
          <SectionHeading title="Props" />
          {doc.props.map((table) => (
            <div key={table.component} className="mt-4">
              {doc.props.length > 1 && (
                <p className={cn(mono, "text-foreground/40 mb-2")}>
                  {table.component}
                </p>
              )}
              <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] overflow-hidden rounded-2xl">
                <div
                  className={cn(
                    mono,
                    "text-foreground/35 hidden items-baseline gap-4 px-5 pt-3.5 pb-2 md:flex",
                  )}
                >
                  <span className="w-36 shrink-0">Prop</span>
                  <span className="w-40 shrink-0">Type</span>
                  <span className="hidden w-20 shrink-0 md:block">Default</span>
                  <span className="flex-1">Description</span>
                </div>
                <div className="bg-foreground/[0.06] mx-5 hidden h-px md:block" />
                {table.rows.map((row) => (
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
                    <span className="text-foreground/45 shrink-0 font-mono text-[12px] break-words md:w-40">
                      {row.type}
                    </span>
                    <span className="text-foreground/35 hidden w-20 shrink-0 font-mono text-[12px] md:block">
                      {row.defaultValue ?? "–"}
                    </span>
                    <span className="text-foreground/55 flex-1 leading-relaxed">
                      {row.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Keyed off the element's own import, so the note cannot outlive it. */}
          {source && /from ["']\.\/range["']/.test(source) && (
            <p className="text-foreground/40 mt-3 text-[13px] leading-relaxed">
              This element normalizes its counts and shares at the boundary, so
              a value from outside its range reads as the nearest end rather
              than reaching the DOM: a negative count shows nothing, one past
              the end shows everything, and a share stays within 0 to 100
              percent. A prop that names a selection is the exception, and means
              nothing is selected.
            </p>
          )}
        </section>
      )}

      {element.file && source && highlightedSource && (
        <section className="mt-12">
          <SectionHeading
            title="Source"
            meta={element.file}
            copyText={source}
          />
          <CodeSurface html={highlightedSource} />
        </section>
      )}

      <nav className="border-foreground/10 mt-16 flex items-center justify-between gap-4 border-t border-dashed pt-6">
        {previous ? (
          <Link
            href={`/elements/${previous.slug}`}
            scroll={false}
            className="group text-foreground/45 hover:text-foreground/90 flex items-center gap-2 text-[13px] transition-colors"
          >
            <ArrowLeftIcon className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span className={cn(mono, "text-foreground/30 tabular-nums")}>
              {String(previous.index).padStart(2, "0")}
            </span>
            {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/elements/${next.slug}`}
            scroll={false}
            className="group text-foreground/45 hover:text-foreground/90 flex items-center gap-2 text-[13px] transition-colors"
          >
            <span className={cn(mono, "text-foreground/30 tabular-nums")}>
              {String(next.index).padStart(2, "0")}
            </span>
            {next.title}
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
