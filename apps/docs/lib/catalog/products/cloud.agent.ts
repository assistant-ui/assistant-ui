import "server-only";

export const CLOUD_AGENT_PROMPTS = new Map<string, string>([
  [
    "cloud",
    `This product assumes assistant-ui is already installed and rendering a Thread. If it is not, do not scaffold it as a side effect. In a checkout session, propose adding it (\`ask "<why>" --product assistant-ui --wait\`) and install it first once the user accepts; otherwise stop and tell the user to set up assistant-ui first.

1. Ask the user for the project's Frontend API URL from cloud.assistant-ui.com (Settings › General; it looks like https://proj-<id>.assistant-api.com). Do not invent one.
2. Write NEXT_PUBLIC_ASSISTANT_BASE_URL=<that url> to .env.local. On Vite, React Router or TanStack Start write VITE_ASSISTANT_BASE_URL=<that url> to .env.local instead, on Expo write EXPO_PUBLIC_ASSISTANT_BASE_URL=<that url> to .env, and on Ink write ASSISTANT_BASE_URL=<that url> to .env.
3. Check the runtime hook. \`useChatRuntime()\` from @assistant-ui/ai-sdk with no \`cloud\` argument picks the URL up from the environment on Next.js. On Vite, React Router, TanStack Start, Expo or Ink, or for other runtimes, construct \`new AssistantCloud({ baseUrl, anonymous: true })\` with baseUrl read from that variable (\`import.meta.env.VITE_ASSISTANT_BASE_URL\` on Vite, React Router and TanStack Start) and pass it as \`cloud\`. On the web, import AssistantCloud from @assistant-ui/react; on Expo and Ink, install assistant-cloud and import it from there. See /docs/cloud/quickstart.md for each runtime.
4. Run \`npx assistant-ui@latest add thread-list\` and render <ThreadList /> next to <Thread /> inside the existing AssistantRuntimeProvider.
5. Restart the dev server so the new environment variable loads.

Verify: send a message, reload the page, and confirm the conversation is still listed with a generated title. If the thread list stays empty, the base URL is missing or the dev server was not restarted.`,
  ],
]);
