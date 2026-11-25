import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DemoTabs } from "@/components/pages/demos/demo-tabs";
import { ChatPreview } from "@/components/pages/demos/previews/chat";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { highlightElementSource } from "@/lib/element-source";
import { SCRIPTED_DEMOS } from "@/lib/scripted-demos";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Demos",
  description:
    "One assistant-ui feature per demo, with the page and route you write for it.",
};

const PREVIEWS: Partial<Record<string, ReactNode>> = {
  chat: <ChatPreview />,
};

export default async function DemosPage() {
  const demos = await Promise.all(
    SCRIPTED_DEMOS.map(async (demo) => ({
      ...demo,
      files: await Promise.all(
        demo.files.map(async (file) => ({
          path: file.path,
          html: await highlightElementSource(file.code),
        })),
      ),
    })),
  );

  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>Demos by feature.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Each demo shows one feature and the files you write for it, with AI
          SDK on the server. The previews run on a script, so no model is
          called.
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
              <p className="text-muted-foreground text-[13px]">
                {demo.files.length} files
              </p>
            </div>
            <DemoTabs
              label={demo.title}
              files={demo.files}
              preview={PREVIEWS[demo.id]}
            />
          </section>
        ))}
      </div>
    </PageFrame>
  );
}
