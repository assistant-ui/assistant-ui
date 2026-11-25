import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { ArrowRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ChatGPT } from "@/components/demos/chatgpt";
import { Claude } from "@/components/demos/claude";
import { ScriptedClone } from "@/components/demos/clone.preview";
import { GeminiPreview } from "@/components/demos/gemini/gemini.preview";
import { Grok } from "@/components/demos/grok";
import { Perplexity } from "@/components/demos/perplexity";
import { StreamingTextPreview } from "@/components/demos/streaming-text.preview";
import { ThreadPreview } from "@/components/demos/thread.preview";
import { DemoWindow } from "@/components/pages/demos/demo-window";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { highlightElementSource } from "@/lib/element-source";
import {
  CLONE_DEMOS,
  SCRIPTED_DEMOS,
  type ScriptedDemo,
} from "@/lib/scripted-demos";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Demos",
  description:
    "What the assistant-ui runtime handles, one file per feature, and familiar chat apps rebuilt on it, each with a scripted preview.",
};

/** Where the docs show the same Thread on `useChatRuntime` and an AI SDK route. */
const AI_SDK_SETUP = {
  href: "/docs/runtimes/ai-sdk/overview",
  label: "Set it up with a model",
};

const PREVIEWS: Partial<Record<string, ReactNode>> = {
  thread: <ThreadPreview />,
  streaming: <StreamingTextPreview />,
  chatgpt: (
    <ScriptedClone name="ChatGPT">
      <ChatGPT />
    </ScriptedClone>
  ),
  claude: (
    <ScriptedClone name="Claude">
      <Claude />
    </ScriptedClone>
  ),
  grok: (
    <ScriptedClone name="Grok">
      <Grok />
    </ScriptedClone>
  ),
  gemini: <GeminiPreview />,
  perplexity: (
    <ScriptedClone name="Perplexity">
      <Perplexity />
    </ScriptedClone>
  ),
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

type LoadedDemo = ScriptedDemo & { html: string | null };

async function load(demos: readonly ScriptedDemo[]): Promise<LoadedDemo[]> {
  return Promise.all(
    demos.map(async (demo) => ({
      ...demo,
      html: demo.file
        ? await highlightElementSource(await readSource(demo.file.source))
        : null,
    })),
  );
}

const number = (index: number) => String(index + 1).padStart(2, "0");

function DemoRow({ demo, index }: { demo: LoadedDemo; index: number }) {
  const link = demo.link ?? AI_SDK_SETUP;

  return (
    <section
      id={demo.id}
      aria-labelledby={`${demo.id}-heading`}
      className="border-foreground/10 grid scroll-mt-24 gap-6 border-t py-10 md:py-12 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-10"
    >
      <div className="flex flex-col gap-3">
        <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
          {number(index)}
        </span>
        <h3 id={`${demo.id}-heading`} className="text-lg font-medium">
          {demo.title}
        </h3>
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
        {demo.file ? (
          <Link
            href={link.href}
            className="group/link text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-[13px] transition-colors"
          >
            {link.label}
            <ArrowRightIcon
              aria-hidden
              className="size-3.5 transition-transform group-hover/link:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        ) : (
          <p className="text-muted-foreground text-[13px]">Not built yet</p>
        )}
      </div>
      {demo.file && demo.html ? (
        <DemoWindow
          name={demo.file.name}
          html={demo.html}
          preview={PREVIEWS[demo.id]}
          parts={demo.parts ?? false}
        />
      ) : null}
    </section>
  );
}

export default async function DemosPage() {
  const [demos, clones] = await Promise.all([
    load(SCRIPTED_DEMOS),
    load(CLONE_DEMOS),
  ]);

  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>Demos by feature.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          The Thread, then what the runtime handles, one file each: the runtime
          and the whole chat UI, ready to copy. The preview runs that UI with
          the replies from a script, so no model is called.
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
                  {number(index)}
                </span>
                {demo.title}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#clones"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Clones
            </a>
          </li>
        </ol>
      </nav>
      <div className="mt-10">
        {demos.map((demo, index) => (
          <DemoRow key={demo.id} demo={demo} index={index} />
        ))}
      </div>
      <section
        id="clones"
        aria-labelledby="clones-heading"
        className="border-foreground/10 mt-10 scroll-mt-24 border-t pt-16 md:pt-20"
      >
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 id="clones-heading" className={typeSection}>
            Clones.
          </h2>
          <p className={cn(typeDeck, "max-w-[52ch]")}>
            Familiar chat apps rebuilt on assistant-ui, each in one file with
            its own sidebar. Here they answer from a script too.
          </p>
        </div>
        <div className="mt-10">
          {clones.map((demo, index) => (
            <DemoRow key={demo.id} demo={demo} index={index} />
          ))}
        </div>
      </section>
    </PageFrame>
  );
}
