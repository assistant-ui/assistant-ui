import type { CatalogProduct } from "../types";

export const cloud: CatalogProduct = {
  slug: "cloud",
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
        "Add NEXT_PUBLIC_ASSISTANT_BASE_URL to .env.local. The React runtimes create an anonymous cloud client on their own once it is set.",
    },
    {
      title: "Add the thread list",
      detail:
        "Install the ThreadList component next to your Thread and render both inside the existing AssistantRuntimeProvider.",
      command: "npx assistant-ui@latest add thread-list",
    },
  ],
  checkout: {
    steps: [
      {
        id: "cloud/project",
        title: "Create an Assistant Cloud project",
        detail:
          "Sign in at cloud.assistant-ui.com and create a project; the user does this in the browser.",
      },
      {
        id: "cloud/keys",
        title: "Add the project URL and API key",
        detail:
          "Write NEXT_PUBLIC_ASSISTANT_BASE_URL and ASSISTANT_API_KEY to .env.local.",
      },
      {
        id: "cloud/runtime",
        title: "Turn on cloud persistence",
        detail:
          "Pass the cloud client to the runtime and render the thread list.",
      },
    ],
  },
  agent: `This product assumes assistant-ui is already installed and rendering a Thread. If it is not, install "assistant-ui for AI SDK" first.

1. Ask the user for the project's Frontend API URL from cloud.assistant-ui.com (Settings › General; it looks like https://proj-<id>.assistant-api.com). Do not invent one.
2. Write NEXT_PUBLIC_ASSISTANT_BASE_URL=<that url> to .env.local (EXPO_PUBLIC_ASSISTANT_BASE_URL on Expo, ASSISTANT_BASE_URL on Ink).
3. Check the runtime hook. \`useChatRuntime()\` from @assistant-ui/ai-sdk with no \`cloud\` argument picks the URL up from the environment on the web. On Expo or Ink, or for other runtimes, construct \`new AssistantCloud({ baseUrl, anonymous: true })\` from the assistant-cloud package and pass it as \`cloud\`; see /docs/cloud/quickstart.md for each runtime.
4. Run \`npx assistant-ui@latest add thread-list\` and render <ThreadList /> next to <Thread /> inside the existing AssistantRuntimeProvider.
5. Restart the dev server so the new environment variable loads.

Verify: send a message, reload the page, and confirm the conversation is still listed with a generated title. If the thread list stays empty, the base URL is missing or the dev server was not restarted.`,
};
