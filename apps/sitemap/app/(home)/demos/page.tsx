import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import type { ReactNode } from "react";
import { DemoTabs } from "@/components/pages/demos/demo-tabs";
import { ChatPreview } from "@/components/pages/demos/previews/chat";
import { ToolUIPreview } from "@/components/pages/demos/previews/tool-ui";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { highlightElementSource } from "@/lib/element-source";
import {
  SCRIPTED_DEMOS,
  type DemoElement,
  type ScriptedDemoFile,
} from "@/lib/scripted-demos";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Demos",
  description:
    "One assistant-ui feature per demo, with the page, the UI, and the route you write for it.",
};

const PREVIEWS: Partial<Record<string, ReactNode>> = {
  chat: <ChatPreview />,
  "tool-ui": <ToolUIPreview />,
};

/** The file the preview runs, so the tab and the preview cannot drift apart. */
async function readSource(file: string) {
  "use cache";
  cacheLife("minutes");
  const source = await readFile(
    path.join(/* turbopackIgnore: true */ process.cwd(), file),
    "utf8",
  );
  return source.trimEnd();
}

/** The Elements a demo uses, each linking to its page in the catalog. */
function DemoElements({
  title,
  elements,
  planned,
}: {
  title: string;
  elements: readonly DemoElement[];
  planned: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        planned &&
          "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document p-5",
      )}
    >
      <h3 className="text-muted-foreground text-[13px] font-normal">
        {planned ? `One scripted chat with every ${title} element` : "Elements"}
      </h3>
      <ul className="flex flex-wrap gap-1.5">
        {elements.map((element) => (
          <li key={element.slug}>
            <Link
              href={`/elements/${element.slug}`}
              className="bg-background border-foreground/10 hover:border-foreground/25 inline-flex rounded-sm border px-2 py-1 text-xs transition-colors"
            >
              {element.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function codeOf(file: ScriptedDemoFile) {
  return "code" in file ? file.code : readSource(file.source);
}

export default async function DemosPage() {
  const demos = await Promise.all(
    SCRIPTED_DEMOS.map(async (demo) => ({
      ...demo,
      files: await Promise.all(
        demo.files.map(async (file) => ({
          path: file.path,
          html: await highlightElementSource(await codeOf(file)),
        })),
      ),
    })),
  );

  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>Demos by feature.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Each demo shows one feature, or one group of Elements, with the files
          you write for it and AI SDK on the server. The previews run on a
          script, so no model is called.
        </p>
      </header>
      <nav aria-label="Demos on this page" className="mt-8">
        <ol className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {demos.map((demo, index) => (
            <li key={demo.id}>
              <a
                href={`#${demo.id}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="me-1.5 font-mono text-[11px] tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {demo.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="mt-10">
        {demos.map((demo, index) => (
          <section
            key={demo.id}
            id={demo.id}
            aria-labelledby={`${demo.id}-heading`}
            className="border-foreground/10 grid scroll-mt-24 gap-6 border-t py-10 md:py-12 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-10"
          >
            <div className="flex flex-col gap-3">
              <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 id={`${demo.id}-heading`} className="text-lg font-medium">
                {demo.title}
              </h2>
              <p className="text-muted-foreground text-[15px] leading-relaxed">
                {demo.description}
              </p>
              {demo.hooks.length > 0 ? (
                <ul aria-label="Uses" className="flex flex-wrap gap-1.5 pt-1">
                  {demo.hooks.map((hook) => (
                    <li
                      key={hook}
                      className="bg-foreground/[0.04] rounded-sm px-1.5 py-0.5 font-mono text-xs [font-variant-ligatures:none]"
                    >
                      {hook}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-muted-foreground text-[13px]">
                {[
                  demo.files.length > 0
                    ? `${demo.files.length} files`
                    : "Not built yet",
                  demo.elements ? `${demo.elements.length} elements` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-6">
              {demo.files.length > 0 ? (
                <DemoTabs
                  label={demo.title}
                  files={demo.files}
                  preview={PREVIEWS[demo.id]}
                />
              ) : null}
              {demo.elements ? (
                <DemoElements
                  title={demo.title}
                  elements={demo.elements}
                  planned={demo.files.length === 0}
                />
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </PageFrame>
  );
}
