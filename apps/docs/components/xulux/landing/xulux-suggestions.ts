export type XuluxSuggestionGroupLabel =
  | "New app"
  | "Templates"
  | "Learn"
  | "Cloud";

export type XuluxSuggestionReplayPreview = {
  templateId: string;
  versionId?: string;
  previewUrl: string;
  downloadUrl: string;
  title: string;
};

export type XuluxSuggestion = {
  id: string;
  label: string;
  prompt: string;
  replay: {
    text: string;
    preview?: XuluxSuggestionReplayPreview;
  };
};

export type XuluxSuggestionGroup = {
  label: XuluxSuggestionGroupLabel;
  options: readonly XuluxSuggestion[];
};

const DOCS_PREVIEW_BASE =
  "https://0d9e27d14127c0eeadfc34b424cc7ed0.preview.bl.run";

function openInText({
  title,
  downloadUrl,
  prompt,
}: {
  title: string;
  downloadUrl: string;
  prompt: string;
}) {
  return `\n\n\`\`\`open-in\n${JSON.stringify({ title, downloadUrl, prompt })}\n\`\`\``;
}

const chatGptPreview: XuluxSuggestionReplayPreview = {
  templateId: "chatgpt",
  previewUrl: "/demos/chatgpt",
  downloadUrl: "/api/xulux/demo-download?slug=chatgpt",
  title: "ChatGPT Style Assistant",
};

const claudePreview: XuluxSuggestionReplayPreview = {
  templateId: "claude",
  previewUrl: "/demos/claude",
  downloadUrl: "/api/xulux/demo-download?slug=claude",
  title: "Claude Style Assistant",
};

const grokPreview: XuluxSuggestionReplayPreview = {
  templateId: "grok",
  previewUrl: "/demos/grok",
  downloadUrl: "/api/xulux/demo-download?slug=grok",
  title: "Grok Style Assistant",
};

const productDocsPreview: XuluxSuggestionReplayPreview = {
  templateId: "webpage-assistant",
  versionId: "product-docs",
  previewUrl: `${DOCS_PREVIEW_BASE}/preview?v=product-docs`,
  downloadUrl: `${DOCS_PREVIEW_BASE}/api/download?v=product-docs`,
  title: "Product Docs Assistant",
};

const websiteCopilotPreview: XuluxSuggestionReplayPreview = {
  templateId: "webpage-assistant",
  versionId: "website-copilot",
  previewUrl: `${DOCS_PREVIEW_BASE}/preview?v=website-copilot`,
  downloadUrl: `${DOCS_PREVIEW_BASE}/api/download?v=website-copilot`,
  title: "Website Page Copilot",
};

export const XULUX_SUGGESTION_GROUPS = [
  {
    label: "New app",
    options: [
      {
        id: "new-app-chatgpt-style",
        label: "ChatGPT style",
        prompt:
          "Build me a ChatGPT-style chat app with assistant-ui — empty state, composer, and message layout.",
        replay: {
          preview: chatGptPreview,
          text:
            "I opened the ChatGPT Style Assistant as a working starting point. It includes the empty state, rounded composer, tool menu, assistant and user message layouts, attachments, branch controls, voice input, and tool fallback UI.\n\nYou can inspect the live preview now, download the starter, and send a follow-up with the branding or behavior you want changed." +
            openInText({
              title: chatGptPreview.title,
              downloadUrl: chatGptPreview.downloadUrl,
              prompt:
                "Use the ChatGPT Style Assistant as the starting point for an assistant-ui app. Preserve its empty state, composer, tool menu, message layouts, attachments, branch controls, voice input, and tool fallback UI while adapting the branding and assistant behavior to my product.",
            }),
        },
      },
      {
        id: "new-app-product-docs",
        label: "docs assistant",
        prompt:
          "Build a SaaS product docs site with a sidebar assistant for onboarding guides and release notes.",
        replay: {
          preview: productDocsPreview,
          text:
            "I opened a Product Docs Assistant starter with a documentation layout and a sidebar assistant. It is set up for onboarding guides, release notes, docs search, page navigation, and grounded code examples.\n\nUse the live preview to review the layout, then send a follow-up with your product name, navigation sections, or brand colors and I can continue from this starting point." +
            openInText({
              title: productDocsPreview.title,
              downloadUrl: productDocsPreview.downloadUrl,
              prompt:
                "Build a SaaS product documentation site with onboarding guides and release notes. Use the Product Docs Assistant starter, keep the assistant in a desktop sidebar and mobile modal, and customize the docs navigation, page content, suggested prompts, and branding for my product.",
            }),
        },
      },
      {
        id: "new-app-website-copilot",
        label: "website copilot",
        prompt:
          "Build a marketing website with an on-page copilot that explains each page and suggests next steps.",
        replay: {
          preview: websiteCopilotPreview,
          text:
            "I opened the Website Page Copilot starter for a marketing site. The assistant sits beside the page on desktop, can explain the current content, navigate between pages, and suggest the visitor’s next action.\n\nReview the live preview, then tell me your product, pages, and desired calls to action and I can continue customizing it." +
            openInText({
              title: websiteCopilotPreview.title,
              downloadUrl: websiteCopilotPreview.downloadUrl,
              prompt:
                "Build a marketing website with an on-page copilot using the Website Page Copilot starter. Add Home, Features, Pricing, About, and Contact pages. Keep the assistant in the desktop sidebar and configure it to explain the current page and recommend the visitor’s next action.",
            }),
        },
      },
    ],
  },
  {
    label: "Templates",
    options: [
      {
        id: "template-chatgpt",
        label: "ChatGPT",
        prompt:
          "Open the ChatGPT Style Assistant demo and show me the live preview with download.",
        replay: {
          preview: chatGptPreview,
          text:
            "Opened the ChatGPT Style Assistant demo in the live preview. You can inspect the interface, download the starter, or send a follow-up describing what you want to customize." +
            openInText({
              title: chatGptPreview.title,
              downloadUrl: chatGptPreview.downloadUrl,
              prompt:
                "Open the ChatGPT Style Assistant demo and use it as the starting point for a React assistant-ui app. Preserve the ChatGPT-inspired empty state, composer, tool menu, message layouts, attachments, branch controls, voice input, and tool fallback UI while adapting the copy and branding.",
            }),
        },
      },
      {
        id: "template-claude",
        label: "Claude",
        prompt:
          "Open the Claude Style Assistant demo and show me the live preview with download.",
        replay: {
          preview: claudePreview,
          text:
            "Opened the Claude Style Assistant demo in the live preview. You can inspect the warm document-like layout, download the starter, or send a follow-up with your customization request." +
            openInText({
              title: claudePreview.title,
              downloadUrl: claudePreview.downloadUrl,
              prompt:
                "Open the Claude Style Assistant demo and use it as the starting point for a React assistant-ui app. Preserve its serif typography, warm styling, compact composer, file controls, message actions, and branch controls while adapting the copy and branding.",
            }),
        },
      },
      {
        id: "template-grok",
        label: "Grok",
        prompt:
          "Open the Grok Style Assistant demo and show me the live preview with download.",
        replay: {
          preview: grokPreview,
          text:
            "Opened the Grok Style Assistant demo in the live preview. You can inspect the minimal dark interface, download the starter, or send a follow-up with the changes you want." +
            openInText({
              title: grokPreview.title,
              downloadUrl: grokPreview.downloadUrl,
              prompt:
                "Open the Grok Style Assistant demo and use it as the starting point for a React assistant-ui app. Preserve its minimal dark styling, centered empty state, compact controls, message actions, and branch controls while adapting the copy and branding.",
            }),
        },
      },
    ],
  },
  {
    label: "Learn",
    options: [
      {
        id: "learn-thread-component",
        label: "Thread component",
        prompt: "How do I set up the assistant-ui Thread component?",
        replay: {
          text: `Here’s the quickest way to set up the assistant-ui \`Thread\` component.

## 1. Install the component

Use the shadcn registry:

\`\`\`bash
npx shadcn@latest add https://r.assistant-ui.com/thread.json
\`\`\`

## 2. Render it inside your runtime provider

\`\`\`tsx
import { Thread } from "@/components/assistant-ui/thread";

export default function Chat() {
  return (
    <div className="h-full">
      <Thread />
    </div>
  );
}
\`\`\`

\`Thread\` is the complete chat surface: message list, auto-scroll, empty state, composer, attachments, and message actions. It must be rendered below an \`AssistantRuntimeProvider\`, and its parent needs a real height such as \`h-full\` or \`min-h-screen\`.

You can customize tool rendering through the component’s \`components\` prop instead of rewriting the whole thread.`,
        },
      },
      {
        id: "learn-ai-sdk-runtime",
        label: "AI SDK runtime",
        prompt: "How do I connect assistant-ui to the Vercel AI SDK?",
        replay: {
          text: `Use \`useChatRuntime\` from \`@assistant-ui/react-ai-sdk\` on the client and return a UI message stream from your chat route.

## Server route

\`\`\`ts
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-5.4-mini"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
\`\`\`

## Client runtime

\`\`\`tsx
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

export default function Chat() {
  const runtime = useChatRuntime({ api: "/api/chat" });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
\`\`\`

The runtime connects assistant-ui’s thread primitives to the AI SDK transport, streaming state, tool calls, and message lifecycle.`,
        },
      },
      {
        id: "learn-tool-ui",
        label: "tool UI",
        prompt: "How do I render custom tool UIs in assistant-ui?",
        replay: {
          text: `Register a tool renderer and let assistant-ui render it inside the message parts.

\`\`\`tsx
"use generative";

import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";

export default defineToolkit({
  getWeather: {
    description: "Get current weather for a location",
    parameters: z.object({ location: z.string() }),
    execute: async ({ location }) => {
      "use client";
      return fetchWeather(location);
    },
    render: ({ args, result, status }) => {
      if (status.type === "running") {
        return <div>Checking {args.location}…</div>;
      }

      return (
        <div className="rounded-lg border p-4">
          <h3>{args.location}</h3>
          <p>{result.temperature}°</p>
        </div>
      );
    },
  },
});
\`\`\`

For a tool executed by your backend, register the same tool name with \`type: "backend"\` and provide only its renderer. Keep \`ToolFallback\` for unmatched tools, and use \`ToolGroup\` when consecutive calls should be displayed together.`,
        },
      },
    ],
  },
  {
    label: "Cloud",
    options: [
      {
        id: "cloud-thread-persistence",
        label: "thread persistence",
        prompt:
          "How do I add thread persistence and chat history with Assistant Cloud?",
        replay: {
          text: `Create an \`AssistantCloud\` client, connect it to your runtime, and render \`ThreadList\` beside \`Thread\`.

\`\`\`tsx
"use client";

import { useMemo } from "react";
import { AssistantCloud, AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";

export default function ChatPage() {
  const cloud = useMemo(
    () =>
      new AssistantCloud({
        baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
        anonymous: true,
      }),
    [],
  );

  const runtime = useChatRuntime({ cloud });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid h-dvh grid-cols-[200px_1fr]">
        <ThreadList />
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
\`\`\`

Set \`NEXT_PUBLIC_ASSISTANT_BASE_URL\` to your project’s frontend API URL. Assistant Cloud then handles thread creation, streamed message persistence, history restoration, and thread titles. Use authenticated Cloud access instead of \`anonymous: true\` for production accounts.`,
        },
      },
      {
        id: "cloud-ai-sdk-ui",
        label: "AI SDK + UI",
        prompt:
          "How do I set up Assistant Cloud with useChatRuntime, Thread, and ThreadList?",
        replay: {
          text: `The core setup is an \`AssistantCloud\` client, \`useChatRuntime\`, and both thread components under \`AssistantRuntimeProvider\`.

\`\`\`tsx
"use client";

import { useMemo } from "react";
import { AssistantCloud, AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";

export default function ChatPage() {
  const cloud = useMemo(
    () =>
      new AssistantCloud({
        baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
        anonymous: true,
      }),
    [],
  );

  const runtime = useChatRuntime({ cloud });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid h-dvh grid-cols-[220px_1fr]">
        <ThreadList />
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
\`\`\`

The first message creates a Cloud thread, completed messages are persisted as they stream, and selecting an item in \`ThreadList\` restores its history. Replace anonymous mode with your authentication token flow before using this for signed-in users.`,
        },
      },
      {
        id: "cloud-authorization",
        label: "authorization",
        prompt:
          "How do I set up user authorization and workspaces for Assistant Cloud?",
        replay: {
          text: `Assistant Cloud authorization is workspace-scoped: the authenticated user receives access to the threads and messages in the workspace selected by your application.

## Recommended flow

1. Configure your auth provider in the Assistant Cloud dashboard.
2. Obtain the provider JWT in your frontend.
3. Return it from the Cloud client’s \`authToken\` callback.
4. Use your organization or project membership to decide which workspace the user can access.

\`\`\`tsx
import { AssistantCloud } from "@assistant-ui/react";

const cloud = new AssistantCloud({
  baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
  authToken: () => getTokenFromYourProvider(),
});
\`\`\`

For custom workspace rules, create a backend token endpoint. That endpoint should verify your application session, calculate the allowed workspace, use the server-side Assistant Cloud API key to mint a short-lived token, and return only that token to the browser.

Anonymous mode is useful for demos, but it is not a replacement for account authorization and does not provide cross-device identity.`,
        },
      },
    ],
  },
] as const satisfies readonly XuluxSuggestionGroup[];

export const XULUX_SUGGESTIONS =
  XULUX_SUGGESTION_GROUPS.flatMap<XuluxSuggestion>((group) => [
    ...group.options,
  ]);

export function findXuluxSuggestion(id: string) {
  return XULUX_SUGGESTIONS.find((suggestion) => suggestion.id === id);
}
