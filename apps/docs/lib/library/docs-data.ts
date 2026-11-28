/** A page shown as a library item: its name, one line about it, and its address. */
export type LibraryPage = {
  name: string;
  description: string;
  href: string;
};

export type LibraryPageGroup = {
  label: string;
  pages: readonly LibraryPage[];
};

export const LIBRARY_PRIMITIVES: readonly LibraryPageGroup[] = [
  {
    label: "Primitives",
    pages: [
      {
        name: "Composer",
        description:
          "Build custom message input UIs with full control over layout and behavior.",
        href: "/docs/primitives/composer",
      },
      {
        name: "Thread",
        description:
          "Build custom scrollable message containers with auto-scroll, empty states, and message rendering.",
        href: "/docs/primitives/thread",
      },
      {
        name: "Message",
        description:
          "Build custom message rendering with content parts, attachments, and hover state.",
        href: "/docs/primitives/message",
      },
      {
        name: "ActionBar",
        description:
          "Build message action buttons with auto-hide, copy state, and intelligent disabling.",
        href: "/docs/primitives/action-bar",
      },
      {
        name: "BranchPicker",
        description:
          "Navigate between message branches, which are alternative responses the user can flip through.",
        href: "/docs/primitives/branch-picker",
      },
      {
        name: "ThreadList",
        description:
          "Multi-thread management for listing, creating, switching, archiving, and deleting conversations.",
        href: "/docs/primitives/thread-list",
      },
      {
        name: "AssistantModal",
        description:
          "A floating chat popover with a fixed-position trigger button that opens a chat panel.",
        href: "/docs/primitives/assistant-modal",
      },
      {
        name: "Attachment",
        description:
          "File and image attachment rendering for the composer and messages.",
        href: "/docs/primitives/attachment",
      },
      {
        name: "Suggestion",
        description:
          "Suggested prompts that users can click to quickly send or populate the composer.",
        href: "/docs/primitives/suggestion",
      },
      {
        name: "SelectionToolbar",
        description:
          "A floating toolbar that appears when text is selected within a message.",
        href: "/docs/primitives/selection-toolbar",
      },
      {
        name: "Error",
        description:
          "Accessible error display for messages with automatic error text extraction.",
        href: "/docs/primitives/error",
      },
      {
        name: "ChainOfThought",
        description:
          "Collapsible accordion for grouping reasoning steps and tool calls.",
        href: "/docs/primitives/chain-of-thought",
      },
    ],
  },
];

export const LIBRARY_RUNTIMES: readonly LibraryPageGroup[] = [
  {
    label: "Framework runtimes",
    pages: [
      {
        name: "Vercel AI SDK",
        description:
          "Connect the Vercel AI SDK to a React chat UI via assistant-ui.",
        href: "/docs/runtimes/ai-sdk/overview",
      },
      {
        name: "LangGraph",
        description:
          "Build a chat UI for LangGraph agents in React with assistant-ui.",
        href: "/docs/runtimes/langgraph/overview",
      },
      {
        name: "LangChain",
        description:
          "Use LangChain's useStream hook with a React chat UI through assistant-ui.",
        href: "/docs/runtimes/langchain",
      },
      {
        name: "Eve",
        description:
          "Connect an Eve agent to assistant-ui with useEveAgentRuntime, eve/next, durable sessions, streaming messages, and human-in-the-loop approvals.",
        href: "/docs/runtimes/eve/overview",
      },
      {
        name: "Google ADK",
        description:
          "Connect Google's Agent Development Kit (ADK) to a React chat UI with assistant-ui.",
        href: "/docs/runtimes/google-adk/overview",
      },
      {
        name: "A2A",
        description:
          "Connect any A2A v1.0 protocol-compliant agent server to a React chat UI with assistant-ui.",
        href: "/docs/runtimes/a2a/overview",
      },
      {
        name: "AG-UI",
        description:
          "Wire AG-UI (Agent-User Interaction) protocol agents into a React chat UI with assistant-ui.",
        href: "/docs/runtimes/ag-ui/overview",
      },
      {
        name: "OpenCode",
        description:
          "Build a React chat UI for OpenCode coding agents with assistant-ui.",
        href: "/docs/runtimes/opencode/overview",
      },
    ],
  },
  {
    label: "Agent frameworks",
    pages: [
      {
        name: "OpenAI Agents SDK",
        description:
          "Connect the OpenAI Agents SDK to assistant-ui through the AI SDK runtime.",
        href: "/docs/runtimes/openai-agents",
      },
      {
        name: "Pydantic AI",
        description:
          "Connect a Pydantic AI Python agent to assistant-ui through the AG-UI runtime.",
        href: "/docs/runtimes/pydantic-ai",
      },
      {
        name: "Cloudflare Agents",
        description:
          "Connect Cloudflare's stateful agent framework to a React chat UI with assistant-ui through the AI SDK runtime, keeping its WebSocket transport, server-side persistence, and tool calling.",
        href: "/docs/runtimes/cloudflare-agents",
      },
      {
        name: "Mastra",
        description:
          "Wire the Mastra TypeScript agent framework into a React chat UI with assistant-ui, with full streaming, tool calling, multi-agent support, and thread management.",
        href: "/docs/runtimes/mastra",
      },
      {
        name: "Claude Managed Agents",
        description:
          "Connect Anthropic's Managed Agents sessions to assistant-ui with the external store runtime, folding the session event log into messages, rendering approval gates, and using sessions as the thread list.",
        href: "/docs/runtimes/claude-managed-agents",
      },
    ],
  },
  {
    label: "Your own backend",
    pages: [
      {
        name: "LocalRuntime",
        description: "Quickest path to a working chat.",
        href: "/docs/runtimes/custom/local-runtime",
      },
      {
        name: "ExternalStoreRuntime",
        description: "Bring your own redux, zustand, or state manager.",
        href: "/docs/runtimes/custom/external-store",
      },
      {
        name: "Data Stream Protocol",
        description:
          "Standard message-streaming protocol on top of LocalRuntime.",
        href: "/docs/runtimes/custom/data-stream",
      },
      {
        name: "Assistant Transport",
        description:
          "Stream agent state to the frontend and handle user commands for custom agents.",
        href: "/docs/runtimes/custom/assistant-transport",
      },
    ],
  },
];

export const LIBRARY_TOOLS: readonly LibraryPageGroup[] = [
  {
    label: "Defining tools",
    pages: [
      {
        name: "Defining Tools",
        description:
          'Define tools for your AI chat with assistant-ui toolkits and the "use generative" directive, covering frontend, backend, human, and provider tools with type safety and streaming.',
        href: "/docs/tools/defining-tools",
      },
      {
        name: "Backend Tools",
        description:
          "Wire assistant-ui toolkits into your server with the AI SDK using AISDKToolkit and frontendTools, mix client and server tools, and return multi-modal results.",
        href: "/docs/tools/backend",
      },
      {
        name: "Dynamic Tools",
        description: "Tools whose executor closes over React state.",
        href: "/docs/tools/dynamic-tools",
      },
    ],
  },
  {
    label: "Rendering tool calls",
    pages: [
      {
        name: "Tool UI",
        description:
          "Render AI tool calls as custom React components that show loading, result, and interactive states for each tool invocation in assistant-ui.",
        href: "/docs/tools/tool-ui",
      },
      {
        name: "Generative UI",
        description:
          "Let the model compose an interface at runtime from a component vocabulary you ship, with spec mode or the present tool from @assistant-ui/generative-ui.",
        href: "/docs/tools/generative-ui",
      },
      {
        name: "Choosing an answer format",
        description:
          "When the model should answer in Markdown, with spec mode or the present tool, or with a widget in a sandboxed frame, and how the formats compared on the same tasks.",
        href: "/docs/tools/generative-ui-formats",
      },
      {
        name: "Generative UI on Slack",
        description:
          "Convert a generative UI tree into Slack Block Kit, post it, and decode the block_actions payload Slack sends back into your action handlers.",
        href: "/docs/tools/generative-ui-slack",
      },
      {
        name: "Generative UI on Microsoft Teams",
        description:
          "Convert a generative UI tree into an Adaptive Card, send it from a bot, and decode the Action.Submit payload Teams sends back into your action handlers.",
        href: "/docs/tools/generative-ui-teams",
      },
      {
        name: "Generative UI primitive",
        description:
          "Render agent-described React UI from a JSON spec with a consumer-provided component allowlist, using the MessagePrimitive.GenerativeUI primitive.",
        href: "/docs/tools/generative-ui-primitive",
      },
      {
        name: "Interactable Tool UIs",
        description:
          "Build stateful components and tool UIs that both the user and the model can read and edit.",
        href: "/docs/tools/interactables",
      },
      {
        name: "A2UI over AG-UI",
        description:
          "Render A2UI surfaces from AG-UI activity snapshots or A2A messages, task snapshots, and artifacts as generative UI.",
        href: "/docs/tools/a2ui",
      },
      {
        name: "OpenUI",
        description:
          "Render streaming OpenUI Lang interfaces in an assistant-ui conversation with @openuidev/assistant-ui, the integration package published by OpenUI.",
        href: "/docs/tools/openui",
      },
    ],
  },
  {
    label: "MCP",
    pages: [
      {
        name: "Model Context Protocol (MCP)",
        description:
          "Connect MCP servers as a tool catalog in your assistant-ui app.",
        href: "/docs/tools/mcp",
      },
      {
        name: "User-managed MCP servers",
        description:
          "Let end users add and authenticate MCP servers from the browser with @assistant-ui/react-mcp.",
        href: "/docs/tools/user-managed-mcp",
      },
      {
        name: "MCP Apps",
        description: "Render MCP App UI resources inline in chat.",
        href: "/docs/tools/mcp-apps",
      },
      {
        name: "WebMCP provider",
        description:
          "Expose your app's frontend tools to a WebMCP-capable browser with unstable_useWebMcpProvider.",
        href: "/docs/tools/webmcp",
      },
    ],
  },
  {
    label: "Advanced",
    pages: [
      {
        name: "Multi-Agent Chat UI",
        description:
          "Render sub-agent conversations and handoffs inside tool calls.",
        href: "/docs/tools/multi-agent",
      },
    ],
  },
];

export const LIBRARY_INTEGRATIONS: readonly LibraryPageGroup[] = [
  {
    label: "Gateways",
    pages: [
      {
        name: "LLM gateways",
        description:
          "Route AI chat traffic through OpenAI-compatible LLM gateways (OpenRouter, LiteLLM, Portkey, etc.) for cost, fallback, and BYOK in assistant-ui apps.",
        href: "/docs/integrations/gateways",
      },
    ],
  },
  {
    label: "Observability",
    pages: [
      {
        name: "Langfuse",
        description:
          "Trace AI SDK calls into Langfuse via OpenTelemetry for tracing, evals, and prompt management.",
        href: "/docs/integrations/observability/langfuse",
      },
      {
        name: "LangSmith",
        description:
          "Trace AI SDK calls into LangSmith with the wrapAISDK helper.",
        href: "/docs/integrations/observability/langsmith",
      },
      {
        name: "Assistant Cloud",
        description:
          "Correlate AI SDK OpenTelemetry spans with Assistant Cloud runs for one view of browser and server activity.",
        href: "/docs/integrations/observability/assistant-cloud",
      },
    ],
  },
  {
    label: "Auth",
    pages: [
      {
        name: "Clerk",
        description:
          "Gate the chat route and scope thread persistence to the signed-in user with Clerk.",
        href: "/docs/integrations/auth/clerk",
      },
      {
        name: "better-auth",
        description:
          "TypeScript-first auth with database-owned sessions; gate the chat route and scope threads to the signed-in user.",
        href: "/docs/integrations/auth/better-auth",
      },
      {
        name: "Auth.js (next-auth)",
        description:
          "Gate the chat route and scope thread persistence to the signed-in user with Auth.js v5.",
        href: "/docs/integrations/auth/next-auth",
      },
    ],
  },
  {
    label: "Persistence",
    pages: [
      {
        name: "Custom thread persistence",
        description:
          "Save chat history to your own database and load it on reload: threads (create, rename, archive, delete) through RemoteThreadListAdapter, messages through ThreadHistoryAdapter.",
        href: "/docs/integrations/persistence/custom-adapter",
      },
      {
        name: "Thread list adapters",
        description:
          "The contracts behind a thread list you store yourself: RemoteThreadListAdapter for your own database, ExternalStoreThreadListAdapter for your own store, and the cases a production list has to handle.",
        href: "/docs/integrations/persistence/thread-list-adapters",
      },
    ],
  },
  {
    label: "Attachments",
    pages: [
      {
        name: "Custom attachment uploads",
        description:
          "Upload chat attachments to object storage with a presigned-URL AttachmentAdapter.",
        href: "/docs/integrations/attachments/custom-adapter",
      },
    ],
  },
];

export const LIBRARY_UTILITIES: readonly LibraryPageGroup[] = [
  {
    label: "Utilities",
    pages: [
      {
        name: "heat-graph",
        description:
          "Headless, composable activity heatmap components for React.",
        href: "/docs/utilities/heat-graph",
      },
      {
        name: "tw-shimmer",
        description: "Tailwind CSS v4 plugin for shimmer effects.",
        href: "/docs/utilities/tw-shimmer",
      },
      {
        name: "react-o11y",
        description:
          "Headless primitives for visualizing observability spans as collapsible trace trees, waterfalls, and agent and LLM call timelines.",
        href: "/docs/utilities/react-o11y",
      },
      {
        name: "DevTools",
        description:
          "Inspect runtime state, context, and events in the browser.",
        href: "/docs/guides/devtools",
      },
      {
        name: "Safe Content Frame",
        description: "Sandboxes for HTML, each render on its own domain.",
        href: "/safe-content-frame",
      },
      {
        name: "Generative Frame",
        description:
          "Model-written HTML and SVG widgets that stream into a sandbox.",
        href: "/generative-frame",
      },
      {
        name: "Variants",
        description:
          "Compare UI variants inline in the real page, then pick one.",
        href: "/variants",
      },
    ],
  },
];
