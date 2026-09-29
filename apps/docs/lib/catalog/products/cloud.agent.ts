import "server-only";

export const CLOUD_AGENT_PROMPTS = new Map<string, string>([
  [
    "cloud",
    `This product assumes assistant-ui is already installed and rendering a Thread. If it is not, do not scaffold it as a side effect. In a setup session, add it (\`ask "<why>" --product assistant-ui --wait\`; the browser accepts the product and answers at once) and install it first; outside one, stop and tell the user to set up assistant-ui first.

1. Ask which project to use: \`ask "Which Assistant Cloud project should this app use?" --wait\`. The browser lists the projects on the user's account, or takes a Frontend API URL pasted from cloud.assistant-ui.com (Settings › General); the answer is that URL (https://proj-<id>.assistant-api.com). Do not invent one.
2. Write NEXT_PUBLIC_ASSISTANT_BASE_URL=<that url> to .env.local. On Vite, React Router or TanStack Start write VITE_ASSISTANT_BASE_URL=<that url> to .env.local instead, on Expo write EXPO_PUBLIC_ASSISTANT_BASE_URL=<that url> to .env, and on Ink write ASSISTANT_BASE_URL=<that url> to .env.
3. Check the runtime hook. \`useChatRuntime()\` from @assistant-ui/ai-sdk with no \`cloud\` argument picks the URL up from the environment on Next.js. On Vite, React Router, TanStack Start, Expo or Ink, or for other runtimes, construct \`new AssistantCloud({ baseUrl, anonymous: true })\` with baseUrl read from that variable (\`import.meta.env.VITE_ASSISTANT_BASE_URL\` on Vite, React Router and TanStack Start) and pass it as \`cloud\`. On the web, import AssistantCloud from @assistant-ui/react; on Expo and Ink, install assistant-cloud and import it from there. See /docs/cloud/quickstart.md for each runtime.
4. Run \`npx assistant-ui@latest add thread-list\` and render <ThreadList /> next to <Thread /> inside the existing AssistantRuntimeProvider.
5. Restart the dev server so the new environment variable loads.

Verify: send a message, reload the page, and confirm the conversation is still listed with a generated title. If the thread list stays empty, the base URL is missing or the dev server was not restarted.`,
  ],
]);
