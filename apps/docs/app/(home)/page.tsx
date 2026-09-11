import { promises as fs } from "node:fs";
import path from "node:path";
import { HomeDemo } from "@/components/pages/home/demo";
import { Hero } from "@/components/pages/home/hero";
import { LibraryBody } from "@/components/pages/home/library-body";
import { PageFrame } from "@/components/shared/page-frame";
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

async function getReactVersion(): Promise<string | null> {
  try {
    const raw = await fs.readFile(
      path.join(
        process.cwd(),
        "node_modules",
        "@assistant-ui",
        "react",
        "package.json",
      ),
      "utf8",
    );
    const version = (JSON.parse(raw) as { version?: unknown }).version;
    return typeof version === "string" ? version : null;
  } catch {
    return null;
  }
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
    docs: "/docs/integrations/frameworks/mastra/overview",
    changed: [2, 6, 7, 8],
    caption: "The same AI SDK client. Your route calls the Mastra agent.",
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
  const [[repo, downloads, reactVersion], setupHtml] = await Promise.all([
    Promise.all([getRepo(), getWeeklyDownloads(), getReactVersion()]),
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
    <PageFrame pad="heroBody" className="relative z-2 flex flex-col">
      <div className="flex flex-col gap-10 md:gap-16">
        <Hero stars={repo?.stars ?? null} downloads={downloads} />
        <HomeDemo />
      </div>
      <LibraryBody setupTabs={setupTabs} reactVersion={reactVersion} />
    </PageFrame>
  );
}
