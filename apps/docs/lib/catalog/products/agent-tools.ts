import type { CatalogProduct } from "../types";

export const agentTools: CatalogProduct = {
  slug: "agent-tools",
  href: "/shop/agent-tools",
  purchase: "cart",
  name: "Agent tools",
  tagline: "Tools the model can call, each with its own UI in the thread.",
  description:
    "A toolkit with a schema, an executor, and a component that renders each call in the chat. Say what the tools should do at checkout; your agent writes the rest into your project.",
  kind: "library",
  audience: "existing assistant-ui apps",
  license: "MIT",
  oss: true,
  glyph: "frame",
  docs: "/docs/tools/defining-tools",
  repo: "https://github.com/assistant-ui/assistant-ui",
  packages: ["@assistant-ui/react", "@assistant-ui/ai-sdk"],
  includes: [
    "A toolkit file with each tool's schema and executor",
    "A component per tool that renders the call while it runs and once it has a result",
    "Registration on the assistant and in the chat route",
  ],
  requires: ["An assistant-ui app with a chat route on the AI SDK"],
  agentMinutes: [5, 15],
  steps: [
    {
      title: "Enable the compiler",
      detail:
        "Wrap next.config.ts with withAui from @assistant-ui/next, or add the aui() plugin from @assistant-ui/vite.",
    },
    {
      title: "Write the toolkit",
      detail:
        'Create app/toolkit.tsx starting with "use generative": one defineToolkit entry per tool, with a zod schema, an execute, and a render.',
    },
    {
      title: "Register it",
      detail:
        "Pass the toolkit to AssistantRuntimeProvider through AuiConfig({ tools: Tools({ toolkit }) }) and expose it in the chat route with AISDKToolkit.",
    },
  ],
};
