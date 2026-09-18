import type { CatalogProduct } from "../types";

export const aiSdk: CatalogProduct = {
  slug: "ai-sdk",
  name: "assistant-ui for AI SDK",
  tagline: "A streaming chat UI on top of the Vercel AI SDK.",
  description:
    "The Thread component, the runtime that binds it to useChat, and a chat route that streams from your model. Everything installs into your project as source you own.",
  kind: "library",
  audience: "new and existing React apps",
  license: "MIT",
  oss: true,
  glyph: "react",
  docs: "/docs/runtimes/ai-sdk/v7",
  repo: "https://github.com/assistant-ui/assistant-ui",
  packages: [
    "@assistant-ui/react",
    "@assistant-ui/ai-sdk",
    "ai",
    "@ai-sdk/react",
  ],
  includes: [
    "Thread, composer, and message components as editable source",
    "useChatRuntime wired to the AI SDK's useChat",
    "A streaming /api/chat route with tool calling",
    "Markdown rendering, attachments, and frontend tools",
  ],
  requires: [
    "React 18 or newer",
    "Tailwind CSS v3 or v4",
    "A model provider key",
  ],
  agentMinutes: [5, 15],
  steps: [
    {
      title: "Scaffold the UI and runtime",
      detail:
        "Adds the Thread component under components/assistant-ui, an Assistant provider, and the chat route to a Next.js App Router project.",
      command: "npx assistant-ui@latest init --yes",
    },
    {
      title: "Add a provider key",
      detail:
        "Put OPENAI_API_KEY (or the key for the provider you swapped in) into .env.local and restart the dev server.",
    },
    {
      title: "Render the assistant",
      detail:
        "Import Assistant from app/assistant.tsx into your page. The provider, runtime, and transport are already wired.",
    },
  ],
  checkout: {
    steps: [
      {
        id: "ai-sdk/packages",
        title: "Install the assistant-ui packages",
        detail:
          "@assistant-ui/react, @assistant-ui/ai-sdk, ai, @ai-sdk/react and a provider package.",
      },
      {
        id: "ai-sdk/shadcn",
        title: "Set up the shadcn components",
        detail:
          "Make sure shadcn is installed and working, then add the assistant-ui registry and the thread component.",
      },
      {
        id: "ai-sdk/assemble",
        title: "Put it all together",
        detail:
          "Wire the runtime, the chat route and the provider key, render the assistant, and confirm a reply streams.",
      },
    ],
    questions: [
      {
        prompt: "Where should assistant-ui live?",
        placeholder: "components/assistant-ui, or a page or route",
        optional: true,
      },
    ],
  },
  agent: `Detect the framework before running anything.

Next.js App Router: run \`npx assistant-ui@latest init --yes\` (the flag is required in a non-interactive shell). It scaffolds:
- components/assistant-ui/elements/thread.aui.tsx
- app/assistant.tsx, which exports <Assistant /> already wrapped in AssistantRuntimeProvider
- app/api/chat/route.ts, an OpenAI backend using @assistant-ui/ai-sdk
If components.json already exists, init aborts; use \`npx assistant-ui@latest add thread\` and follow /docs/runtimes/ai-sdk/v7.md for the runtime and route.

Vite, React Router, TanStack Start, or Expo: init does not support these. Follow the manual setup in /docs/installation.md: install @assistant-ui/react, @assistant-ui/ai-sdk, ai@^7, @ai-sdk/react@^4, and a provider package; add \`"@assistant-ui": "https://r.assistant-ui.com/{name}.json"\` to components.json registries; run \`npx shadcn@latest add @assistant-ui/thread\`; host the chat route on a server the app can reach.

Then:
- Write the provider key to .env.local and restart the dev server.
- Render <Assistant /> from @/app/assistant in the root page. Do not rebuild the provider.
- For a provider other than OpenAI, swap the model in the chat route and install its @ai-sdk/* package.

Verify: send a message and confirm the reply streams token by token.`,
};
