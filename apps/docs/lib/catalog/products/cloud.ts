import type { CatalogProduct } from "../types";

export const cloud: CatalogProduct = {
  slug: "cloud",
  href: "/shop/cloud",
  purchase: "cart",
  name: "Assistant Cloud",
  tagline:
    "Persistence, thread history, and titles for an existing assistant-ui app.",
  description:
    "A hosted backend that saves conversations as they stream, lists them in a thread list, and titles them automatically. Your model and chat route stay where they are; the cloud sits beside them.",
  kind: "service",
  audience: "existing assistant-ui apps",
  license: "Free tier",
  oss: false,
  glyph: "cloud",
  docs: "/docs/cloud/quickstart",
  packages: ["assistant-cloud"],
  includes: [
    "Thread persistence that saves during streaming",
    "A ThreadList component with rename, archive, and delete",
    "Auto-generated conversation titles",
    "Anonymous sessions, with auth providers when you need identity",
  ],
  requires: [
    "An assistant-ui app on the AI SDK, LangGraph, or another runtime",
    "A project at cloud.assistant-ui.com",
  ],
  agentMinutes: [5, 10],
  steps: [
    {
      title: "Create a cloud project",
      detail:
        "Sign in at cloud.assistant-ui.com, create a project, and copy its Frontend API URL from Settings › General.",
    },
    {
      title: "Set the base URL",
      detail:
        "Add NEXT_PUBLIC_ASSISTANT_BASE_URL to .env.local. On Next.js the React runtimes create an anonymous cloud client on their own once it is set; other frameworks pass a client to the runtime explicitly.",
    },
    {
      title: "Add the thread list",
      detail:
        "Install the ThreadList component next to your Thread and render both inside the existing AssistantRuntimeProvider.",
      command: "npx assistant-ui@latest add thread-list",
    },
  ],
};
