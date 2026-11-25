/**
 * A file shown in a demo's tabs: written out in `code`, or read from `source`,
 * a path in this app, when the preview runs that same file.
 */
export type ScriptedDemoFile =
  | { path: string; code: string }
  | { path: string; source: string };

/** An element from the docs' Elements catalog, at `/elements/<slug>`. */
export type DemoElement = {
  slug: string;
  title: string;
};

/**
 * A demo with no `files` is planned: one scripted chat that will use every
 * element in `elements`, the groups of the docs' Elements catalog.
 */
export type ScriptedDemo = {
  id: string;
  title: string;
  description: string;
  hooks: readonly string[];
  files: readonly ScriptedDemoFile[];
  elements?: readonly DemoElement[];
};

const CHAT_PAGE = `"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { Thread } from "@/components/thread";

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
import { Thread } from "@/components/thread";
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
import { Thread } from "@/components/thread";
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
import { Thread } from "@/components/thread";

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
import { Thread } from "@/components/thread";
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
 * write them for AI SDK. `app/page.tsx` is always there; `components/thread.tsx`
 * is the UI, built from primitives; the route appears when the server
 * changes, and a toolkit file when there is a tool.
 */
export const SCRIPTED_DEMOS: readonly ScriptedDemo[] = [
  {
    id: "chat",
    title: "Chat",
    description:
      "A streaming chat: the runtime hook on the page, a Thread built from primitives, and a route that streams the model's reply.",
    hooks: [
      "useChatRuntime",
      "ThreadPrimitive",
      "MessagePrimitive",
      "ComposerPrimitive",
      "streamText",
    ],
    files: [
      { path: "app/page.tsx", code: CHAT_PAGE },
      {
        path: "components/thread.tsx",
        source: "components/pages/demos/ui/thread.tsx",
      },
      { path: "app/api/chat/route.ts", code: CHAT_ROUTE },
    ],
  },
  {
    id: "tool-ui",
    title: "Tool UI",
    description:
      "Ask about the weather in a city. The route's getWeather tool runs on the server, and a toolkit entry draws its result as a card. The Thread is the same as Chat's.",
    hooks: ["defineToolkit", "Tools", "tool"],
    files: [
      { path: "app/page.tsx", code: TOOLKIT_PAGE },
      {
        path: "app/toolkit.tsx",
        source: "components/pages/demos/ui/weather-toolkit.tsx",
      },
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
    elements: [
      { slug: "loading-state", title: "Loader" },
      { slug: "thinking-indicator", title: "Thinking indicator" },
      { slug: "streaming-text", title: "Streaming text" },
      { slug: "typing-indicator", title: "Typing indicator" },
      { slug: "reasoning-effort", title: "Reasoning effort" },
      { slug: "guardrail-notice", title: "Guardrail notice" },
    ],
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
  {
    id: "messages",
    title: "Messages",
    description: "The conversation surface itself.",
    hooks: [],
    files: [],
    elements: [
      { slug: "message-pair", title: "Message pair" },
      { slug: "message-branches", title: "Message branches" },
      { slug: "message-actions", title: "Message actions" },
      { slug: "error-state", title: "Error state" },
      { slug: "message-queue", title: "Message queue" },
      { slug: "edit-message", title: "Edit a sent message" },
      { slug: "feedback-dialog", title: "Feedback dialog" },
      { slug: "stopped-run", title: "Stopped run" },
      { slug: "day-separator", title: "Timestamps" },
      { slug: "speaker-identity", title: "Speaker identity" },
      { slug: "regenerate-menu", title: "Regenerate with" },
      { slug: "confidence-marker", title: "Confidence" },
    ],
  },
  {
    id: "tool-use",
    title: "Tool use",
    description: "Agent work, made legible.",
    hooks: [],
    files: [],
    elements: [
      { slug: "tool-call", title: "Tool call" },
      { slug: "run-activity", title: "Run activity" },
      { slug: "tool-timeline", title: "Tool timeline" },
      { slug: "terminal-block", title: "Terminal block" },
      { slug: "code-diff", title: "Code diff" },
      { slug: "reviewable-diff", title: "Reviewable diff" },
      { slug: "file-tree", title: "File tree" },
      { slug: "elicitation-form", title: "Elicitation form" },
      { slug: "mcp-server-panel", title: "Server panel" },
      { slug: "tool-error", title: "Tool failure" },
      { slug: "permission-grant", title: "Permission grant" },
      { slug: "computer-use", title: "Computer use" },
      { slug: "code-runner", title: "Code runner" },
    ],
  },
  {
    id: "knowledge",
    title: "Knowledge",
    description: "Where answers come from.",
    hooks: [],
    files: [],
    elements: [
      { slug: "web-search", title: "Web search" },
      { slug: "inline-citation", title: "Inline citation" },
      { slug: "link-preview", title: "Link preview" },
      { slug: "image-generation", title: "Image generation" },
      { slug: "image-gallery", title: "Image gallery" },
      { slug: "retrieval-chunks", title: "Retrieval chunks" },
      { slug: "document-reference", title: "Document reference" },
      { slug: "memory-chips", title: "Memory" },
      { slug: "research-report", title: "Research report" },
      { slug: "map-answer", title: "Map" },
      { slug: "geo-map", title: "Geo map" },
    ],
  },
  {
    id: "structured-output",
    title: "Structured output",
    description: "Answers with shape: tables, diffs, and counts.",
    hooks: [],
    files: [],
    elements: [
      { slug: "data-table", title: "Data table" },
      { slug: "number-ticker", title: "Number ticker" },
      { slug: "chart", title: "Chart" },
      { slug: "media-player", title: "Media player" },
      { slug: "web-preview", title: "Web preview" },
      { slug: "diagram", title: "Diagram" },
      { slug: "flow-graph", title: "Flow graph" },
      { slug: "activity-graph", title: "Activity graph" },
      { slug: "math-block", title: "Math" },
      { slug: "spec-sheet", title: "Spec sheet" },
      { slug: "comparison-card", title: "Comparison" },
      { slug: "timeline", title: "Timeline" },
      { slug: "job-progress", title: "Job progress" },
      { slug: "score-breakdown", title: "Score breakdown" },
    ],
  },
  {
    id: "agents",
    title: "Agents",
    description: "Long-running work you can supervise.",
    hooks: [],
    files: [],
    elements: [
      { slug: "agent-plan", title: "Agent plan" },
      { slug: "subagent-list", title: "Subagent list" },
      { slug: "task-card", title: "Task card" },
      { slug: "agent-status", title: "Agent status" },
      { slug: "approval-card", title: "Approval card" },
      { slug: "option-list", title: "Option list" },
      { slug: "question-flow", title: "Question flow" },
      { slug: "recommendation-card", title: "Recommendation card" },
      { slug: "artifact-card", title: "Artifact card" },
      { slug: "todo-list", title: "Todo list" },
      { slug: "agent-card", title: "Agent card" },
      { slug: "agent-handoff", title: "Handoff" },
      { slug: "background-inbox", title: "Background runs" },
      { slug: "checkpoint-history", title: "Checkpoints" },
      { slug: "schedule-card", title: "Schedule" },
    ],
  },
  {
    id: "observability",
    title: "Observability",
    description: "What the run actually cost you.",
    hooks: [],
    files: [],
    elements: [
      { slug: "trace-waterfall", title: "Trace waterfall" },
      { slug: "cost-meter", title: "Cost meter" },
      { slug: "quota-banner", title: "Quota banner" },
    ],
  },
  {
    id: "composer",
    title: "Composer",
    description: "One input, every capability built in.",
    hooks: [],
    files: [],
    elements: [
      { slug: "composer", title: "Composer" },
      { slug: "composer-slash-commands", title: "Slash commands" },
      { slug: "composer-mentions", title: "Mentions" },
      { slug: "composer-attachments", title: "Attachments" },
      { slug: "composer-model-picker", title: "Models" },
      { slug: "composer-voice", title: "Dictation" },
      { slug: "composer-context", title: "Context" },
      { slug: "draft-restore", title: "Draft restore" },
      { slug: "context-breakdown", title: "Context breakdown" },
      { slug: "prompt-library", title: "Prompt library" },
      { slug: "command-palette", title: "Command palette" },
    ],
  },
  {
    id: "voice",
    title: "Voice",
    description: "When the conversation stops being typed.",
    hooks: [],
    files: [],
    elements: [
      { slug: "voice-conversation", title: "Voice conversation" },
      { slug: "read-aloud", title: "Read aloud" },
    ],
  },
  {
    id: "thread",
    title: "Thread",
    description: "Everything around the conversation.",
    hooks: [],
    files: [],
    elements: [
      { slug: "chat-panel", title: "Chat panel" },
      { slug: "empty-state", title: "Empty state" },
      { slug: "scroll-anchor", title: "Scroll anchor" },
      { slug: "canvas-split", title: "Canvas" },
      { slug: "connection-state", title: "Connection state" },
      { slug: "shared-conversation", title: "Shared conversation" },
      { slug: "conversation-search", title: "Search in conversation" },
      { slug: "thread-search", title: "Thread search" },
      { slug: "launcher-bubble", title: "Launcher" },
      { slug: "settings-panel", title: "Settings" },
      { slug: "onboarding", title: "Onboarding" },
      { slug: "mobile-composer", title: "Mobile composer" },
    ],
  },
  {
    id: "aui-connected",
    title: "AUI connected",
    description: "Elements that read directly from assistant-ui runtime state.",
    hooks: [],
    files: [],
    elements: [
      { slug: "thread", title: "Thread" },
      { slug: "assistant-modal", title: "Assistant modal" },
      { slug: "assistant-sidebar", title: "Assistant sidebar" },
      { slug: "thread-list", title: "Thread list" },
      { slug: "thread-list-sidebar", title: "Thread list sidebar" },
      { slug: "orb", title: "Orb" },
      { slug: "reasoning", title: "Reasoning" },
      { slug: "message-timing", title: "Message timing" },
      { slug: "conversation-map", title: "Conversation map" },
      { slug: "context-display", title: "Context display" },
      { slug: "mcp-config", title: "MCP config dialog" },
      { slug: "attachment", title: "Attachment" },
      { slug: "follow-up-suggestions", title: "Follow-up suggestions" },
      { slug: "tool-fallback", title: "Tool fallback" },
      { slug: "tool-group", title: "Tool group" },
      { slug: "quote", title: "Quote" },
      { slug: "sources", title: "Sources" },
      { slug: "image", title: "Image" },
      { slug: "file", title: "File" },
      { slug: "model-selector", title: "Model selector" },
      { slug: "composer-trigger-popover", title: "Composer trigger popover" },
      { slug: "directive-text", title: "Directive text" },
    ],
  },
  {
    id: "renderers",
    title: "Renderers",
    description: "Rich content renderers that plug into assistant messages.",
    hooks: [],
    files: [],
    elements: [
      { slug: "markdown-text", title: "Markdown text" },
      { slug: "syntax-highlighter", title: "Syntax highlighter" },
      { slug: "shiki-highlighter", title: "Shiki highlighter" },
      { slug: "mermaid-diagram", title: "Mermaid diagram" },
      { slug: "generative-ui", title: "Generative UI" },
    ],
  },
  {
    id: "primitives",
    title: "Primitives",
    description: "Small building blocks shared across the assistant UI kit.",
    hooks: [],
    files: [],
    elements: [
      { slug: "tooltip-icon-button", title: "Tooltip icon button" },
      { slug: "logos", title: "Model logos" },
      { slug: "heat-graph", title: "Heat graph" },
    ],
  },
  {
    id: "generative",
    title: "Generative",
    description: "Widgets the model composes on its own at runtime.",
    hooks: [],
    files: [],
    elements: [
      { slug: "generative-stays", title: "Riverside Loft" },
      { slug: "generative-booking", title: "Table reservation" },
      { slug: "generative-order-status", title: "Order tracking" },
      { slug: "generative-flight-tracker", title: "Flight tracker" },
      { slug: "generative-portfolio", title: "Portfolio overview" },
      { slug: "generative-create-event", title: "Create event" },
      { slug: "generative-view-event", title: "View event" },
      { slug: "generative-weather-current", title: "Current weather" },
      { slug: "generative-ride-status", title: "Ride status" },
      { slug: "generative-draft-email", title: "Draft email" },
      { slug: "generative-cart", title: "Shopping cart" },
      { slug: "generative-playlist", title: "Playlist" },
      { slug: "generative-channel-message", title: "Channel message" },
      { slug: "generative-receipt", title: "Purchase receipt" },
      { slug: "generative-chart-area", title: "Weekly active users" },
      { slug: "generative-player-card", title: "Player card" },
      { slug: "generative-event-session", title: "Conference session" },
      { slug: "generative-notify-confirm", title: "Confirm dialog" },
      { slug: "generative-chart-line", title: "Response time" },
      { slug: "generative-create-task", title: "Create task" },
      { slug: "generative-software-purchase", title: "Software purchase" },
      { slug: "generative-chart-bars", title: "Support tickets" },
    ],
  },
];
