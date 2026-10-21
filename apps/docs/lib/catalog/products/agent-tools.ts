import type { CatalogProduct } from "../types";

export const agentTools: CatalogProduct = {
  slug: "agent-tools",
  href: "/components/agent-tools",
  purchase: "cart",
  name: "Agent Tool",
  tagline: "An action the model can call, with its own UI in the thread.",
  description:
    "A tool with a schema, an executor, and a component that renders its calls in the thread. Specify an action for each tool; your coding agent writes it into your existing assistant-ui project.",
  kind: "library",
  audience: "existing assistant-ui apps",
  license: "MIT",
  oss: true,
  glyph: "frame",
  docs: "/docs/tools/defining-tools",
  repo: "https://github.com/assistant-ui/assistant-ui",
  packages: ["@assistant-ui/react", "@assistant-ui/ai-sdk"],
  includes: [
    "A tool schema and executor added to your project toolkit, creating one if needed",
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
