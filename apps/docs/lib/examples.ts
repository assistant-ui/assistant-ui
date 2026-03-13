export type ExampleItem = {
  title: string;
  description?: string;
  image: string;
  link: string;
  external?: boolean;
  githubLink?: string;
};

const INTERNAL_EXAMPLES: ExampleItem[] = [
  {
    title: "Modal",
    image: "/screenshot/examples/modal.png",
    description: "Floating button that opens an AI assistant chat box.",
    link: "/examples/modal",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/assistant-ui/assistant-modal.tsx",
  },
  {
    title: "Form Filling Co-Pilot",
    image: "/screenshot/examples/form-demo.png",
    description: "AssistantSidebar copilot which fills forms for the user.",
    link: "/examples/form-demo",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/examples/with-react-hook-form/app/page.tsx",
  },
  {
    title: "ChatGPT Clone",
    image: "/screenshot/examples/chatgpt.png",
    description: "Customized colors and styles for a ChatGPT look and feel.",
    link: "/examples/chatgpt",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/examples/chatgpt.tsx",
  },
  {
    title: "Claude Clone",
    image: "/screenshot/examples/claude.png",
    description: "Customized colors and styles for a Claude look and feel.",
    link: "/examples/claude",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/examples/claude.tsx",
  },
  {
    title: "Grok Clone",
    image: "/screenshot/examples/grok.png",
    description: "Customized colors and styles for a Grok look and feel.",
    link: "/examples/grok",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/examples/grok.tsx",
  },
  {
    title: "Perplexity Clone",
    image: "/screenshot/examples/perplexity.png",
    description: "Customized colors and styles for a Perplexity look and feel.",
    link: "/examples/perplexity",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/examples/perplexity.tsx",
  },
  {
    title: "AI SDK",
    image: "/screenshot/examples/ai-sdk.png",
    description: "Chat persistence with AI SDK.",
    link: "/examples/ai-sdk",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/examples/shadcn.tsx",
  },
  {
    title: "Mem0 - ChatGPT with memory",
    image: "/screenshot/examples/mem0.png",
    description:
      "A personalized AI chat app powered by Mem0 that remembers your preferences, facts, and memories.",
    link: "/examples/mem0",
    githubLink:
      "https://github.com/mem0ai/mem0/blob/main/examples/mem0-demo/components/assistant-ui/thread.tsx",
  },
  {
    title: "LangGraph Stockbroker",
    image: "/screenshot/stockbroker.png",
    description: "A stockbroker showing human in the loop with LangGraph",
    link: "/examples/stockbroker",
    githubLink: "https://github.com/assistant-ui/assistant-ui-stockbroker",
  },
  {
    title: "Artifacts",
    image: "/screenshot/examples/artifacts.png",
    description:
      "Open Source Claude Artifacts. You can ask the bot to generate websites.",
    link: "/examples/artifacts",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-artifacts",
  },
  {
    title: "Expo (React Native)",
    image: "/screenshot/examples/expo.png",
    description:
      "Native iOS & Android chat app with drawer navigation and thread management.",
    link: "/examples/expo",
    githubLink:
      "https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-expo",
  },
];

const COMMUNITY_EXAMPLES: ExampleItem[] = [
  {
    title: "Potpie — AI Code Development",
    image: "/screenshot/examples/potpie.png",
    description:
      "Spec-driven development for large codebases (5.2k stars). Knowledge graph-based codebase understanding with useChatRuntime.",
    link: "https://github.com/potpie-ai/potpie",
    external: true,
  },
  {
    title: "Hapi — Remote AI Coding",
    image: "/screenshot/examples/hapi.png",
    description:
      "Desktop/mobile app for Claude Code, Codex, Gemini, and OpenCode (2.6k stars). Uses useExternalStoreRuntime to bridge remote coding agent sessions.",
    link: "https://github.com/tiann/hapi",
    external: true,
  },
  {
    title: "Unsloth Studio — LLM Fine-Tuning",
    image: "/screenshot/examples/unsloth.png",
    description:
      "AI-powered fine-tuning platform for LLMs (53k stars). Uses useAui, AuiIf, useAuiEvent, and useAuiState throughout a fully custom Thread component.",
    link: "https://github.com/unslothai/unsloth",
    external: true,
  },
  {
    title: "Readest — Ebook Reader",
    image: "/screenshot/examples/readest.png",
    description:
      "Cross-platform ebook reader (Tauri + Next.js, iOS/Android/macOS/Windows) with a deeply integrated AI reading assistant.",
    link: "https://github.com/readest/readest",
    external: true,
  },
  {
    title: "SurfSense — NotebookLM Alternative",
    image: "/screenshot/examples/surfsense.png",
    description:
      "Open-source NotebookLM alternative built on LangChain + FastAPI. Uses ExternalStoreRuntime for a public chat sharing viewer.",
    link: "https://github.com/MODSetter/SurfSense",
    external: true,
  },
  {
    title: "Mastra UI Dojo",
    image: "/screenshot/examples/mastra-ui-dojo.png",
    description:
      "Mastra integrated with AI SDK, Assistant UI, and CopilotKit — compare side-by-side.",
    link: "https://github.com/mastra-ai/ui-dojo",
    external: true,
  },
  {
    title: "Open Canvas",
    image: "/screenshot/open-canvas.png",
    description: "OSS implementation of ChatGPT's Canvas.",
    link: "https://github.com/langchain-ai/open-canvas",
    external: true,
  },
  {
    title: "VoltAgent",
    image: "/screenshot/examples/voltagent.png",
    description:
      "TypeScript AI agent framework with an official assistant-ui integration template. Uses useChatRuntime with tool streaming and memory adapters.",
    link: "https://github.com/VoltAgent/voltagent",
    external: true,
  },
  {
    title: "AgentOps — Agent Observability Dashboard",
    image: "/screenshot/examples/agentops.png",
    description:
      "Python SDK for AI agent monitoring. Uses ExternalStoreRuntime to replay and visualize recorded LLM completions.",
    link: "https://github.com/AgentOps-AI/agentops",
    external: true,
  },
  {
    title: "FastAPI + LangGraph",
    image: "/screenshot/examples/fastapi-langgraph.png",
    description:
      "Integration of a FastAPI + LangGraph server with assistant-ui.",
    link: "https://github.com/Yonom/assistant-ui-langgraph-fastapi",
    external: true,
  },
  {
    title: "Wealthfolio — AI Investment Assistant",
    image: "/screenshot/examples/wealthfolio.png",
    description:
      "Desktop portfolio tracker with 11 custom tool UIs, ExternalStoreRuntime, CSV attachments, and thread persistence.",
    link: "https://github.com/afadil/wealthfolio",
    external: true,
  },
  {
    title: "Microsoft Copilot Studio",
    image: "/screenshot/examples/copilot-studio.png",
    description:
      "Official Microsoft sample integrating assistant-ui with Microsoft Copilot Studio via Azure AD authentication.",
    link: "https://github.com/microsoft/CopilotStudioSamples",
    external: true,
  },
  {
    title: "Gram — AI Code Review",
    image: "/screenshot/examples/gram.png",
    description:
      "AI-powered code review tool by Speakeasy. Config-driven AssistantModal with framer-motion animations and thread history.",
    link: "https://github.com/speakeasy-api/gram",
    external: true,
  },
  {
    title: "Stack Auth — Open-Source Auth Platform",
    image: "/screenshot/examples/stack-auth.png",
    description:
      "YC S24 open-source Auth0/Clerk alternative (6.7k stars). Uses useLocalRuntime with ThreadHistoryAdapter for a Vibe Coding assistant inside the auth dashboard.",
    link: "https://github.com/stack-auth/stack",
    external: true,
  },
  {
    title: "ByteChef — AI Workflow Automation",
    image: "/screenshot/examples/bytechef.png",
    description:
      "Open-source AI-native low-code platform. Uses useExternalStoreRuntime with AG-UI protocol, multiple runtime providers, and a published npm SDK.",
    link: "https://github.com/bytechefhq/bytechef",
    external: true,
  },
  {
    title: "OpenOps — FinOps Automation",
    image: "/screenshot/examples/openops.png",
    description:
      "No-code FinOps automation platform (1k stars). Uses useAISDKRuntime with sendAutomaticallyWhen, a BaseToolWrapper collapsible card for all tool UIs, and chain-of-thought Reasoning rendering.",
    link: "https://github.com/openops-cloud/openops",
    external: true,
  },
  {
    title: "Nussknacker — Stream Processing AI",
    image: "/screenshot/examples/nussknacker.png",
    description:
      "Low-code real-time stream processing platform (713 stars). Custom SSE ChatModelAdapter, permission-checked tools via useFrontendAiTool, Redux-driven thread.append(), and tools-as-React-components pattern.",
    link: "https://github.com/TouK/nussknacker",
    external: true,
  },
  {
    title: "Exograph — GraphQL Backend",
    image: "/screenshot/examples/exograph.png",
    description:
      "Rust-based GraphQL/Postgres backend (344 stars). Monaco Editor tool UI for inline query editing, auto-generating thread titles via threadRuntime event system, and MCP client integration.",
    link: "https://github.com/exograph/exograph",
    external: true,
  },
  {
    title: "VerifyWise — AI Governance",
    image: "/screenshot/examples/verifywise.png",
    description:
      "AI compliance platform for EU AI Act/NIST frameworks (237 stars). Full chat UI with MUI components via asChild, context-aware suggestions by page domain, and dynamic chart tool UIs.",
    link: "https://github.com/verifywise-ai/verifywise",
    external: true,
  },
  {
    title: "Adorable — Open Source Lovable",
    image: "/screenshot/examples/adorable.png",
    description:
      "Open-source Lovable clone (682 stars). 13 per-tool card UIs, tool call grouping with PartsGrouped, reasoning support, and lazy repo creation in transport.",
    link: "https://github.com/freestyle-sh/Adorable",
    external: true,
  },
  {
    title: "Cyberdesk — Virtual Desktops for AI",
    image: "/screenshot/examples/cyberdesk.png",
    description:
      "Open-source virtual desktops for AI agents (308 stars). Side-by-side chat + desktop with useChatRuntime and dynamic headers.",
    link: "https://github.com/cyberdesk-hq/cyberdesk",
    external: true,
  },
];

export { INTERNAL_EXAMPLES, COMMUNITY_EXAMPLES };
