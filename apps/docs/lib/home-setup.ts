export const HOME_TITLE = "assistant-ui · The frontend library for AI agents";
export const HOME_DESCRIPTION =
  "Open-source React components and runtimes for building AI chat. Streaming, tools, and persistence in TypeScript.";
export const HOME_LIBRARY = {
  title: "@assistant-ui/react",
  description: "The runtime owns the thread, the stream, and the tools.",
};

export const SETUP_SNIPPETS = [
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
