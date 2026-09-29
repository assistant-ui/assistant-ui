import type { CatalogProduct } from "../types";

export const assistantUi: CatalogProduct = {
  slug: "assistant-ui",
  href: "/components/assistant-ui",
  purchase: "setup",
  name: "assistant-ui",
  tagline: "A streaming chat UI wired to the agent framework you already use.",
  description:
    "The Thread component, the runtime that binds it to your backend, and a chat route that streams from your model provider. Pick the Vercel AI SDK, Mastra or LangGraph during setup; everything installs into your project as source you own.",
  kind: "library",
  audience: "new and existing React apps",
  license: "MIT",
  oss: true,
  glyph: "react",
  docs: "/docs/runtimes/pick-a-runtime",
  repo: "https://github.com/assistant-ui/assistant-ui",
  packages: ["@assistant-ui/react", "@assistant-ui/ai-sdk"],
  includes: [
    "Thread, composer, and message components as editable source",
    "A runtime for the Vercel AI SDK, Mastra or LangGraph",
    "A streaming chat route with tool calling",
    "Markdown rendering, attachments, and frontend tools",
  ],
  features: [
    "Replies that stream token by token, with a stop control",
    "Markdown rendering with code blocks",
    "Message editing, with branches to switch between versions",
    "Copy, regenerate, and export to Markdown on every reply",
    "Tool calls rendered in the thread, grouped while they run",
    "Collapsible reasoning",
    "Scrolling that follows the stream, with a jump to the latest message",
  ],
  preview: "thread",
  bundle: [
    "thread",
    "markdown-text",
    "reasoning",
    "tool-fallback",
    "tool-group",
    "attachment",
    "file",
    "image",
    "follow-up-suggestions",
    "tooltip-icon-button",
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
        "Put the key for your model provider into .env.local and restart the dev server.",
    },
    {
      title: "Render the assistant",
      detail:
        "Import Assistant from app/assistant.tsx into your page. The provider, runtime, and transport are already wired.",
    },
  ],
};
