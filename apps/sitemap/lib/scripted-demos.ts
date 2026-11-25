export type ScriptedDemoFile = {
  path: string;
  code: string;
};

export type ScriptedDemo = {
  id: string;
  title: string;
  description: string;
  hooks: readonly string[];
  files: readonly ScriptedDemoFile[];
};

const CHAT_PAGE = `"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

export default function Page() {
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}`;

const CHAT_ROUTE = `import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}`;

const TOOLKIT_PAGE = `"use client";

import { AssistantRuntimeProvider, AuiConfig, Tools } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { toolkit } from "./toolkit";

export default function Page() {
  const runtime = useChatRuntime();
  const config = AuiConfig({ tools: Tools({ toolkit }) });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}`;

const WEATHER_TOOLKIT = `import {
  defineToolkit,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";

type WeatherArgs = { city: string };
type WeatherResult = { temperature: number; condition: string };

const WeatherCard: ToolCallMessagePartComponent<WeatherArgs, WeatherResult> = ({
  args,
  result,
  status,
}) => {
  if (status.type === "running") {
    return <p>Checking the weather in {args.city}…</p>;
  }
  if (!result) return <p>No weather for {args.city}.</p>;

  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{args.city}</p>
      <p className="text-2xl font-medium">{result.temperature}°C</p>
      <p className="text-sm">{result.condition}</p>
    </div>
  );
};

export const toolkit = defineToolkit({
  getWeather: {
    type: "backend",
    display: "standalone",
    render: WeatherCard,
  },
});`;

const WEATHER_ROUTE = `import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  tool,
  zodSchema,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { fetchWeather } from "@/lib/weather";

export const maxDuration = 30;

const tools = {
  getWeather: tool({
    description: "Get the current weather in a city",
    inputSchema: zodSchema(z.object({ city: z.string() })),
    execute: async ({ city }) => {
      const weather = await fetchWeather(city);
      return { temperature: weather.temperature, condition: weather.condition };
    },
  }),
};

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages, { tools }),
    tools,
  });

  return result.toUIMessageStreamResponse();
}`;

const APPROVAL_PAGE = `"use client";

import { AssistantRuntimeProvider, AuiConfig, Tools } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { Thread } from "@/components/assistant-ui/thread";
import { toolkit } from "./toolkit";

export default function Page() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const config = AuiConfig({ tools: Tools({ toolkit }) });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}`;

const APPROVAL_TOOLKIT = `import { defineToolkit, type ToolApprovalResponse } from "@assistant-ui/react";

export const toolkit = defineToolkit({
  deploy: {
    type: "backend",
    render: ({ args, approval, respondToApproval, result }) => {
      const answer = async (response: ToolApprovalResponse) => {
        try {
          await respondToApproval(response);
        } catch (failure) {
          console.error(failure);
        }
      };

      if (approval?.approved === undefined) {
        return (
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <p>Deploy to {args.target}?</p>
            <button onClick={() => void answer({ approved: true })}>
              Approve
            </button>
            <button
              onClick={() => void answer({ approved: false, reason: "Denied" })}
            >
              Deny
            </button>
          </div>
        );
      }
      if (approval.approved === false) return <p>Deploy denied.</p>;
      if (result === undefined) return <p>Deploying…</p>;
      return <p>Deployed to {result.deployed}.</p>;
    },
  },
});`;

const APPROVAL_ROUTE = `import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  tool,
  zodSchema,
  type UIMessage,
} from "ai";
import { z } from "zod";

export const maxDuration = 30;

const tools = {
  deploy: tool({
    description: "Deploy the current build to an environment",
    inputSchema: zodSchema(z.object({ target: z.string() })),
    execute: async ({ target }) => ({ deployed: target }),
  }),
};

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    toolApproval: { deploy: "user-approval" },
  });

  return result.toUIMessageStreamResponse();
}`;

const REASONING_ROUTE = `import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages),
    providerOptions: { openai: { reasoningSummary: "auto" } },
  });

  return result.toUIMessageStreamResponse({ sendReasoning: true });
}`;

const ATTACHMENTS_PAGE = `"use client";

import {
  AssistantRuntimeProvider,
  SimpleImageAttachmentAdapter,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

const attachments = new SimpleImageAttachmentAdapter();

export default function Page() {
  const runtime = useChatRuntime({ adapters: { attachments } });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}`;

const STATE_PAGE = `"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { Header } from "@/components/header";

export default function Page() {
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Header />
      <Thread />
    </AssistantRuntimeProvider>
  );
}`;

const STATE_HEADER = `"use client";

import { useAui, useAuiState } from "@assistant-ui/react";

export function Header() {
  const aui = useAui();
  const isRunning = useAuiState((s) => s.thread.isRunning);

  return (
    <header className="flex items-center gap-3 border-b p-3">
      <span className="font-medium">Assistant</span>
      {isRunning ? (
        <span className="text-muted-foreground text-sm">Generating…</span>
      ) : null}
      <div className="ms-auto flex gap-2">
        {isRunning ? (
          <button onClick={() => aui.thread.cancelRun()}>Stop</button>
        ) : (
          <button onClick={() => aui.thread.append("Summarize this chat")}>
            Summarize
          </button>
        )}
      </div>
    </header>
  );
}`;

/**
 * Each demo is one feature and the files you write for it, as the docs
 * write them for AI SDK. `app/page.tsx` is always there; the route appears
 * when the server changes, and a toolkit file when there is a tool.
 */
export const SCRIPTED_DEMOS: readonly ScriptedDemo[] = [
  {
    id: "chat",
    title: "Chat",
    description:
      "A streaming chat: the runtime hook on the page, and a route that streams the model's reply.",
    hooks: ["useChatRuntime", "<Thread />", "streamText"],
    files: [
      { path: "app/page.tsx", code: CHAT_PAGE },
      { path: "app/api/chat/route.ts", code: CHAT_ROUTE },
    ],
  },
  {
    id: "tool-ui",
    title: "Tool UI",
    description:
      "The route defines a weather tool; a toolkit entry draws its result as a card in the thread.",
    hooks: ["defineToolkit", "Tools", "tool"],
    files: [
      { path: "app/page.tsx", code: TOOLKIT_PAGE },
      { path: "app/toolkit.tsx", code: WEATHER_TOOLKIT },
      { path: "app/api/chat/route.ts", code: WEATHER_ROUTE },
    ],
  },
  {
    id: "approval",
    title: "Approval",
    description:
      "The route pauses a deploy tool until the user approves it; the card answers with respondToApproval.",
    hooks: ["respondToApproval", "toolApproval", "sendAutomaticallyWhen"],
    files: [
      { path: "app/page.tsx", code: APPROVAL_PAGE },
      { path: "app/toolkit.tsx", code: APPROVAL_TOOLKIT },
      { path: "app/api/chat/route.ts", code: APPROVAL_ROUTE },
    ],
  },
  {
    id: "reasoning",
    title: "Reasoning",
    description:
      "The route sends the model's reasoning, and the Thread shows it in a section that opens and closes. The page is the same as Chat.",
    hooks: ["sendReasoning", "<Thread />"],
    files: [
      { path: "app/page.tsx", code: CHAT_PAGE },
      { path: "app/api/chat/route.ts", code: REASONING_ROUTE },
    ],
  },
  {
    id: "attachments",
    title: "Attachments",
    description:
      "An image adapter lets the composer take pictures. The route is the same as Chat; the model has to accept images.",
    hooks: ["SimpleImageAttachmentAdapter", "useChatRuntime"],
    files: [
      { path: "app/page.tsx", code: ATTACHMENTS_PAGE },
      { path: "app/api/chat/route.ts", code: CHAT_ROUTE },
    ],
  },
  {
    id: "state",
    title: "State and actions",
    description:
      "A header outside the thread reads whether a reply is running and sends or stops a message. The route is the same as Chat.",
    hooks: ["useAuiState", "useAui"],
    files: [
      { path: "app/page.tsx", code: STATE_PAGE },
      { path: "components/header.tsx", code: STATE_HEADER },
    ],
  },
];
