import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/ui/code-block";
import { createOgMetadata } from "@/lib/og";
import {
  highlightElementSource,
  readElementSource,
} from "@/lib/element-source";
import { demoCanvasClass } from "@/components/demo/utils/canvas";
import { DemoStage } from "@/components/demo/elements/demo-stage";
import { DemoVariants } from "@/components/pages/elements/demo-variants";
import {
  PackageManagerTabs,
  ShadcnInstallTabs,
} from "@/components/pages/docs/fumadocs/install/package-manager-tabs";
import { ParametersTable } from "@/components/pages/docs/parameters-table";
import { ELEMENT_DOCS } from "@/components/pages/elements/element-docs";
import { ElementPager } from "@/components/pages/elements/element-pager";
import { ELEMENTS, getElement } from "@/components/pages/elements/registry";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { getGenerativeElement } from "@/lib/generative-elements";
import { elementsDocs } from "@/lib/source";
import {
  ElementModeProvider,
  ElementModeToggle,
  RuntimeMode,
  StandaloneMode,
} from "@/components/pages/elements/element-mode";
import { RuntimeSetup } from "@/components/pages/elements/runtime-setup";
import { getMDXComponents } from "@/mdx-components";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";

function tocTitle(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(tocTitle).join("");
  if (typeof node === "object" && "props" in node) {
    return tocTitle(
      (node as { props?: { children?: unknown } }).props?.children,
    );
  }
  return "";
}

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

function Figure({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="mt-10">
      {children}
      <figcaption className="text-muted-foreground mt-2.5 font-mono text-[11px]">
        {caption}
      </figcaption>
    </figure>
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
  const registryName =
    element.registryName ?? `elements-${element.installName ?? element.slug}`;
  const source = element.file ? await readElementSource(element.file) : null;
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

  const mdxPage = elementsDocs.getPage([slug]);
  const mdxData = mdxPage ? await mdxPage.data.load() : undefined;
  const MdxBody = mdxData?.body;
  const mdxHasApi = Boolean(
    mdxData?.toc.some(
      (item) =>
        /^#(api-reference|props)$/.test(String(item.url)) ||
        /api reference|^props$/i.test(tocTitle(item.title)),
    ),
  );

  const counterpart = element.counterpart
    ? getElement(element.counterpart)
    : undefined;

  const hasModes =
    !element.generative && Boolean(mdxPage || element.standaloneItem);
  const runtimeComposedOnly =
    element.connection === "AUI" && !element.standaloneItem;
  const standaloneRegistryName = element.standaloneItem ?? registryName;

  const toc: { title: string; url: string }[] = [
    { title: "Installation", url: "#installation" },
    ...(mdxData?.toc ?? [])
      .filter((item) => item.depth <= 2)
      .map((item) => ({ title: tocTitle(item.title), url: item.url })),
    ...(generativeEntry
      ? [
          { title: "Usage", url: "#usage" },
          { title: "Spec", url: "#spec" },
        ]
      : []),
    ...(doc && !mdxPage ? [{ title: "Usage", url: "#usage" }] : []),
    ...(doc && doc.props.length > 0 && !mdxHasApi
      ? [{ title: "Props", url: "#props" }]
      : []),
  ];

  const previous = ELEMENTS[element.index - 2];
  const next = ELEMENTS[element.index];
  const replayable = element.replay !== false;

  const showToc = toc.length >= 3;

  return (
    <ElementModeProvider className="[&_article_h2]:scroll-mt-24 [&_article_h3]:scroll-mt-24 [&_section]:scroll-mt-24">
      <div
        className={cn(
          showToc && "xl:grid xl:grid-cols-[minmax(0,1fr)_10rem] xl:gap-12",
        )}
      >
        <div className="min-w-0">
          <header className="mt-8 lg:mt-0">
            <div className="flex items-center justify-between gap-4">
              <p className={typeEyebrow}>
                <Link
                  href="/elements"
                  className="hover:text-foreground transition-colors"
                >
                  Elements
                </Link>
                {` · ${element.section}`}
                {element.connection ? ` · ${element.connection}` : ""}
              </p>
              <ElementPager slug={element.slug} />
            </div>
            <h1 className={cn("mt-4", typePage)}>{element.title}</h1>
            <p className={cn("mt-4", typeDeck)}>{element.description}</p>
            {counterpart && (
              <p className="text-muted-foreground mt-4 text-sm">
                {counterpart.connection
                  ? "Runtime-wired version: "
                  : "Runtime-free version: "}
                <Link
                  href={`/elements/${counterpart.slug}`}
                  className="text-foreground underline underline-offset-4 transition-colors hover:no-underline"
                >
                  {counterpart.title}
                </Link>
              </p>
            )}
            {hasModes && <ElementModeToggle className="mt-6" />}
          </header>

          <Figure
            caption={
              replayable
                ? "fig. 01 · plays once, replay from the corner"
                : "fig. 01"
            }
          >
            {element.variants ? (
              <DemoVariants variants={element.variants} replay={replayable} />
            ) : (
              <div
                className={cn(
                  demoCanvasClass,
                  element.generative ? "min-h-[400px] py-10" : "h-[360px]",
                )}
              >
                <DemoStage replay={replayable}>
                  <element.Component />
                </DemoStage>
              </div>
            )}
          </Figure>

          <article className="prose mt-12 max-w-none">
            <section id="installation">
              <h2>Installation</h2>
              <div className="mt-4">
                {element.generative ? (
                  <PackageManagerTabs
                    packages={["@assistant-ui/react-generative-ui"]}
                  />
                ) : hasModes ? (
                  <>
                    <RuntimeMode>
                      <ShadcnInstallTabs
                        urls={[`"@assistant-ui/${registryName}"`]}
                      />
                      <RuntimeSetup />
                    </RuntimeMode>
                    <StandaloneMode>
                      {runtimeComposedOnly ? (
                        <p className="text-muted-foreground text-sm">
                          This component is composed from runtime primitives and
                          has no standalone build.
                          {counterpart && (
                            <>
                              {" "}
                              The runtime-free design ships as{" "}
                              <Link
                                href={`/elements/${counterpart.slug}`}
                                className="text-foreground underline underline-offset-4 transition-colors hover:no-underline"
                              >
                                {counterpart.title}
                              </Link>
                              .
                            </>
                          )}
                        </p>
                      ) : (
                        <>
                          <ShadcnInstallTabs
                            urls={[`"@assistant-ui/${standaloneRegistryName}"`]}
                          />
                          <p className="text-muted-foreground mt-4 text-sm">
                            Props-driven: no runtime or provider required.
                          </p>
                        </>
                      )}
                    </StandaloneMode>
                  </>
                ) : (
                  <ShadcnInstallTabs
                    urls={[`"@assistant-ui/${registryName}"`]}
                  />
                )}
              </div>
            </section>

            {MdxBody && (
              <SampleRuntimeProvider>
                <MdxBody
                  components={getMDXComponents({
                    RuntimeMode,
                    StandaloneMode,
                    RuntimeSetup,
                  })}
                />
              </SampleRuntimeProvider>
            )}

            {highlightedGenerativeUsage && (
              <section id="usage">
                <h2>Usage</h2>
                <CodeBlock className="mt-4" copyText={GENERATIVE_USAGE}>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: highlightedGenerativeUsage,
                    }}
                  />
                </CodeBlock>
              </section>
            )}

            {generativeEntry && highlightedSpec && specJson && (
              <section id="spec">
                <h2>Spec</h2>
                <CodeBlock
                  className="mt-4"
                  title={generativeEntry.template.category}
                  copyText={specJson}
                >
                  <div dangerouslySetInnerHTML={{ __html: highlightedSpec }} />
                </CodeBlock>
                <p className="mt-4 text-[13px]">
                  <Link
                    href="/elements/vocabulary"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Component vocabulary →
                  </Link>
                </p>
              </section>
            )}

            {doc && highlightedUsage && !mdxPage && (
              <section id="usage">
                <h2>Usage</h2>
                <CodeBlock className="mt-4" copyText={doc.usage}>
                  <div dangerouslySetInnerHTML={{ __html: highlightedUsage }} />
                </CodeBlock>
              </section>
            )}

            {doc && doc.props.length > 0 && !mdxHasApi && (
              <section id="props">
                <h2>Props</h2>
                {doc.props.map((table) => (
                  <ParametersTable
                    key={table.component}
                    {...(doc.props.length > 1 ? { type: table.component } : {})}
                    parameters={table.rows.map((row) => ({
                      name: row.name,
                      type: row.type,
                      description: row.description,
                      ...(row.required ? { required: true } : {}),
                      ...(row.defaultValue
                        ? { default: row.defaultValue }
                        : {}),
                    }))}
                  />
                ))}
                {/* Keyed off the element's own import, so the note cannot outlive it. */}
                {source &&
                  /from ["']\.\.?\/(?:utils\/)?range["']/.test(source) && (
                    <p className="text-muted-foreground mt-3 text-[13px] leading-relaxed">
                      This element normalizes its counts and shares at the
                      boundary, so a value from outside its range reads as the
                      nearest end rather than reaching the DOM: a negative count
                      shows nothing, one past the end shows everything, and a
                      share stays within 0 to 100 percent. A prop that names a
                      selection is the exception, and means nothing is selected.
                    </p>
                  )}
              </section>
            )}
          </article>

          <nav className="border-foreground/10 mt-16 flex items-center justify-between gap-4 border-t pt-6">
            {previous ? (
              <Link
                href={`/elements/${previous.slug}`}
                scroll={false}
                className="group text-muted-foreground hover:text-foreground flex items-center gap-2 text-[13px] transition-colors"
              >
                <ArrowLeftIcon className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span className="font-mono text-[11px] tabular-nums">
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
                className="group text-muted-foreground hover:text-foreground flex items-center gap-2 text-[13px] transition-colors"
              >
                <span className="font-mono text-[11px] tabular-nums">
                  {String(next.index).padStart(2, "0")}
                </span>
                {next.title}
                <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>
        {showToc && (
          <nav aria-label="On this page" className="hidden xl:block">
            <div className="bg-background fixed top-12 bottom-0 flex w-40 [scrollbar-width:none] flex-col gap-2 overflow-y-auto pt-20 pb-8 font-mono text-[11px] [&::-webkit-scrollbar]:hidden">
              <span className="text-foreground/40 tracking-wide uppercase">
                On this page
              </span>
              {toc.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  className="text-muted-foreground hover:text-foreground truncate transition-colors"
                >
                  {item.title}
                </a>
              ))}
            </div>
          </nav>
        )}
      </div>
    </ElementModeProvider>
  );
}
