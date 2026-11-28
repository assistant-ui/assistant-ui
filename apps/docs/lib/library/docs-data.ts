/** A page shown as a library item: its name, one line about it, and its address. `slug` names it within its tab. */
export type LibraryPage = {
  slug: string;
  name: string;
  description: string;
  href: string;
  /** Absent when the item is set up by following its page. */
  command?: string;
  /** What to tell a coding agent to set it up. */
  prompt: string;
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
        slug: "composer",
        name: "Composer",
        description:
          "Build custom message input UIs with full control over layout and behavior.",
        href: "/docs/primitives/composer",
        command: "npm install @assistant-ui/react",
        prompt: "set up https://www.assistant-ui.com/docs/primitives/composer",
      },
      {
        slug: "thread",
        name: "Thread",
        description:
          "Build custom scrollable message containers with auto-scroll, empty states, and message rendering.",
        href: "/docs/primitives/thread",
        command: "npm install @assistant-ui/react",
        prompt: "set up https://www.assistant-ui.com/docs/primitives/thread",
      },
      {
        slug: "message",
        name: "Message",
        description:
          "Build custom message rendering with content parts, attachments, and hover state.",
        href: "/docs/primitives/message",
        command: "npm install @assistant-ui/react",
        prompt: "set up https://www.assistant-ui.com/docs/primitives/message",
      },
      {
        slug: "action-bar",
        name: "ActionBar",
        description:
          "Build message action buttons with auto-hide, copy state, and intelligent disabling.",
        href: "/docs/primitives/action-bar",
        command: "npm install @assistant-ui/react",
        prompt:
          "set up https://www.assistant-ui.com/docs/primitives/action-bar",
      },
      {
        slug: "branch-picker",
        name: "BranchPicker",
        description:
          "Navigate between message branches, which are alternative responses the user can flip through.",
        href: "/docs/primitives/branch-picker",
        command: "npm install @assistant-ui/react",
        prompt:
          "set up https://www.assistant-ui.com/docs/primitives/branch-picker",
      },
      {
        slug: "thread-list",
        name: "ThreadList",
        description:
          "Multi-thread management for listing, creating, switching, archiving, and deleting conversations.",
        href: "/docs/primitives/thread-list",
        command: "npm install @assistant-ui/react",
        prompt:
          "set up https://www.assistant-ui.com/docs/primitives/thread-list",
      },
      {
        slug: "assistant-modal",
        name: "AssistantModal",
        description:
          "A floating chat popover with a fixed-position trigger button that opens a chat panel.",
        href: "/docs/primitives/assistant-modal",
        command: "npm install @assistant-ui/react",
        prompt:
          "set up https://www.assistant-ui.com/docs/primitives/assistant-modal",
      },
      {
        slug: "attachment",
        name: "Attachment",
        description:
          "File and image attachment rendering for the composer and messages.",
        href: "/docs/primitives/attachment",
        command: "npm install @assistant-ui/react",
        prompt:
          "set up https://www.assistant-ui.com/docs/primitives/attachment",
      },
      {
        slug: "suggestion",
        name: "Suggestion",
        description:
          "Suggested prompts that users can click to quickly send or populate the composer.",
        href: "/docs/primitives/suggestion",
        command: "npm install @assistant-ui/react",
        prompt:
          "set up https://www.assistant-ui.com/docs/primitives/suggestion",
      },
      {
        slug: "selection-toolbar",
        name: "SelectionToolbar",
        description:
          "A floating toolbar that appears when text is selected within a message.",
        href: "/docs/primitives/selection-toolbar",
        command: "npm install @assistant-ui/react",
        prompt:
          "set up https://www.assistant-ui.com/docs/primitives/selection-toolbar",
      },
      {
        slug: "error",
        name: "Error",
        description:
          "Accessible error display for messages with automatic error text extraction.",
        href: "/docs/primitives/error",
        command: "npm install @assistant-ui/react",
        prompt: "set up https://www.assistant-ui.com/docs/primitives/error",
      },
      {
        slug: "chain-of-thought",
        name: "ChainOfThought",
        description:
          "Collapsible accordion for grouping reasoning steps and tool calls.",
        href: "/docs/primitives/chain-of-thought",
        command: "npm install @assistant-ui/react",
        prompt:
          "set up https://www.assistant-ui.com/docs/primitives/chain-of-thought",
      },
    ],
  },
];

export const LIBRARY_RUNTIMES: readonly LibraryPageGroup[] = [
  {
    label: "Framework runtimes",
    pages: [
      {
        slug: "ai-sdk",
        name: "Vercel AI SDK",
        description:
          "Connect the Vercel AI SDK to a React chat UI via assistant-ui.",
        href: "/docs/runtimes/ai-sdk/overview",
        command: "npm install @assistant-ui/ai-sdk",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/ai-sdk/overview",
      },
      {
        slug: "langgraph",
        name: "LangGraph",
        description:
          "Build a chat UI for LangGraph agents in React with assistant-ui.",
        href: "/docs/runtimes/langgraph/overview",
        command: "npm install @assistant-ui/react-langgraph",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/langgraph/overview",
      },
      {
        slug: "langchain",
        name: "LangChain",
        description:
          "Use LangChain's useStream hook with a React chat UI through assistant-ui.",
        href: "/docs/runtimes/langchain",
        command: "npm install @assistant-ui/react-langchain",
        prompt: "set up https://www.assistant-ui.com/docs/runtimes/langchain",
      },
      {
        slug: "eve",
        name: "Eve",
        description:
          "Connect an Eve agent to assistant-ui with useEveAgentRuntime, eve/next, durable sessions, streaming messages, and human-in-the-loop approvals.",
        href: "/docs/runtimes/eve/overview",
        command: "npm install @assistant-ui/eve",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/eve/overview",
      },
      {
        slug: "google-adk",
        name: "Google ADK",
        description:
          "Connect Google's Agent Development Kit (ADK) to a React chat UI with assistant-ui.",
        href: "/docs/runtimes/google-adk/overview",
        command: "npm install @assistant-ui/react-google-adk",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/google-adk/overview",
      },
      {
        slug: "a2a",
        name: "A2A",
        description:
          "Connect any A2A v1.0 protocol-compliant agent server to a React chat UI with assistant-ui.",
        href: "/docs/runtimes/a2a/overview",
        command: "npm install @assistant-ui/react-a2a",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/a2a/overview",
      },
      {
        slug: "ag-ui",
        name: "AG-UI",
        description:
          "Wire AG-UI (Agent-User Interaction) protocol agents into a React chat UI with assistant-ui.",
        href: "/docs/runtimes/ag-ui/overview",
        command: "npm install @assistant-ui/react-ag-ui",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/ag-ui/overview",
      },
      {
        slug: "opencode",
        name: "OpenCode",
        description:
          "Build a React chat UI for OpenCode coding agents with assistant-ui.",
        href: "/docs/runtimes/opencode/overview",
        command: "npm install @assistant-ui/react-opencode",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/opencode/overview",
      },
    ],
  },
  {
    label: "Agent frameworks",
    pages: [
      {
        slug: "openai-agents",
        name: "OpenAI Agents SDK",
        description:
          "Connect the OpenAI Agents SDK to assistant-ui through the AI SDK runtime.",
        href: "/docs/runtimes/openai-agents",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/openai-agents",
      },
      {
        slug: "pydantic-ai",
        name: "Pydantic AI",
        description:
          "Connect a Pydantic AI Python agent to assistant-ui through the AG-UI runtime.",
        href: "/docs/runtimes/pydantic-ai",
        command: "npm install @assistant-ui/react-ag-ui @ag-ui/client@^1.0.3",
        prompt: "set up https://www.assistant-ui.com/docs/runtimes/pydantic-ai",
      },
      {
        slug: "cloudflare-agents",
        name: "Cloudflare Agents",
        description:
          "Connect Cloudflare's stateful agent framework to a React chat UI with assistant-ui through the AI SDK runtime, keeping its WebSocket transport, server-side persistence, and tool calling.",
        href: "/docs/runtimes/cloudflare-agents",
        command:
          "npm install agents@0.12.4 @cloudflare/ai-chat@0.7.0 ai@^6 @ai-sdk/openai@^3",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/cloudflare-agents",
      },
      {
        slug: "mastra",
        name: "Mastra",
        description:
          "Wire the Mastra TypeScript agent framework into a React chat UI with assistant-ui, with full streaming, tool calling, multi-agent support, and thread management.",
        href: "/docs/runtimes/mastra",
        command:
          "npm install @mastra/core@latest @mastra/ai-sdk@latest zod@latest",
        prompt: "set up https://www.assistant-ui.com/docs/runtimes/mastra",
      },
      {
        slug: "claude-managed-agents",
        name: "Claude Managed Agents",
        description:
          "Connect Anthropic's Managed Agents sessions to assistant-ui with the external store runtime, folding the session event log into messages, rendering approval gates, and using sessions as the thread list.",
        href: "/docs/runtimes/claude-managed-agents",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/claude-managed-agents",
      },
    ],
  },
  {
    label: "Your own backend",
    pages: [
      {
        slug: "custom-local-runtime",
        name: "LocalRuntime",
        description: "Quickest path to a working chat.",
        href: "/docs/runtimes/custom/local-runtime",
        command: "npm install @assistant-ui/react",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/custom/local-runtime",
      },
      {
        slug: "custom-external-store",
        name: "ExternalStoreRuntime",
        description: "Bring your own redux, zustand, or state manager.",
        href: "/docs/runtimes/custom/external-store",
        command: "npm install @assistant-ui/react",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/custom/external-store",
      },
      {
        slug: "custom-data-stream",
        name: "Data Stream Protocol",
        description:
          "Standard message-streaming protocol on top of LocalRuntime.",
        href: "/docs/runtimes/custom/data-stream",
        command: "npm install @assistant-ui/react-data-stream",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/custom/data-stream",
      },
      {
        slug: "custom-assistant-transport",
        name: "Assistant Transport",
        description:
          "Stream agent state to the frontend and handle user commands for custom agents.",
        href: "/docs/runtimes/custom/assistant-transport",
        prompt:
          "set up https://www.assistant-ui.com/docs/runtimes/custom/assistant-transport",
      },
    ],
  },
];

export const LIBRARY_TOOLS: readonly LibraryPageGroup[] = [
  {
    label: "Defining tools",
    pages: [
      {
        slug: "defining-tools",
        name: "Defining Tools",
        description:
          'Define tools for your AI chat with assistant-ui toolkits and the "use generative" directive, covering frontend, backend, human, and provider tools with type safety and streaming.',
        href: "/docs/tools/defining-tools",
        prompt: "set up https://www.assistant-ui.com/docs/tools/defining-tools",
      },
      {
        slug: "backend",
        name: "Backend Tools",
        description:
          "Wire assistant-ui toolkits into your server with the AI SDK using AISDKToolkit and frontendTools, mix client and server tools, and return multi-modal results.",
        href: "/docs/tools/backend",
        prompt: "set up https://www.assistant-ui.com/docs/tools/backend",
      },
      {
        slug: "dynamic-tools",
        name: "Dynamic Tools",
        description: "Tools whose executor closes over React state.",
        href: "/docs/tools/dynamic-tools",
        prompt: "set up https://www.assistant-ui.com/docs/tools/dynamic-tools",
      },
    ],
  },
  {
    label: "Rendering tool calls",
    pages: [
      {
        slug: "tool-ui",
        name: "Tool UI",
        description:
          "Render AI tool calls as custom React components that show loading, result, and interactive states for each tool invocation in assistant-ui.",
        href: "/docs/tools/tool-ui",
        prompt: "set up https://www.assistant-ui.com/docs/tools/tool-ui",
      },
      {
        slug: "generative-ui",
        name: "Generative UI",
        description:
          "Let the model compose an interface at runtime from a component vocabulary you ship, with spec mode or the present tool from @assistant-ui/generative-ui.",
        href: "/docs/tools/generative-ui",
        command: "npm install @assistant-ui/generative-ui",
        prompt: "set up https://www.assistant-ui.com/docs/tools/generative-ui",
      },
      {
        slug: "generative-ui-formats",
        name: "Choosing an answer format",
        description:
          "When the model should answer in Markdown, with spec mode or the present tool, or with a widget in a sandboxed frame, and how the formats compared on the same tasks.",
        href: "/docs/tools/generative-ui-formats",
        prompt:
          "set up https://www.assistant-ui.com/docs/tools/generative-ui-formats",
      },
      {
        slug: "generative-ui-slack",
        name: "Generative UI on Slack",
        description:
          "Convert a generative UI tree into Slack Block Kit, post it, and decode the block_actions payload Slack sends back into your action handlers.",
        href: "/docs/tools/generative-ui-slack",
        prompt:
          "set up https://www.assistant-ui.com/docs/tools/generative-ui-slack",
      },
      {
        slug: "generative-ui-teams",
        name: "Generative UI on Microsoft Teams",
        description:
          "Convert a generative UI tree into an Adaptive Card, send it from a bot, and decode the Action.Submit payload Teams sends back into your action handlers.",
        href: "/docs/tools/generative-ui-teams",
        prompt:
          "set up https://www.assistant-ui.com/docs/tools/generative-ui-teams",
      },
      {
        slug: "generative-ui-primitive",
        name: "Generative UI primitive",
        description:
          "Render agent-described React UI from a JSON spec with a consumer-provided component allowlist, using the MessagePrimitive.GenerativeUI primitive.",
        href: "/docs/tools/generative-ui-primitive",
        prompt:
          "set up https://www.assistant-ui.com/docs/tools/generative-ui-primitive",
      },
      {
        slug: "interactables",
        name: "Interactable Tool UIs",
        description:
          "Build stateful components and tool UIs that both the user and the model can read and edit.",
        href: "/docs/tools/interactables",
        prompt: "set up https://www.assistant-ui.com/docs/tools/interactables",
      },
      {
        slug: "a2ui",
        name: "A2UI over AG-UI",
        description:
          "Render A2UI surfaces from AG-UI activity snapshots or A2A messages, task snapshots, and artifacts as generative UI.",
        href: "/docs/tools/a2ui",
        prompt: "set up https://www.assistant-ui.com/docs/tools/a2ui",
      },
      {
        slug: "openui",
        name: "OpenUI",
        description:
          "Render streaming OpenUI Lang interfaces in an assistant-ui conversation with @openuidev/assistant-ui, the integration package published by OpenUI.",
        href: "/docs/tools/openui",
        command: "npm install @openuidev/assistant-ui",
        prompt: "set up https://www.assistant-ui.com/docs/tools/openui",
      },
    ],
  },
  {
    label: "MCP",
    pages: [
      {
        slug: "mcp",
        name: "Model Context Protocol (MCP)",
        description:
          "Connect MCP servers as a tool catalog in your assistant-ui app.",
        href: "/docs/tools/mcp",
        command: "npm install @ai-sdk/mcp",
        prompt: "set up https://www.assistant-ui.com/docs/tools/mcp",
      },
      {
        slug: "user-managed-mcp",
        name: "User-managed MCP servers",
        description:
          "Let end users add and authenticate MCP servers from the browser with @assistant-ui/react-mcp.",
        href: "/docs/tools/user-managed-mcp",
        command: "npm install @assistant-ui/react-mcp",
        prompt:
          "set up https://www.assistant-ui.com/docs/tools/user-managed-mcp",
      },
      {
        slug: "mcp-apps",
        name: "MCP Apps",
        description: "Render MCP App UI resources inline in chat.",
        href: "/docs/tools/mcp-apps",
        command: "npm install @ai-sdk/mcp",
        prompt: "set up https://www.assistant-ui.com/docs/tools/mcp-apps",
      },
      {
        slug: "webmcp",
        name: "WebMCP provider",
        description:
          "Expose your app's frontend tools to a WebMCP-capable browser with unstable_useWebMcpProvider.",
        href: "/docs/tools/webmcp",
        prompt: "set up https://www.assistant-ui.com/docs/tools/webmcp",
      },
    ],
  },
  {
    label: "Advanced",
    pages: [
      {
        slug: "multi-agent",
        name: "Multi-Agent Chat UI",
        description:
          "Render sub-agent conversations and handoffs inside tool calls.",
        href: "/docs/tools/multi-agent",
        prompt: "set up https://www.assistant-ui.com/docs/tools/multi-agent",
      },
    ],
  },
];

export const LIBRARY_INTEGRATIONS: readonly LibraryPageGroup[] = [
  {
    label: "Gateways",
    pages: [
      {
        slug: "gateways",
        name: "LLM gateways",
        description:
          "Route AI chat traffic through OpenAI-compatible LLM gateways (OpenRouter, LiteLLM, Portkey, etc.) for cost, fallback, and BYOK in assistant-ui apps.",
        href: "/docs/integrations/gateways",
        prompt:
          "set up https://www.assistant-ui.com/docs/integrations/gateways",
      },
    ],
  },
  {
    label: "Observability",
    pages: [
      {
        slug: "observability-langfuse",
        name: "Langfuse",
        description:
          "Trace AI SDK calls into Langfuse via OpenTelemetry for tracing, evals, and prompt management.",
        href: "/docs/integrations/observability/langfuse",
        command:
          "npm install @langfuse/tracing @langfuse/otel @opentelemetry/sdk-node",
        prompt:
          "set up https://www.assistant-ui.com/docs/integrations/observability/langfuse",
      },
      {
        slug: "observability-langsmith",
        name: "LangSmith",
        description:
          "Trace AI SDK calls into LangSmith with the wrapAISDK helper.",
        href: "/docs/integrations/observability/langsmith",
        command: "npm install langsmith",
        prompt:
          "set up https://www.assistant-ui.com/docs/integrations/observability/langsmith",
      },
      {
        slug: "observability-assistant-cloud",
        name: "Assistant Cloud",
        description:
          "Correlate AI SDK OpenTelemetry spans with Assistant Cloud runs for one view of browser and server activity.",
        href: "/docs/integrations/observability/assistant-cloud",
        prompt:
          "set up https://www.assistant-ui.com/docs/integrations/observability/assistant-cloud",
      },
    ],
  },
  {
    label: "Auth",
    pages: [
      {
        slug: "auth-clerk",
        name: "Clerk",
        description:
          "Gate the chat route and scope thread persistence to the signed-in user with Clerk.",
        href: "/docs/integrations/auth/clerk",
        prompt:
          "set up https://www.assistant-ui.com/docs/integrations/auth/clerk",
      },
      {
        slug: "auth-better-auth",
        name: "better-auth",
        description:
          "TypeScript-first auth with database-owned sessions; gate the chat route and scope threads to the signed-in user.",
        href: "/docs/integrations/auth/better-auth",
        prompt:
          "set up https://www.assistant-ui.com/docs/integrations/auth/better-auth",
      },
      {
        slug: "auth-next-auth",
        name: "Auth.js (next-auth)",
        description:
          "Gate the chat route and scope thread persistence to the signed-in user with Auth.js v5.",
        href: "/docs/integrations/auth/next-auth",
        prompt:
          "set up https://www.assistant-ui.com/docs/integrations/auth/next-auth",
      },
    ],
  },
  {
    label: "Persistence",
    pages: [
      {
        slug: "persistence-custom-adapter",
        name: "Custom thread persistence",
        description:
          "Save chat history to your own database and load it on reload: threads (create, rename, archive, delete) through RemoteThreadListAdapter, messages through ThreadHistoryAdapter.",
        href: "/docs/integrations/persistence/custom-adapter",
        command: "npm install drizzle-orm postgres drizzle-kit",
        prompt:
          "set up https://www.assistant-ui.com/docs/integrations/persistence/custom-adapter",
      },
      {
        slug: "persistence-thread-list-adapters",
        name: "Thread list adapters",
        description:
          "The contracts behind a thread list you store yourself: RemoteThreadListAdapter for your own database, ExternalStoreThreadListAdapter for your own store, and the cases a production list has to handle.",
        href: "/docs/integrations/persistence/thread-list-adapters",
        prompt:
          "set up https://www.assistant-ui.com/docs/integrations/persistence/thread-list-adapters",
      },
    ],
  },
  {
    label: "Attachments",
    pages: [
      {
        slug: "attachments-custom-adapter",
        name: "Custom attachment uploads",
        description:
          "Upload chat attachments to object storage with a presigned-URL AttachmentAdapter.",
        href: "/docs/integrations/attachments/custom-adapter",
        prompt:
          "set up https://www.assistant-ui.com/docs/integrations/attachments/custom-adapter",
      },
    ],
  },
];

export const LIBRARY_UTILITIES: readonly LibraryPageGroup[] = [
  {
    label: "Utilities",
    pages: [
      {
        slug: "heat-graph",
        name: "heat-graph",
        description:
          "Headless, composable activity heatmap components for React.",
        href: "/docs/utilities/heat-graph",
        command: "npm install heat-graph",
        prompt: "set up https://www.assistant-ui.com/docs/utilities/heat-graph",
      },
      {
        slug: "tw-shimmer",
        name: "tw-shimmer",
        description: "Tailwind CSS v4 plugin for shimmer effects.",
        href: "/docs/utilities/tw-shimmer",
        command: "npm install tw-shimmer",
        prompt: "set up https://www.assistant-ui.com/docs/utilities/tw-shimmer",
      },
      {
        slug: "react-o11y",
        name: "react-o11y",
        description:
          "Headless primitives for visualizing observability spans as collapsible trace trees, waterfalls, and agent and LLM call timelines.",
        href: "/docs/utilities/react-o11y",
        command: "npm install @assistant-ui/react-o11y",
        prompt: "set up https://www.assistant-ui.com/docs/utilities/react-o11y",
      },
      {
        slug: "devtools",
        name: "DevTools",
        description:
          "Inspect runtime state, context, and events in the browser.",
        href: "/docs/guides/devtools",
        command: "npm install @assistant-ui/react-devtools",
        prompt:
          "install and set up assistant-ui with `npx assistant-ui@latest setup --products guides/devtools`",
      },
      {
        slug: "safe-content-frame",
        name: "Safe Content Frame",
        description: "Sandboxes for HTML, each render on its own domain.",
        href: "/safe-content-frame",
        command: "npm install safe-content-frame",
        prompt:
          "install and set up assistant-ui with `npx assistant-ui@latest setup --products safe-content-frame`",
      },
      {
        slug: "generative-frame",
        name: "Generative Frame",
        description:
          "Model-written HTML and SVG widgets that stream into a sandbox.",
        href: "/generative-frame",
        command: "npm install generative-frame",
        prompt:
          "install and set up assistant-ui with `npx assistant-ui@latest setup --products generative-frame`",
      },
      {
        slug: "variants",
        name: "Variants",
        description:
          "Compare UI variants inline in the real page, then pick one.",
        href: "/variants",
        command: "npm install @assistant-ui/variants",
        prompt:
          "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add `@assistant-ui/variants`, following https://github.com/assistant-ui/assistant-ui/tree/main/packages/variants",
      },
    ],
  },
];
