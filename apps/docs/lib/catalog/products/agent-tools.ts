import type { CatalogProduct } from "../types";

export const agentTools: CatalogProduct = {
  slug: "agent-tools",
  href: "/components/agent-tools",
  purchase: "cart",
  name: "Agent Tool",
  tagline: "An action the model can call, with its own UI in the thread.",
  description:
    "Choose what a tool should do before adding it to your cart. Add Agent Tool again for each action you need; your coding agent writes its schema, executor, and chat UI into your project during setup.",
  kind: "library",
  audience: "existing assistant-ui apps",
  license: "MIT",
  oss: true,
  glyph: "frame",
  docs: "/docs/tools/defining-tools",
  repo: "https://github.com/assistant-ui/assistant-ui",
  packages: ["@assistant-ui/react", "@assistant-ui/ai-sdk"],
  includes: [
    "A tool schema and executor added to your existing toolkit",
    "A component per tool that renders the call while it runs and once it has a result",
    "Registration on the assistant and in the chat route",
  ],
  requires: ["An assistant-ui app with a chat route on the AI SDK"],
  preview: "tool-call",
  agentMinutes: [4, 9],
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
