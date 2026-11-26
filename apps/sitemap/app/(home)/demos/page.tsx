import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import type { ReactNode } from "react";
import { ChatGPT } from "@/components/demos/chatgpt";
import { Claude } from "@/components/demos/claude";
import { ScriptedClone } from "@/components/demos/clone.preview";
import { GeminiPreview } from "@/components/demos/gemini/gemini.preview";
import { Grok } from "@/components/demos/grok";
import { Perplexity } from "@/components/demos/perplexity";
import { StreamingTextPreview } from "@/components/demos/streaming-text.preview";
import { ThreadPreview } from "@/components/demos/thread.preview";
import {
  CatalogBrowser,
  type CatalogDemo,
} from "@/components/pages/demos/catalog";
import { LiveFrame } from "@/components/pages/platforms/live-frame";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
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

const DOCS_ORIGIN =
  process.env["NEXT_PUBLIC_DOCS_ORIGIN"] ?? "http://localhost:3000";
const EXPO_DEMO = "https://assistant-ui-expo.vercel.app/";
const INK_DEMO =
  process.env["NEXT_PUBLIC_INK_DEMO_URL"] ??
  "https://assistant-ui-ink.vercel.app";

const FEATURE_TAGS: Record<string, readonly string[]> = {
  thread: ["Markdown", "Suggestions", "Tools"],
  streaming: ["Streaming", "Suggestions"],
};
const FEATURE_START: Record<string, string> = {
  thread: "npx shadcn@latest add @assistant-ui/thread",
  streaming: "npx shadcn@latest add @assistant-ui/elements-streaming-text",
};
const CLONE_TAGS = ["Thread list", "Attachments", "Editing"] as const;

const frame = (src: string, title: string) => (
  <LiveFrame
    src={src}
    title={title}
    className="size-full rounded-none border-0"
  />
);

/** The blocks the docs host, each running at its own page on the docs server. */
const BLOCK_DEMOS: readonly CatalogDemo[] = [
  {
    id: "document-editor",
    title: "Document editor",
    description:
      "A pages app with a floating assistant that edits the page you are on and waits for you to accept each change.",
    tags: ["Tools", "Approval"],
  },
  {
    id: "images",
    title: "Images",
    description:
      "An image maker that turns a template or a message into a picture you edit beside the chat.",
    tags: ["Tools", "Attachments"],
  },
  {
    id: "chat-basic",
    title: "Chat basic",
    description:
      "A whole chat written with every assistant-ui primitive, using only the shadcn/ui tooltip and resizable components.",
    tags: ["Thread list", "Branching"],
  },
].map((block) => ({
  ...block,
  kind: "Block" as const,
  preview: frame(`${DOCS_ORIGIN}/blocks/demos/${block.id}`, block.title),
  docs: { href: `/blocks/${block.id}`, label: "About the block" },
  full: `${DOCS_ORIGIN}/blocks/demos/${block.id}`,
}));

const PLATFORM_DEMOS: readonly CatalogDemo[] = [
  {
    id: "expo",
    title: "React Native",
    kind: "Platform",
    tags: ["Mobile"],
    description:
      "A real Expo build of the assistant-ui chat, running on the web.",
    preview: frame(EXPO_DEMO, "assistant-ui React Native demo"),
    start: "npx assistant-ui@latest create --native my-app",
    docs: { href: "/react-native", label: "About React Native" },
    full: EXPO_DEMO,
  },
  {
    id: "ink",
    title: "Terminal",
    kind: "Platform",
    tags: ["Terminal"],
    description: "A real Ink render loop of the assistant-ui chat, in ANSI.",
    preview: frame(INK_DEMO, "assistant-ui Ink demo"),
    start: "npx assistant-ui@latest create --ink my-app",
    docs: { href: "/ink", label: "About Ink" },
    full: INK_DEMO,
  },
];

function CatalogHeader() {
  return (
    <header className="mb-10 max-w-2xl md:mb-12">
      <h1 className={typePage}>Every demo, in one place.</h1>
      <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
        Feature demos, clones, blocks, and platforms that run on this site.
        Filter by kind or feature, try one, read its code, and start from it.
      </p>
    </header>
  );
}

export default async function DemosPage() {
  const [demos, clones] = await Promise.all([
    load(SCRIPTED_DEMOS),
    load(CLONE_DEMOS),
  ]);

  const catalog: CatalogDemo[] = [
    ...demos.flatMap((demo) =>
      demo.file && demo.html
        ? [
            {
              id: demo.id,
              title: demo.title,
              kind: "Feature" as const,
              tags: FEATURE_TAGS[demo.id] ?? [],
              description: demo.description,
              preview: PREVIEWS[demo.id],
              file: { name: demo.file.name, html: demo.html },
              ...(FEATURE_START[demo.id]
                ? { start: FEATURE_START[demo.id] }
                : {}),
              docs: demo.link ?? AI_SDK_SETUP,
            },
          ]
        : [],
    ),
    ...clones.flatMap((demo) =>
      demo.file && demo.html
        ? [
            {
              id: demo.id,
              title: demo.title,
              kind: "Clone" as const,
              tags: CLONE_TAGS,
              description: demo.description,
              preview: PREVIEWS[demo.id],
              file: { name: demo.file.name, html: demo.html },
              docs: AI_SDK_SETUP,
              full: `/examples/${demo.id}`,
            },
          ]
        : [],
    ),
    ...BLOCK_DEMOS,
    ...PLATFORM_DEMOS,
  ];

  return (
    <PageFrame pad="sub">
      <CatalogHeader />
      <CatalogBrowser demos={catalog} />
    </PageFrame>
  );
}
