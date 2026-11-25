import { cacheLife } from "next/cache";
import { Architecture } from "@/components/pages/home/architecture";
import { HomeDemo } from "@/components/pages/home/demo";
import { Hero, HomeStats } from "@/components/pages/home/hero";
import { LibraryBody } from "@/components/pages/home/library-body";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeSection } from "@/components/shared/type";
import { getRepo } from "@/lib/github";
import { highlightElementSource } from "@/lib/element-source";
import { getWeeklyDownloads } from "@/lib/npm";

function markChangedLines(html: string, lines: readonly number[]): string {
  let lineNumber = 0;
  return html.replaceAll('<span class="line">', () => {
    lineNumber += 1;
    return lines.includes(lineNumber)
      ? '<span class="line line-hot">'
      : '<span class="line">';
  });
}

async function getHomeStats() {
  "use cache";
  cacheLife("hours");
  return Promise.all([getRepo(), getWeeklyDownloads()]);
}

const SETUP_SNIPPETS = [
  {
    id: "ai-sdk",
    label: "AI SDK",
    docs: "/docs/runtimes/ai-sdk/overview",
    changed: [2, 6, 7, 8],
    caption: "Your route runs the model. The transport streams it back.",
    code: `import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

export default function App() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}`,
  },
  {
    id: "langgraph",
    label: "LangGraph",
    docs: "/docs/runtimes/langgraph/overview",
    changed: [2, 6, 7, 8],
    caption: "Point stream at your graph. Threads and interrupts included.",
    code: `import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";
import { Thread } from "@/components/assistant-ui/thread";

export default function App() {
  const runtime = useLangGraphRuntime({
    stream: (messages, config) => streamMessage({ messages, config }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}`,
  },
  {
    id: "langchain",
    label: "LangChain",
    docs: "/docs/runtimes/langchain",
    changed: [2, 6, 7, 8],
    caption: "Connects to your deployed assistant by id.",
    code: `import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useStreamRuntime } from "@assistant-ui/react-langchain";
import { Thread } from "@/components/assistant-ui/thread";

export default function App() {
  const runtime = useStreamRuntime({
    assistantId: process.env["NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID"]!,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}`,
  },
  {
    id: "mastra",
    label: "Mastra",
    docs: "/docs/integrations/frameworks/mastra/separate-server",
    changed: [2, 6, 7, 8],
    caption: "Set NEXT_PUBLIC_MASTRA_URL to your Mastra server's chat route.",
    code: `import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

export default function App() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: process.env.NEXT_PUBLIC_MASTRA_URL! }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}`,
  },
  {
    id: "custom",
    label: "Custom",
    docs: "/docs/runtimes/custom/overview",
    changed: [2, 6, 7, 8],
    caption: "No adapter at all. Your store, your transport, any backend.",
    code: `import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useExternalStoreRuntime } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

export default function App() {
  const runtime = useExternalStoreRuntime({
    messages, convertMessage, onNew,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}`,
  },
] as const;

export default async function HomePage() {
  const [[repo, downloads], setupHtml] = await Promise.all([
    getHomeStats(),
    Promise.all(
      SETUP_SNIPPETS.map((snippet) =>
        highlightElementSource(snippet.code, "tsx"),
      ),
    ),
  ]);

  const setupTabs = SETUP_SNIPPETS.map((snippet, index) => ({
    id: snippet.id,
    label: snippet.label,
    caption: snippet.caption,
    docs: snippet.docs,
    html: markChangedLines(setupHtml[index]!, snippet.changed),
  }));

  return (
    <PageFrame
      pad="heroBody"
      className="relative z-2 flex flex-col pt-0 md:pt-0"
    >
      <div className="flex flex-col gap-10 md:gap-16">
        {/* The hero fills the first screen under the 3rem header, centered, so the demo starts below the fold. */}
        <div className="flex min-h-[calc(100svh-3rem)] flex-col justify-center">
          <Hero />
        </div>
        <HomeDemo />
      </div>
      <section
        aria-labelledby="architecture-heading"
        className="mt-16 flex flex-col gap-8 md:mt-20"
      >
        <div className="flex max-w-[40rem] flex-col gap-3">
          <h2 id="architecture-heading" className={typeSection}>
            How it fits together.
          </h2>
          <p className={typeDeck}>
            Five layers, from what people see to where the conversation is kept.
            Open one to see what it holds.
          </p>
        </div>
        <Architecture />
      </section>
      <LibraryBody setupTabs={setupTabs} />
      {/* Parked here, out of the hero, until it has a place; see the To do list in CHANGES.md. */}
      <section aria-label="Project stats" className="pt-10">
        <HomeStats stars={repo?.stars ?? null} downloads={downloads} />
      </section>
    </PageFrame>
  );
}
