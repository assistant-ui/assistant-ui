import "server-only";

export const ASSISTANT_UI_AGENT_PROMPTS = new Map<string, string>([
  [
    "assistant-ui",
    `Plan first. Detect the app framework, then look for an agent framework and a model provider the project already uses: a chat route on the AI SDK, a Mastra agent, a LangGraph client, provider packages in package.json, a provider key in .env.local. Ask "--preset framework" only when no agent framework is in use, and "--preset llm-provider" only when no provider key is present; ask both at once and keep working, blocking with "wait" only when nothing else can proceed. A framework answer is "<framework>:<language>", for example "ai-sdk:typescript" or "langgraph:python". A model answer is JSON with provider, model and an optional reasoningEffort; the key itself is written for you by "npx agent-checkout <url> env <input-id> <ENV_VAR> --file .env.local" under the variable name you choose, and you never see it.

Then follow the section for the agent framework.

### Vercel AI SDK (ai-sdk:typescript)

Docs: /docs/runtimes/ai-sdk/v7.md

Next.js App Router: run \`npx assistant-ui@latest init --yes\` (the flag is required in a non-interactive shell). It scaffolds:
- components/assistant-ui/elements/thread.aui.tsx
- app/assistant.tsx, which exports <Assistant /> already wrapped in AssistantRuntimeProvider
- app/api/chat/route.ts, an OpenAI backend using @assistant-ui/ai-sdk
If components.json already exists, init aborts; use \`npx assistant-ui@latest add thread\` and follow /docs/runtimes/ai-sdk/v7.md for the runtime and route.

Vite, React Router, or TanStack Start: init does not support these. Follow the manual setup in /docs/installation.md: install @assistant-ui/react, @assistant-ui/ai-sdk, ai@^7, @ai-sdk/react@^4, and the provider package; add \`"@assistant-ui": "https://r.assistant-ui.com/styles/{style}/{name}.json"\` to components.json registries, creating the file first with \`npx shadcn@latest init --defaults --yes\` if it is missing (init needs Tailwind CSS and an \`@/*\` path alias, and names whichever is absent); run \`npx shadcn@latest add @assistant-ui/thread\`. Then write the two files init would have scaffolded:
- The chat route, with that page's POST handler: a resource route in React Router (app/routes/api.chat.ts, with that body in \`export async function action({ request }: Route.ActionArgs)\`, registered in app/routes.ts), a server route in TanStack Start (src/routes/api/chat.ts, under \`server.handlers.POST\`), or a separate server for Vite, which serves no API, with /api proxied to it through \`server.proxy\` in vite.config.ts.
- assistant.tsx (in src/ on Vite and TanStack Start, app/ on React Router), exporting <Assistant />: it creates the runtime with \`useChatRuntime({ transport: new AssistantChatTransport({ api: "/api/chat" }) })\` from @assistant-ui/ai-sdk and renders <Thread /> in a full height container (\`<div className="h-dvh">\`, as init's scaffold does) inside \`<AssistantRuntimeProvider runtime={runtime}>\` from @assistant-ui/react, as that page's "Use it in your app" step shows.

Expo: init does not support it, and the web packages and registry above do not apply. Follow every step of the manual setup in /docs/react-native.md: it installs @assistant-ui/react-native and @assistant-ui/ai-sdk (never add @assistant-ui/react), wires Uniwind, adds the native thread with \`npx assistant-ui@latest add thread\`, creates the runtime hook with useChatRuntime, and renders <Thread /> inside AssistantRuntimeProvider in app/index.tsx. The chat route runs on a server the device can reach; point the transport at its absolute URL.

### Mastra (mastra:typescript)

Docs: /docs/integrations/frameworks/mastra/overview.md

Mastra has no runtime package of its own; the UI talks to it through the AI SDK runtime. Scaffold exactly as for the Vercel AI SDK above, then install \`@mastra/core\` and follow /docs/integrations/frameworks/mastra/full-stack.md: define the agent under mastra/, and replace the body of the chat route from that step with \`agent.stream(messages)\` returned as a UI message stream; the page's "Configure Next.js" step applies to Next.js only. If the user already runs a Mastra server, follow /docs/integrations/frameworks/mastra/separate-server.md instead and point the transport at it.

### LangGraph (langgraph:python or langgraph:typescript)

Docs: /docs/runtimes/langgraph/quickstart.md

Ask the user for the graph server URL and assistant id if a LangGraph server already exists (ask with --wait; never invent them). Otherwise scaffold one in the chosen language with \`langgraph new\` (Python) or \`npm create langgraph\` (TypeScript) beside the app and start it with \`langgraph dev\` on port 2024.

In the app: install @assistant-ui/react, @assistant-ui/react-langgraph and @langchain/langgraph-sdk; add the assistant-ui registry to components.json and run \`npx shadcn@latest add @assistant-ui/thread\`; create lib/chatApi.ts and components/MyAssistant.tsx from the quickstart's manual setup; set the graph URL and assistant id in .env.local, as NEXT_PUBLIC_LANGGRAPH_API_URL and NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID on Next.js, or as VITE_LANGGRAPH_API_URL and VITE_LANGGRAPH_ASSISTANT_ID read through import.meta.env on Vite, React Router and TanStack Start, which expose only VITE_ variables to the browser. On Expo, follow /docs/runtimes/langgraph/quickstart.md?platform=rn instead: it installs @assistant-ui/react-native, takes the thread from /docs/react-native.md, and reads EXPO_PUBLIC_LANGGRAPH_API_URL and EXPO_PUBLIC_LANGGRAPH_ASSISTANT_ID. Configure the graph's model from the provider answer.

### Model provider

Map the model answer (or the provider already in the project) onto the route or graph: install the provider package (@ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google, @openrouter/ai-sdk-provider, @ai-sdk/xai, @ai-sdk/mistral, @ai-sdk/deepseek, @ai-sdk/groq or @ai-sdk/fireworks for the AI SDK and Mastra; the matching langchain-* package for LangGraph), use the answer's model in the chat route or graph, and map reasoningEffort onto the provider's reasoning setting when it is set. Write the key with the plan step's "env <input-id> <ENV_VAR> --file <env file>" command, naming the variable the provider package reads (OPENAI_API_KEY for @ai-sdk/openai, for example) and pointing --file at the env file of the project that runs the model: .env.local beside the chat route, which a standalone server loads itself (for example with \`node --env-file=.env.local\`), or the file the graph's langgraph.json names. Never invent a key or a model name. Restart the dev server after writing the key.

Then render the root component once, on the page the app opens with (app/page.tsx on Next.js, src/App.tsx on Vite, the index route in React Router and TanStack Start, app/index.tsx on Expo): <Assistant /> for the AI SDK and Mastra, <MyAssistant /> for LangGraph. With the AI SDK on Expo, app/index.tsx already renders the thread. That component mounts AssistantRuntimeProvider itself; do not wrap it in another.

Verify: send a message and confirm the reply streams token by token.`,
  ],
]);
