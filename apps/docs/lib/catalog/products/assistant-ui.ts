import type { CatalogProduct } from "../types";

export const assistantUi: CatalogProduct = {
  slug: "assistant-ui",
  href: "/shop/assistant-ui",
  purchase: "setup",
  name: "assistant-ui",
  tagline: "A streaming chat UI wired to the agent framework you already use.",
  description:
    "The Thread component, the runtime that binds it to your backend, and a chat route that streams from your model provider. Pick the Vercel AI SDK, Mastra or LangGraph at checkout; everything installs into your project as source you own.",
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
  agent: `Plan first. Detect the app framework, then look for an agent framework and a model provider the project already uses: a chat route on the AI SDK, a Mastra agent, a LangGraph client, provider packages in package.json, a provider key in .env.local. Ask "--preset framework" only when no agent framework is in use, and "--preset llm-provider" only when no provider key is present; ask both at once and keep working, blocking with "wait" only when nothing else can proceed. A framework answer is "<framework>:<language>", for example "ai-sdk:typescript" or "langgraph:python". A model answer is JSON with provider, model and an optional reasoningEffort; the key itself is written for you by "npx agent-checkout <url> env <input-id> <ENV_VAR> --file .env.local" under the variable name you choose, and you never see it.

Then follow the section for the agent framework.

### Vercel AI SDK (ai-sdk:typescript)

Docs: /docs/runtimes/ai-sdk/v7.md

Next.js App Router: run \`npx assistant-ui@latest init --yes\` (the flag is required in a non-interactive shell). It scaffolds:
- components/assistant-ui/elements/thread.aui.tsx
- app/assistant.tsx, which exports <Assistant /> already wrapped in AssistantRuntimeProvider
- app/api/chat/route.ts, an OpenAI backend using @assistant-ui/ai-sdk
If components.json already exists, init aborts; use \`npx assistant-ui@latest add thread\` and follow /docs/runtimes/ai-sdk/v7.md for the runtime and route.

Vite, React Router, TanStack Start, or Expo: init does not support these. Follow the manual setup in /docs/installation.md: install @assistant-ui/react, @assistant-ui/ai-sdk, ai@^7, @ai-sdk/react@^4, and the provider package; add \`"@assistant-ui": "https://r.assistant-ui.com/{name}.json"\` to components.json registries; run \`npx shadcn@latest add @assistant-ui/thread\`; host the chat route on a server the app can reach.

### Mastra (mastra:typescript)

Docs: /docs/integrations/frameworks/mastra/overview.md

Mastra has no runtime package of its own; the UI talks to it through the AI SDK runtime. Scaffold exactly as for the Vercel AI SDK above, then install \`@mastra/core\` and follow /docs/integrations/frameworks/mastra/full-stack.md: define the agent under mastra/, and replace the body of app/api/chat/route.ts with \`agent.stream(messages)\` returned as a UI message stream. If the user already runs a Mastra server, follow /docs/integrations/frameworks/mastra/separate-server.md instead and point the transport at it.

### LangGraph (langgraph:python or langgraph:typescript)

Docs: /docs/runtimes/langgraph/quickstart.md

Ask the user for the graph server URL and assistant id if a LangGraph server already exists (ask with --wait; never invent them). Otherwise scaffold one in the chosen language with \`langgraph new\` (Python) or \`npm create langgraph\` (TypeScript) beside the app and start it with \`langgraph dev\` on port 2024.

In the app: install @assistant-ui/react, @assistant-ui/react-langgraph and @langchain/langgraph-sdk; add the assistant-ui registry to components.json and run \`npx shadcn@latest add @assistant-ui/thread\`; create lib/chatApi.ts and components/MyAssistant.tsx from the quickstart's manual setup; set NEXT_PUBLIC_LANGGRAPH_API_URL and NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID in .env.local. Configure the graph's model from the provider answer.

### Model provider

Map the model answer (or the provider already in the project) onto the route or graph: install the provider package (@ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google, @openrouter/ai-sdk-provider, @ai-sdk/xai, @ai-sdk/mistral, @ai-sdk/deepseek, @ai-sdk/groq or @ai-sdk/fireworks for the AI SDK and Mastra; the matching langchain-* package for LangGraph), use the answer's model in the chat route or graph, run "env <input-id> --file .env.local" to write the key, and map reasoningEffort onto the provider's reasoning setting when it is set. Never invent a key or a model name. Restart the dev server after writing the key.

Then render <Assistant /> (or <MyAssistant />) in the root page. Do not rebuild the provider.

Verify: send a message and confirm the reply streams token by token.`,
};
