import type { Recipe } from "./types.js";

const ASSISTANT_UI_PRODUCT_ID = "assistant-ui";

const BASE_RECIPES: Array<Omit<Recipe, "productId">> = [
  // ─── Templates ───────────────────────────────────────────────────────

  {
    id: "next-minimal",
    label: "Minimal Next.js",
    description:
      "No-frills chat starter. Single thread, no sidebar, no persistence. Use when user wants the simplest possible assistant-ui app or has not asked for specific features. Next.js app router with OpenAI via AI SDK.",
    sourcePath: "templates/minimal",
    kind: "template",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk"],
    capabilities: ["basic-chat"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
    ],
    agent: {
      useWhen: [
        "user wants the simplest possible assistant-ui starting point",
        "user has not specified any extra features",
        "user wants to add assistant-ui to an existing Next.js app",
      ],
      avoidWhen: [
        "user wants persistent threads",
        "user wants artifacts or code display",
        "user wants a thread list / sidebar",
      ],
      keyFiles: {
        customizeUi: ["components/assistant-ui/thread.tsx"],
        changeModel: ["app/api/chat/route.ts"],
        addTools: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: [
        "No persistent thread storage",
        "No sidebar",
        "OpenAI only in starter config",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-default",
    label: "Default Next.js with Thread List",
    description:
      "Chat app with a collapsible sidebar showing all past threads. Use when user wants to browse and return to previous conversations. In-memory threads (no DB), but has the thread list UI. Next.js app router with AI SDK.",
    sourcePath: "templates/default",
    kind: "template",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime+threads",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk", "sidebar"],
    capabilities: ["basic-chat", "thread-list"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
      {
        name: "NEXT_PUBLIC_ASSISTANT_BASE_URL",
        required: false,
        scope: "client",
        secret: false,
        description: "Assistant Cloud endpoint for chat persistence.",
      },
    ],
    agent: {
      useWhen: [
        "user wants a thread list or sidebar",
        "user wants to browse previous conversations",
        "user wants the standard assistant-ui layout",
      ],
      avoidWhen: [
        "user wants truly persistent threads (this is in-memory)",
        "user wants artifacts or code preview",
      ],
      keyFiles: {
        customizeUi: [
          "components/assistant-ui/thread.tsx",
          "components/assistant-ui/assistant-sidebar.tsx",
        ],
        changeModel: ["app/api/chat/route.ts"],
        addTools: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: [
        "Threads are in-memory only — lost on page refresh",
        "OpenAI only in starter config",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-cloud",
    label: "Cloud-Connected Next.js",
    description:
      "Next.js chat with optional assistant-ui Cloud integration for server-managed thread persistence and analytics. Use when the user wants real persistence without building their own backend DB.",
    sourcePath: "templates/cloud",
    kind: "template",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime+threads",
      persistence: "cloud",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk", "cloud", "sidebar"],
    capabilities: ["basic-chat", "thread-list", "persistent-threads"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
      {
        name: "NEXT_PUBLIC_ASSISTANT_BASE_URL",
        required: false,
        scope: "client",
        secret: false,
        description: "Assistant Cloud API URL from cloud.assistant-ui.com.",
      },
      {
        name: "ASSISTANT_API_KEY",
        required: false,
        scope: "server",
        secret: true,
        description: "Assistant Cloud API key for server-side operations.",
      },
    ],
    agent: {
      useWhen: [
        "user wants persistent thread storage without building a database",
        "user wants assistant-ui cloud integration",
        "user wants analytics on conversations",
      ],
      avoidWhen: [
        "user wants to self-host everything",
        "user does not want third-party cloud dependency",
      ],
      keyFiles: {
        customizeUi: [
          "components/assistant-ui/thread.tsx",
          "components/assistant-ui/assistant-sidebar.tsx",
        ],
        changeModel: ["app/api/chat/route.ts"],
        addTools: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: [
        "Requires assistant-ui cloud account for persistence features",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-cloud-clerk",
    label: "Cloud + Clerk Auth",
    description:
      "Next.js chat with Clerk authentication and assistant-ui Cloud persistence. Use when user needs both user auth and cloud thread storage. Comes with sign-in/sign-up flows out of the box.",
    sourcePath: "templates/cloud-clerk",
    kind: "template",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime+threads",
      persistence: "cloud",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk", "cloud", "auth", "sidebar"],
    capabilities: [
      "basic-chat",
      "thread-list",
      "persistent-threads",
      "cloud-auth",
    ],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: false,
        scope: "server",
        secret: true,
        description: "OpenAI API key (optional if using cloud-hosted model).",
      },
      {
        name: "NEXT_PUBLIC_ASSISTANT_BASE_URL",
        required: true,
        scope: "client",
        secret: false,
        description: "Assistant Cloud API URL from cloud.assistant-ui.com.",
      },
      {
        name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        required: true,
        scope: "client",
        secret: false,
        description: "Clerk publishable key for frontend auth.",
      },
      {
        name: "CLERK_SECRET_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "Clerk secret key for server-side auth.",
      },
    ],
    agent: {
      useWhen: [
        "user wants authentication (sign in/sign up)",
        "user wants per-user thread persistence",
        "user wants Clerk + assistant-ui cloud combo",
      ],
      avoidWhen: [
        "user does not need authentication",
        "user wants a different auth provider",
      ],
      keyFiles: {
        customizeUi: [
          "components/assistant-ui/thread.tsx",
          "components/assistant-ui/assistant-sidebar.tsx",
        ],
        changeModel: ["app/api/chat/route.ts"],
        addTools: ["app/api/chat/route.ts"],
        changeRuntime: ["app/layout.tsx"],
        env: [".env.example"],
      },
      limitations: [
        "Requires Clerk account",
        "Requires assistant-ui cloud account",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-langgraph",
    label: "LangGraph Next.js",
    description:
      "Next.js chat connected to a LangGraph backend. Use when user already has or wants a LangGraph agent. Supports streaming from LangGraph Cloud or self-hosted LangGraph server.",
    sourcePath: "templates/langgraph",
    kind: "template",
    tech: {
      framework: "next",
      runtime: "none",
      frontendPattern: "useChatRuntime+threads",
      persistence: "server-db",
      agentPattern: "langgraph",
    },
    tags: ["next", "langgraph", "sidebar"],
    capabilities: [
      "basic-chat",
      "thread-list",
      "persistent-threads",
      "custom-backend",
    ],
    preview: { status: "missing" },
    env: [
      {
        name: "LANGCHAIN_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "LangChain/LangSmith API key.",
      },
      {
        name: "LANGGRAPH_API_URL",
        required: true,
        scope: "server",
        secret: false,
        description: "URL of the LangGraph deployment.",
      },
      {
        name: "NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID",
        required: true,
        scope: "client",
        secret: false,
        description: "LangGraph assistant or graph ID.",
      },
    ],
    agent: {
      useWhen: [
        "user has a LangGraph backend",
        "user wants LangGraph agent integration",
        "user wants server-managed thread persistence via LangGraph",
      ],
      avoidWhen: [
        "user wants a simple OpenAI chat (use next-minimal or next-default)",
        "user does not have a LangGraph deployment",
      ],
      keyFiles: {
        customizeUi: [
          "components/assistant-ui/thread.tsx",
          "components/assistant-ui/assistant-sidebar.tsx",
        ],
        changeRuntime: ["app/page.tsx"],
        env: [".env.example"],
      },
      limitations: [
        "Requires running LangGraph server or LangGraph Cloud deployment",
        "No local AI SDK route — model is managed by LangGraph",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-mcp",
    label: "MCP Tools Next.js",
    description:
      "Next.js chat with Model Context Protocol (MCP) tool integration. Use when user wants to connect external tools via MCP servers to the assistant. Includes AI SDK MCP adapter.",
    sourcePath: "templates/mcp",
    kind: "template",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime+threads",
      persistence: "none",
      agentPattern: "mcp",
    },
    tags: ["next", "ai-sdk", "mcp", "sidebar"],
    capabilities: ["basic-chat", "thread-list", "mcp-tools"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
      {
        name: "NEXT_PUBLIC_ASSISTANT_BASE_URL",
        required: false,
        scope: "client",
        secret: false,
        description: "Assistant Cloud endpoint for chat persistence.",
      },
    ],
    agent: {
      useWhen: [
        "user wants to connect MCP tool servers",
        "user wants the assistant to use external tools via MCP protocol",
      ],
      avoidWhen: [
        "user does not need external tools",
        "user wants LangGraph tools instead",
      ],
      keyFiles: {
        customizeUi: [
          "components/assistant-ui/thread.tsx",
          "components/assistant-ui/assistant-sidebar.tsx",
        ],
        changeModel: ["app/api/chat/route.ts"],
        addTools: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: [
        "MCP server configuration is in the API route — update for custom servers",
        "Threads are in-memory unless cloud is configured",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-ai-sdk-v6",
    label: "AI SDK v6 Example",
    description:
      "Demonstrates the latest AI SDK v6 patterns with assistant-ui. Use when user explicitly wants AI SDK v6 features or the latest streamText patterns.",
    sourcePath: "examples/with-ai-sdk-v6",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk"],
    capabilities: ["basic-chat"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
    ],
    agent: {
      useWhen: [
        "user wants AI SDK v6 specific patterns",
        "user wants to see the latest AI SDK integration",
      ],
      avoidWhen: [
        "user wants a general starter (use next-minimal or next-default)",
      ],
      keyFiles: {
        customizeUi: ["components/assistant-ui/thread.tsx"],
        changeModel: ["app/api/chat/route.ts"],
        addTools: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: ["Requires AI SDK v6+"],
    },
    verifyProfile: "next",
  },

  {
    id: "next-artifacts",
    label: "Artifacts / Code Preview",
    description:
      "Chat with an artifact panel that renders generated code, HTML, or rich content side-by-side with the conversation. Use when user wants a v0-style or ChatGPT Canvas-style experience where AI output is rendered live.",
    sourcePath: "examples/with-artifacts",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk"],
    capabilities: ["basic-chat", "artifact-preview"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
    ],
    agent: {
      useWhen: [
        "user wants code/HTML artifact preview",
        "user wants a Canvas-style or v0-style split view",
        "user wants the AI to generate renderable content",
      ],
      avoidWhen: [
        "user only wants plain text chat",
        "user wants form-based copilot (use next-react-hook-form)",
      ],
      keyFiles: {
        customizeUi: [
          "components/assistant-ui/thread.tsx",
          "components/artifacts/",
        ],
        changeModel: ["app/api/chat/route.ts"],
        addTools: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: [
        "Artifact rendering is client-side only",
        "No persistent storage",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-chain-of-thought",
    label: "Chain of Thought / Reasoning",
    description:
      "Chat that displays the model reasoning steps before the final answer. Use when user wants to show thinking/reasoning traces to end users, similar to o1/o3 reasoning display.",
    sourcePath: "examples/with-chain-of-thought",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk"],
    capabilities: ["basic-chat", "reasoning-display"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
    ],
    agent: {
      useWhen: [
        "user wants to display reasoning/thinking steps",
        "user wants chain-of-thought UI",
        "user wants o1/o3-style reasoning traces",
      ],
      avoidWhen: ["user does not need reasoning display"],
      keyFiles: {
        customizeUi: ["components/assistant-ui/thread.tsx"],
        changeModel: ["app/api/chat/route.ts"],
        addTools: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: [
        "Reasoning display depends on model supporting reasoning tokens",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-external-store",
    label: "External Store",
    description:
      "Chat using a custom external state store instead of the built-in AI SDK state. Use when user has their own message state management or needs to integrate assistant-ui into an existing app with its own data layer.",
    sourcePath: "examples/with-external-store",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "none",
      frontendPattern: "external-store",
      persistence: "none",
      agentPattern: "custom",
    },
    tags: ["next"],
    capabilities: ["basic-chat", "external-store"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description:
          "OpenAI API key (used in demo, replaceable with any backend).",
      },
    ],
    agent: {
      useWhen: [
        "user has their own message state management",
        "user wants to integrate assistant-ui with an existing data store",
        "user wants full control over message state",
      ],
      avoidWhen: [
        "user is starting fresh (use next-minimal or next-default)",
        "user wants AI SDK managed state",
      ],
      keyFiles: {
        customizeUi: ["components/assistant-ui/thread.tsx"],
        changeRuntime: ["app/page.tsx"],
        env: [".env.example"],
      },
      limitations: [
        "Requires user to implement their own message store adapter",
        "No built-in streaming — user provides the integration",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-assistant-transport",
    label: "Assistant Transport (Custom Backend)",
    description:
      "Chat connected to a custom backend via the assistant-ui transport protocol. Use when user has a non-AI-SDK backend (e.g. Python, custom streaming server) and wants to connect it to assistant-ui.",
    sourcePath: "examples/with-assistant-transport",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "none",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "custom",
    },
    tags: ["next", "langgraph"],
    capabilities: ["basic-chat", "custom-backend"],
    preview: { status: "missing" },
    env: [
      {
        name: "NEXT_PUBLIC_API_URL",
        required: true,
        scope: "client",
        secret: false,
        description: "URL of the external assistant backend server.",
      },
    ],
    agent: {
      useWhen: [
        "user has a custom streaming backend",
        "user wants to connect a non-AI-SDK server",
        "user wants the assistant-ui transport protocol",
      ],
      avoidWhen: [
        "user wants a built-in AI SDK backend (use next-minimal)",
        "user wants LangGraph specifically (use next-langgraph)",
      ],
      keyFiles: {
        customizeUi: ["components/assistant-ui/thread.tsx"],
        changeRuntime: ["app/page.tsx"],
        env: [".env.example"],
      },
      limitations: [
        "Requires a running external backend that speaks the assistant-ui transport protocol",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-custom-thread-list",
    label: "Custom Thread List",
    description:
      "Chat with a fully custom-styled thread list sidebar. Use when user wants to heavily customize the thread list appearance beyond the default sidebar component.",
    sourcePath: "examples/with-custom-thread-list",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime+threads",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk", "sidebar"],
    capabilities: ["basic-chat", "thread-list"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
    ],
    agent: {
      useWhen: [
        "user wants a custom-styled thread list",
        "user wants to deeply customize the sidebar UI",
      ],
      avoidWhen: ["user is fine with the default sidebar (use next-default)"],
      keyFiles: {
        customizeUi: [
          "components/assistant-ui/thread.tsx",
          "components/assistant-ui/thread-list.tsx",
        ],
        changeModel: ["app/api/chat/route.ts"],
        addTools: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: ["Threads are in-memory"],
    },
    verifyProfile: "next",
  },

  {
    id: "next-parent-id-grouping",
    label: "Parent ID Grouping",
    description:
      "Chat demonstrating parent-ID-based message grouping for branching conversations. Use when user wants tree-structured conversations or message branching like ChatGPT edit history.",
    sourcePath: "examples/with-parent-id-grouping",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk"],
    capabilities: ["basic-chat", "parent-grouping"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
    ],
    agent: {
      useWhen: [
        "user wants message branching or tree-structured conversations",
        "user wants parent-ID-based message grouping",
      ],
      avoidWhen: ["user wants simple linear chat (use next-minimal)"],
      keyFiles: {
        customizeUi: ["components/assistant-ui/thread.tsx"],
        changeModel: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: ["Branching is client-side only"],
    },
    verifyProfile: "next",
  },

  {
    id: "next-react-hook-form",
    label: "React Hook Form Copilot",
    description:
      "AI copilot that assists users filling out forms using react-hook-form integration. Use when user wants an AI assistant that can read and write form fields — ideal for onboarding, surveys, or data entry copilots.",
    sourcePath: "examples/with-react-hook-form",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk"],
    capabilities: ["basic-chat", "form-copilot"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
    ],
    agent: {
      useWhen: [
        "user wants an AI form-filling copilot",
        "user wants react-hook-form integration",
        "user wants AI to assist with data entry or onboarding forms",
      ],
      avoidWhen: [
        "user does not have forms in their app",
        "user wants plain chat only",
      ],
      keyFiles: {
        customizeUi: [
          "components/assistant-ui/thread.tsx",
          "components/form.tsx",
        ],
        changeModel: ["app/api/chat/route.ts"],
        addTools: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: ["Form schema must be defined by the developer"],
    },
    verifyProfile: "next",
  },

  {
    id: "next-langgraph-example",
    label: "LangGraph Example",
    description:
      "Example showing LangGraph streaming integration with assistant-ui. Similar to the langgraph template but as a standalone example with different configuration patterns.",
    sourcePath: "examples/with-langgraph",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "none",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "langgraph",
    },
    tags: ["next", "langgraph"],
    capabilities: ["basic-chat", "custom-backend"],
    preview: { status: "missing" },
    env: [
      {
        name: "NEXT_PUBLIC_API_URL",
        required: true,
        scope: "client",
        secret: false,
        description: "LangGraph API URL.",
      },
      {
        name: "NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID",
        required: true,
        scope: "client",
        secret: false,
        description: "LangGraph assistant or graph ID.",
      },
    ],
    agent: {
      useWhen: [
        "user wants a LangGraph example (not a full template)",
        "user wants to see LangGraph streaming patterns",
      ],
      avoidWhen: [
        "user wants a production-ready LangGraph starter (use next-langgraph template)",
      ],
      keyFiles: {
        customizeUi: ["components/assistant-ui/thread.tsx"],
        changeRuntime: ["app/page.tsx"],
        env: [".env.example"],
      },
      limitations: ["Requires running LangGraph server"],
    },
    verifyProfile: "next",
  },

  {
    id: "next-ag-ui",
    label: "AG-UI Protocol",
    description:
      "Chat connected to an AG-UI (Agent User Interaction) protocol agent. Use when user has an AG-UI compatible agent backend or wants to use the AG-UI standard for agent communication.",
    sourcePath: "examples/with-ag-ui",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "none",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "ag-ui",
    },
    tags: ["next"],
    capabilities: ["basic-chat", "agent-protocol", "custom-backend"],
    preview: { status: "missing" },
    env: [
      {
        name: "NEXT_PUBLIC_AGUI_AGENT_URL",
        required: true,
        scope: "client",
        secret: false,
        description: "URL of the AG-UI compatible agent endpoint.",
      },
    ],
    agent: {
      useWhen: [
        "user has an AG-UI protocol agent",
        "user wants AG-UI standard integration",
      ],
      avoidWhen: [
        "user does not have an AG-UI backend",
        "user wants standard AI SDK or LangGraph",
      ],
      keyFiles: {
        customizeUi: ["components/assistant-ui/thread.tsx"],
        changeRuntime: ["app/page.tsx"],
        env: [".env.example"],
      },
      limitations: ["Requires a running AG-UI compatible agent"],
    },
    verifyProfile: "next",
  },

  {
    id: "next-cloud-example",
    label: "Cloud Example",
    description:
      "Full cloud integration example with JWT auth, server-side API key, and assistant-ui Cloud persistence. More complete than the cloud template — includes auth token handling and API key management.",
    sourcePath: "examples/with-cloud",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime+threads",
      persistence: "cloud",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk", "cloud"],
    capabilities: ["basic-chat", "thread-list", "persistent-threads"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
      {
        name: "JWT_SECRET",
        required: true,
        scope: "server",
        secret: true,
        description: "Secret for JWT token generation.",
      },
      {
        name: "ASSISTANT_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "Assistant Cloud API key.",
      },
      {
        name: "NEXT_PUBLIC_ASSISTANT_BASE_URL",
        required: true,
        scope: "client",
        secret: false,
        description: "Assistant Cloud API URL.",
      },
    ],
    agent: {
      useWhen: [
        "user wants a complete cloud integration example with auth",
        "user wants JWT + assistant-ui cloud pattern",
      ],
      avoidWhen: ["user wants a simpler cloud setup (use next-cloud template)"],
      keyFiles: {
        customizeUi: ["components/assistant-ui/thread.tsx"],
        changeModel: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: [
        "Requires assistant-ui cloud account",
        "JWT secret must be configured",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-elevenlabs-scribe",
    label: "ElevenLabs Scribe (Voice)",
    description:
      "Chat with ElevenLabs voice input via the Scribe speech-to-text integration. Use when user wants voice-driven interaction or speech transcription in their assistant.",
    sourcePath: "examples/with-elevenlabs-scribe",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk"],
    capabilities: ["basic-chat", "voice-input"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
    ],
    agent: {
      useWhen: [
        "user wants voice input or speech-to-text",
        "user wants ElevenLabs Scribe integration",
      ],
      avoidWhen: ["user does not need voice features"],
      keyFiles: {
        customizeUi: ["components/assistant-ui/thread.tsx"],
        changeModel: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: ["Requires ElevenLabs API access for speech features"],
    },
    verifyProfile: "next",
  },

  {
    id: "next-elevenlabs-conversational",
    label: "ElevenLabs Conversational AI",
    description:
      "Chat with ElevenLabs Conversational AI voice interaction and OpenAI text fallback. Use when user wants a voice assistant backed by an ElevenLabs agent.",
    sourcePath: "examples/with-elevenlabs-conversational",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk"],
    capabilities: ["basic-chat", "voice-input"],
    preview: { status: "missing" },
    env: [
      {
        name: "NEXT_PUBLIC_ELEVENLABS_AGENT_ID",
        required: true,
        scope: "client",
        secret: false,
        description: "ElevenLabs Conversational AI agent ID.",
      },
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for text chat fallback.",
      },
    ],
    agent: {
      useWhen: [
        "user wants ElevenLabs Conversational AI voice chat",
        "user has or plans to configure an ElevenLabs agent",
      ],
      avoidWhen: [
        "user only needs text chat",
        "user does not have an ElevenLabs agent configured",
      ],
      keyFiles: {
        customizeUi: ["app/voice-thread.tsx"],
        changeModel: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: [
        "Requires an ElevenLabs Conversational AI agent ID",
        "OpenAI key is used for text chat fallback",
      ],
    },
    verifyProfile: "next",
  },
  {
    id: "next-ffmpeg",
    label: "FFmpeg Media Processing",
    description:
      "Chat with client-side FFmpeg integration for media processing tasks. Use when user wants an AI assistant that can process audio/video files in the browser.",
    sourcePath: "examples/with-ffmpeg",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk"],
    capabilities: ["basic-chat", "media-processing"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
    ],
    agent: {
      useWhen: [
        "user wants media processing in the browser",
        "user wants FFmpeg integration with chat",
      ],
      avoidWhen: ["user does not need media processing"],
      keyFiles: {
        customizeUi: ["components/assistant-ui/thread.tsx"],
        changeModel: ["app/api/chat/route.ts"],
        addTools: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: [
        "FFmpeg runs client-side in WebAssembly — large initial download",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-google-adk",
    label: "Google ADK",
    description:
      "Chat connected to Google Agent Development Kit (ADK) backend. Use when user has a Google ADK agent or wants to use Gemini models via the ADK framework.",
    sourcePath: "examples/with-google-adk",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "none",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "google-adk",
    },
    tags: ["next"],
    capabilities: ["basic-chat", "custom-backend"],
    preview: { status: "missing" },
    env: [
      {
        name: "GOOGLE_GENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "Google Gemini API key for ADK.",
      },
    ],
    agent: {
      useWhen: [
        "user has a Google ADK agent",
        "user wants Gemini via Google ADK",
      ],
      avoidWhen: [
        "user wants OpenAI or other providers (use next-minimal)",
        "user does not have a Google ADK setup",
      ],
      keyFiles: {
        customizeUi: ["components/assistant-ui/thread.tsx"],
        changeRuntime: ["app/page.tsx"],
        env: [".env.example"],
      },
      limitations: [
        "Requires Google ADK backend running",
        "Requires Gemini API key",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-interactables",
    label: "Interactables",
    description:
      "Chat with assistant-ui interactables and client-defined tools. Use when user wants model-controlled interactive UI elements that execute in the browser.",
    sourcePath: "examples/with-interactables",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk"],
    capabilities: ["basic-chat", "artifact-preview"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for AI SDK route handler.",
      },
    ],
    agent: {
      useWhen: [
        "user wants client-side interactive tools or generative UI",
        "user wants assistant-ui interactables",
      ],
      avoidWhen: ["user only needs standard chat"],
      keyFiles: {
        customizeUi: ["app/page.tsx"],
        changeModel: ["app/api/chat/route.ts"],
        addTools: ["app/api/chat/route.ts"],
      },
      limitations: [
        "Client tools are forwarded from model context and execute in the browser",
      ],
    },
    verifyProfile: "next",
  },

  {
    id: "next-livekit",
    label: "LiveKit Voice",
    description:
      "Voice assistant example using LiveKit for realtime voice interaction and OpenAI text chat fallback. Use when user wants speech-first interaction with a LiveKit room.",
    sourcePath: "examples/with-livekit",
    kind: "example",
    tech: {
      framework: "next",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["next", "ai-sdk"],
    capabilities: ["basic-chat", "voice-input"],
    preview: { status: "missing" },
    env: [
      {
        name: "LIVEKIT_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "LiveKit API key for token generation.",
      },
      {
        name: "LIVEKIT_API_SECRET",
        required: true,
        scope: "server",
        secret: true,
        description: "LiveKit API secret for token generation.",
      },
      {
        name: "LIVEKIT_ROOM_NAME",
        required: true,
        scope: "server",
        secret: false,
        description: "LiveKit room name used by the voice example.",
      },
      {
        name: "NEXT_PUBLIC_LIVEKIT_URL",
        required: true,
        scope: "client",
        secret: false,
        description: "LiveKit websocket URL.",
      },
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for text chat fallback.",
      },
    ],
    agent: {
      useWhen: [
        "user wants LiveKit voice interaction",
        "user wants a realtime voice assistant example",
      ],
      avoidWhen: [
        "user only needs text chat",
        "user does not have LiveKit credentials",
      ],
      keyFiles: {
        customizeUi: ["app/voice-thread.tsx"],
        changeModel: ["app/api/chat/route.ts"],
        env: [".env.example"],
      },
      limitations: [
        "Requires LiveKit credentials and a reachable LiveKit URL",
        "Includes a Python LiveKit agent folder that may need separate runtime setup",
      ],
    },
    verifyProfile: "next",
  },
  {
    id: "react-router",
    label: "React Router",
    description:
      "Chat built with React Router v7 instead of Next.js. Use when user wants assistant-ui in a React Router / Remix-style app. Uses Vite for bundling and OpenAI directly (not AI SDK).",
    sourcePath: "examples/with-react-router",
    kind: "example",
    tech: {
      framework: "react-router",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "custom",
    },
    tags: ["react-router", "vite"],
    capabilities: ["basic-chat"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key.",
      },
    ],
    agent: {
      useWhen: [
        "user wants React Router instead of Next.js",
        "user has an existing React Router / Remix app",
        "user wants Vite-based build",
      ],
      avoidWhen: [
        "user wants Next.js (use any next-* recipe)",
        "user wants TanStack (use tanstack)",
      ],
      keyFiles: {
        customizeUi: ["app/components/assistant-ui/thread.tsx"],
        changeModel: ["app/routes/api.chat.ts"],
        env: [".env.example"],
      },
      limitations: [
        "Uses OpenAI client directly, not AI SDK",
        "No thread list or sidebar in starter",
      ],
    },
    verifyProfile: "react-router",
  },

  {
    id: "tanstack",
    label: "TanStack Start",
    description:
      "Chat built with TanStack Start (TanStack Router + Vite + Nitro). Use when user wants assistant-ui in a TanStack-based app. Full-stack with server functions via Nitro.",
    sourcePath: "examples/with-tanstack",
    kind: "example",
    tech: {
      framework: "tanstack",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "custom",
    },
    tags: ["tanstack", "vite"],
    capabilities: ["basic-chat"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key.",
      },
    ],
    agent: {
      useWhen: [
        "user wants TanStack Start framework",
        "user has an existing TanStack app",
        "user wants Vite + Nitro server",
      ],
      avoidWhen: [
        "user wants Next.js",
        "user wants React Router (use react-router)",
      ],
      keyFiles: {
        customizeUi: ["app/components/assistant-ui/thread.tsx"],
        changeModel: ["app/routes/api/chat.ts"],
        env: [".env.example"],
      },
      limitations: [
        "Uses OpenAI client directly, not AI SDK",
        "TanStack Start is relatively new — fewer community examples",
      ],
    },
    verifyProfile: "tanstack",
  },

  {
    id: "with-expo",
    label: "Expo (React Native) Mobile Chat",
    description:
      "Mobile chat app for iOS, Android, and web built on Expo + React Native, using @assistant-ui/react-native and the AI SDK. Use when the user wants a mobile or cross-platform native app rather than a web Next.js app.",
    sourcePath: "examples/with-expo",
    kind: "example",
    tech: {
      framework: "expo",
      runtime: "nodejs-api-route",
      frontendPattern: "useChatRuntime",
      persistence: "none",
      agentPattern: "ai-sdk",
    },
    tags: ["expo", "react-native", "mobile", "ai-sdk"],
    capabilities: ["basic-chat", "thread-list"],
    preview: { status: "missing" },
    env: [
      {
        name: "OPENAI_API_KEY",
        required: true,
        scope: "server",
        secret: true,
        description: "OpenAI API key for the AI SDK Expo server route handler.",
      },
    ],
    agent: {
      useWhen: [
        "user wants a mobile app (iOS or Android)",
        "user wants a cross-platform native + web app via Expo / React Native",
        "user mentions Expo, React Native, iOS, or Android",
      ],
      avoidWhen: [
        "user wants a web-only app (use next-minimal or next-default)",
        "user wants Next.js, Vite, React Router, or TanStack",
      ],
      keyFiles: {
        customizeUi: ["components/assistant-ui/thread.tsx"],
        changeModel: ["app/api/chat+api.ts"],
        addTools: ["app/api/chat+api.ts"],
        env: [".env.example"],
      },
      limitations: [
        "No persistent thread storage — in-memory only",
        "OpenAI only in starter config",
        "Verification profile is custom — no automated mixer verify yet",
      ],
    },
    verifyProfile: "custom",
  },
];

export const RECIPES: Recipe[] = BASE_RECIPES.map((recipe) => ({
  productId: ASSISTANT_UI_PRODUCT_ID,
  ...recipe,
}));
