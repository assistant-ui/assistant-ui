import type { CatalogItem } from "../types";

type Guide = Pick<
  CatalogItem,
  "slug" | "name" | "tagline" | "docs" | "agentMinutes" | "agent"
>;

/** A docs guide a coding agent can carry out; the guide page is its product page. */
const guide = (entry: Guide): CatalogItem => ({
  ...entry,
  href: entry.docs,
  purchase: "cart",
  glyph: "examples",
});

const needsRuntime = `This guide assumes assistant-ui is already installed and an AssistantRuntimeProvider renders a thread. If it is not, stop and tell the user to set up assistant-ui first; do not scaffold a runtime as a side effect.`;

const needsAiSdkRoute = `This guide changes the server route that calls the AI SDK (usually app/api/chat/route.ts). Find it first. If the backend is not an AI SDK route handler (LangGraph, Mastra server, custom API), stop and tell the user this guide covers the AI SDK path only.`;

const registryStep = `Check components.json. If it has no "@assistant-ui" registry, add \`"@assistant-ui": "https://r.assistant-ui.com/{name}.json"\` under "registries". If components.json is missing, run \`npx shadcn@latest init --yes\` first.`;

const packageManager = `Use the project's package manager, detected from its lockfile (npm install, pnpm add, yarn add, or bun add).`;

export const GUIDE_PRODUCTS: readonly CatalogItem[] = [
  guide({
    slug: "guides/attachments",
    name: "File attachments",
    tagline:
      "Users attach images and files to messages by picker, drag-drop, or paste.",
    docs: "/docs/guides/attachments",
    agentMinutes: [3, 10],
    agent: `${needsRuntime}

1. ${registryStep}
2. Run \`npx shadcn@latest add @assistant-ui/attachment --yes\`.
3. Find the runtime hook. \`useChatRuntime\` from @assistant-ui/ai-sdk needs no adapter: it accepts every file type as a base64 data URL. For \`useLocalRuntime\` or another runtime, pass \`adapters.attachments\`; the docs page above shows \`new CompositeAttachmentAdapter([new SimpleImageAttachmentAdapter(), new SimpleTextAttachmentAdapter()])\`, all exported from @assistant-ui/react.
4. Most models accept only image input. Read the model id in the chat route; unless it clearly takes other file types, restrict uploads with \`adapters: { attachments: new SimpleImageAttachmentAdapter() }\` and tell the user you did.
5. If the project renders the registry \`Thread\`, the attachment UI is already in place. If it composes its own composer or user message, follow /elements/attachment: wrap the input in \`ComposerPrimitive.AttachmentDropzone\`, render \`ComposerAttachments\` and \`ComposerAddAttachment\` in the composer, and \`UserMessageAttachments\` in the user message.
6. With \`useLocalRuntime\`, the ChatModelAdapter must forward image parts to the backend; see "With LocalRuntime" on the docs page.

Verify: attach a small PNG, send it with "describe this image", and confirm the tile shows in the sent message and the reply describes the image. An API error on send means the model does not accept that file type.`,
  }),
  guide({
    slug: "guides/speech",
    name: "Text-to-speech",
    tagline: "A read-aloud button on every assistant message.",
    docs: "/docs/guides/speech",
    agentMinutes: [3, 8],
    agent: `${needsRuntime}

1. Find the runtime hook (for example \`useChatRuntime\`) and add \`adapters: { speech: new WebSpeechSynthesisAdapter() }\`, importing \`WebSpeechSynthesisAdapter\` from @assistant-ui/react. Keep any adapters already there.
2. Use the browser adapter unless the user asked for a TTS provider. For a provider, copy \`CustomTTSAdapter\` from the docs page above into lib/custom-tts-adapter.ts, wire \`new CustomTTSAdapter("/api/tts")\`, and ask the user which provider and key to use for the /api/tts route; keep the key server-side and never invent one.
3. The default action bar has no speech button. In the assistant message action bar (usually components/assistant-ui/elements/thread.aui.tsx), add \`ActionBarPrimitive.Speak\` inside \`<AuiIf condition={(s) => s.message.speech == null}>\` and \`ActionBarPrimitive.StopSpeaking\` inside \`<AuiIf condition={(s) => s.message.speech != null}>\`, as the docs page shows. \`AuiIf\` and \`ActionBarPrimitive\` come from @assistant-ui/react; the icons in the docs come from lucide-react.
4. Match the styling of the neighboring action bar buttons instead of leaving bare icons.

Verify: send a message, click the speak button on the reply, and confirm audio plays and the button turns into a stop button. A disabled button means the speech adapter did not reach the runtime.`,
  }),
  guide({
    slug: "guides/dictation",
    name: "Voice dictation",
    tagline: "A microphone button that transcribes speech into the composer.",
    docs: "/docs/guides/dictation",
    agentMinutes: [3, 12],
    agent: `${needsRuntime}

1. Find the runtime hook (for example \`useChatRuntime\`) and add \`adapters: { dictation: new WebSpeechDictationAdapter() }\`, importing \`WebSpeechDictationAdapter\` from @assistant-ui/react. Keep any adapters already there. It works in Chrome, Edge, and Safari.
2. Use the browser adapter unless the user asked for server-side transcription. For that path, copy the \`app/api/transcribe/route.ts\` route and \`ServerDictationAdapter\` from "Server-side transcription" on the docs page above, and wire \`new ServerDictationAdapter("/api/transcribe")\`. The route uses \`transcribe\` from the ai package with a provider model; reuse the provider the chat route already uses and ask the user before adding a new provider or key.
3. In the composer (usually components/assistant-ui/elements/thread.aui.tsx), add \`ComposerPrimitive.Dictate\` inside \`<AuiIf condition={(s) => s.composer.dictation == null}>\` and \`ComposerPrimitive.StopDictation\` inside \`<AuiIf condition={(s) => s.composer.dictation != null}>\`, next to the send button, as the docs page shows. Both come from @assistant-ui/react.
4. Match the styling of the neighboring composer buttons.

Verify: in Chrome, click the microphone, allow access, speak, and confirm the words land in the composer input. A disabled button means the dictation adapter did not reach the runtime; no transcript in Firefox is expected with the browser adapter.`,
  }),
  guide({
    slug: "guides/latex",
    name: "LaTeX math",
    tagline: "Render LaTeX equations in chat messages with KaTeX.",
    docs: "/docs/guides/latex",
    agentMinutes: [3, 8],
    agent: `${needsRuntime}

1. Detect the markdown renderer. If messages render through \`MarkdownTextPrimitive\` from @assistant-ui/react-markdown (usually components/assistant-ui/elements/markdown-text.tsx), follow the react-markdown path. If they render through \`StreamdownTextPrimitive\`, follow the Streamdown path.
2. react-markdown path: install \`katex rehype-katex remark-math\`. Streamdown path: install \`@streamdown/math katex\`. ${packageManager}
3. Add \`import "katex/dist/katex.min.css";\` to the root layout (app/layout.tsx on Next.js).
4. react-markdown path: in markdown-text.tsx, add \`remarkMath\` from remark-math to \`remarkPlugins\` and \`rehypeKatex\` from rehype-katex to \`rehypePlugins\`, keeping the plugins already there. Streamdown path: pass \`plugins={{ math }}\` with \`math\` from @streamdown/math, merged with any existing plugins.
5. Models often emit \\( \\) and \\[ \\] delimiters. Pass \`preprocess={normalizeMathDelimiters}\`; the helper is exported from @assistant-ui/react-markdown and from @assistant-ui/react-streamdown.
6. If the app discusses prices, compose \`escapeCurrencyDollars\` as the docs page above shows so "$5 ... $10" is not parsed as math.

Verify: ask the assistant to "write the quadratic formula in LaTeX" and confirm a typeset equation renders. Raw dollar signs mean the plugins are not applied; unstyled, duplicated symbols mean the KaTeX CSS import is missing.`,
  }),
  guide({
    slug: "guides/streamdown",
    name: "Streamdown renderer",
    tagline:
      "Replace react-markdown with Streamdown for built-in Shiki, KaTeX, and Mermaid.",
    docs: "/docs/guides/streamdown",
    agentMinutes: [5, 12],
    agent: `${needsRuntime} This replaces the react-markdown renderer; it needs Tailwind v4.

1. Install \`@assistant-ui/react-streamdown streamdown\`. ${packageManager}
2. Ask the user which optional plugins they want if they have not said: \`@streamdown/code\` (Shiki), \`@streamdown/math\` plus \`katex\`, \`@streamdown/mermaid\`, \`@streamdown/cjk\`. Default to code only.
3. In the global stylesheet that has \`@import "tailwindcss";\`, add \`@source "../node_modules/streamdown/dist/*.js";\` and one \`@source\` line per installed plugin, as the "CSS setup" section of the docs page above lists. Fix the relative path so it reaches the node_modules that holds the packages (the workspace root in a monorepo).
4. Create a \`StreamdownText\` component that renders \`<StreamdownTextPrimitive plugins={{ ... }} />\` from @assistant-ui/react-streamdown with the installed plugins. With the math plugin, also import "katex/dist/katex.min.css".
5. Find where assistant text parts render (the \`MarkdownText\` usage in the thread component) and render \`StreamdownText\` there instead. If the project customized \`SyntaxHighlighter\` or \`CodeHeader\`, pass them through \`components\` as "Migration from react-markdown" shows. Leave the old markdown-text file in place and tell the user it is now unused.

Verify: ask for "a TypeScript code block and a table" and confirm highlighted code with working copy buttons. Buttons with no padding mean a missing or wrong \`@source\` path.`,
  }),
  guide({
    slug: "guides/suggestions",
    name: "Suggested prompts",
    tagline:
      "Starter prompts on the empty thread, with optional generated follow-ups.",
    docs: "/docs/guides/suggestions",
    agentMinutes: [3, 10],
    agent: `${needsRuntime}

1. Ask the user for 3 to 6 starter prompts if they have not given any; otherwise derive them from what the app's assistant does and say which you chose.
2. In the component that renders AssistantRuntimeProvider, build \`const config = AuiConfig({ suggestions: Suggestions([...]) })\` with \`AuiConfig\` and \`Suggestions\` from @assistant-ui/react, and pass \`config={config}\` to AssistantRuntimeProvider. If a config already exists, add the \`suggestions\` key to it instead of creating a second one. Use the \`{ title, label, prompt }\` object form when the button text should differ from the prompt.
3. The registry \`Thread\` already renders suggestions on the welcome screen. Look for hardcoded \`ThreadPrimitive.Suggestion\` elements or a static suggestions array in the thread component and replace them with \`<ThreadPrimitive.Suggestions>\` as the docs page above shows, so the list is not duplicated.
4. Only if the user asked for follow-up suggestions after each reply: on \`useChatRuntime\` or \`useLocalRuntime\`, pass \`adapters: { suggestion: createSuggestionAdapter({ complete }) }\` and add the /api/suggestions route from the docs page, using the model the chat route already uses. A static \`Suggestions(...)\` config overrides runtime suggestions, so render follow-ups from \`thread.suggestions\` as "Rendering runtime suggestions" shows.

Verify: open a new thread, confirm the prompts show on the empty state, click one, and confirm it sends and the suggestions disappear. If the old prompts still show, the thread component still hardcodes them.`,
  }),
  guide({
    slug: "guides/mentions",
    name: "@-mentions",
    tagline:
      "Type @ in the composer to pick a tool or custom item and send it as a directive.",
    docs: "/docs/guides/mentions",
    agentMinutes: [5, 15],
    agent: `${needsRuntime} The mention APIs are prefixed \`unstable_\`; tell the user.

1. ${registryStep}
2. Run \`npx shadcn@latest add @assistant-ui/composer-trigger-popover @assistant-ui/directive-text --yes\`.
3. In the project's composer (usually components/assistant-ui/elements/thread.aui.tsx), wrap \`ComposerPrimitive.Root\` in \`ComposerPrimitive.Unstable_TriggerPopoverRoot\`. If a slash-command trigger already added that wrapper, reuse it.
4. Inside the composer root, render a trigger: \`const mention = unstable_useMentionAdapter(); return <ComposerTriggerPopover char="@" {...mention} />;\`. With no options it lists the tools registered in model context. If the user wants to mention users, documents, or other items, pass \`items\` or \`categories\` as "Built-in Mention Adapter" on the docs page above shows; for a server search use \`unstable_useLiveCompletionAdapter\`. Use the project's real data source and ask the user when none is obvious.
5. Render sent mentions as chips: follow /elements/directive-text to register \`DirectiveText\` as the \`Text\` component for user messages.
6. The backend receives \`:type[label]{name=id}\` text. If the user wants the server to act on mentions, add \`parseMentions\` from "Processing Mentions on the Backend" to the chat route.

Verify: type @ in the composer, confirm the popover lists items, pick one with Enter, send, and confirm the user message shows a chip instead of raw \`:tool[...]\` text. An empty popover with the default adapter means no tools are registered.`,
  }),
  guide({
    slug: "guides/slash-commands",
    name: "Slash commands",
    tagline:
      "Type / in the composer to open a command palette that runs your callbacks.",
    docs: "/docs/guides/slash-commands",
    agentMinutes: [5, 15],
    agent: `${needsRuntime} The slash-command APIs are prefixed \`unstable_\`; tell the user.

1. Ask the user which commands they want and what each should do, if they have not said. Do not ship the docs' \`console.log\` placeholders as the final commands.
2. ${registryStep}
3. Run \`npx shadcn@latest add @assistant-ui/composer-trigger-popover --yes\`.
4. In the project's composer (usually components/assistant-ui/elements/thread.aui.tsx), wrap \`ComposerPrimitive.Root\` in \`ComposerPrimitive.Unstable_TriggerPopoverRoot\`. If a mention trigger already added that wrapper, reuse it.
5. Define \`const SLASH_COMMANDS: readonly Unstable_SlashCommand[]\` at module scope with \`id\`, \`description\`, optional \`icon\`, and \`execute\`. Inside the composer root, render \`const slash = unstable_useSlashCommandAdapter({ commands: SLASH_COMMANDS }); return <ComposerTriggerPopover char="/" {...slash} />;\`. Both names come from @assistant-ui/react.
6. Pass \`removeOnExecute: true\` for commands that act immediately and should not leave a chip in the message. Pass \`iconMap\` and \`fallbackIcon\` with lucide-react icons if commands set \`icon\`.

Verify: type / in the composer, confirm the popover lists the commands, pick one with Enter, and confirm its \`execute\` effect happens. If nothing opens, the composer is not inside \`Unstable_TriggerPopoverRoot\`.`,
  }),
  guide({
    slug: "guides/chain-of-thought",
    name: "Chain of thought",
    tagline:
      "Group reasoning and tool calls into one collapsible thinking section.",
    docs: "/docs/guides/chain-of-thought",
    agentMinutes: [5, 12],
    agent: `${needsRuntime} Reasoning parts arrive through the AI SDK reasoning stream; on LangGraph the grouping does not activate on its own, so stop and show the user the "LangGraph" section of the docs page above instead.

1. ${registryStep}
2. The docs snippet imports reasoning.aui, tool-group.aui, tool-fallback.aui, and markdown-text from components/assistant-ui/elements. Add the ones the project lacks: \`npx shadcn@latest add @assistant-ui/reasoning @assistant-ui/tool-group @assistant-ui/tool-fallback --yes\`.
3. In the assistant message component (usually in components/assistant-ui/elements/thread.aui.tsx), replace \`MessagePrimitive.Parts\` with \`MessagePrimitive.GroupedParts\` using \`groupBy={groupPartByType({ reasoning: ["group-chainOfThought", "group-reasoning"], "tool-call": ["group-chainOfThought", "group-tool"] })}\` and the render switch from the docs page. Keep the project's existing text, tool, and other part renderers inside that switch; do not drop cases the old component handled.
4. Do not use the legacy \`components.ChainOfThought\` prop or \`ChainOfThoughtPrimitive\` for new code.
5. Check the model in the chat route. If it is not a reasoning model, tell the user the section only appears with one and ask before changing the model.

Verify: with a reasoning model, ask a multi-step question and confirm a collapsible reasoning section streams above the answer and consecutive tool calls collapse into one group. No section means the model emits no reasoning parts.`,
  }),
  guide({
    slug: "guides/resumable-streams",
    name: "Resumable streams",
    tagline:
      "A response keeps streaming after a reload or dropped connection and the client picks it back up.",
    docs: "/docs/guides/resumable-streams",
    agentMinutes: [10, 20],
    agent: `${needsRuntime} It covers the AI SDK path: \`useChatRuntime\` on the client and a \`streamText\` route on the server. For another runtime, stop and tell the user.

1. Server: create lib/resumable-context.ts exporting \`resumableContext = createResumableStreamContext({ store })\` with \`createInMemoryResumableStreamStore()\`, both from assistant-stream/resumable. Add the \`assistant-stream\` package if the project does not depend on it.
2. In the existing chat route, keep the model, tools, and system prompt, and wrap the response as the docs page above shows: \`resumableContext.run(streamId, () => result.toUIMessageStreamResponse().body!)\`, returned with the \`RESUMABLE_STREAM_ID_HEADER\` header. Add the GET route at app/api/chat/resume/[streamId]/route.ts. For a project with an untouched default chat route, \`npx shadcn@latest add @assistant-ui/ai-sdk-backend-resumable --yes\` drops both routes in (needs the "@assistant-ui" registry \`"https://r.assistant-ui.com/{name}.json"\` in components.json); never let it overwrite a customized route.
3. Client: build \`new AssistantChatTransport({ api: "/api/chat", resumable: { storage: createResumableSessionStorage(), resumeApi: (streamId) => \`/api/chat/resume/\${streamId}\` } })\` in a \`useMemo\` and pass it as \`transport\` to \`useChatRuntime\`, with \`onResumeError\`. All three come from @assistant-ui/ai-sdk.
4. If the app renders a thread list or passes \`cloud\`, use the per-thread storage key from "Multiple threads" instead of one shared key.
5. On Vercel or Cloudflare, pass \`waitUntil: after\` (from next/server) to \`createResumableStreamContext\`.
6. Tell the user the in-memory store is for development. For production ask for a REDIS_URL and use the Redis store from "Storage choices", and point out the resume route needs an auth check ("Production checklist").

Verify: ask for a long answer, reload the tab mid-stream, and confirm the same response continues. A 404 from the resume route means the server restarted or the stream id header was not returned.`,
  }),
  guide({
    slug: "guides/devtools",
    name: "DevTools",
    tagline:
      "An in-browser panel for inspecting runtime state, model context, and events in development.",
    docs: "/docs/devtools",
    agentMinutes: [2, 5],
    agent: `${needsRuntime}

1. Install \`@assistant-ui/react-devtools\`. ${packageManager}
2. In the component that renders AssistantRuntimeProvider, import \`DevToolsModal\` from @assistant-ui/react-devtools and render \`<DevToolsModal />\` as a child of the provider, next to the existing children. Do not wrap it in a NODE_ENV check; it is stripped from production builds on its own.
3. If the app has more than one AssistantRuntimeProvider, mount it in the one that wraps the main chat and tell the user.

Verify: start the dev server, open the chat page, and confirm the DevTools launcher shows in the lower-right corner; open it, send a message, and confirm events appear. No launcher means the modal is rendered outside AssistantRuntimeProvider or the page is a production build.`,
  }),
  guide({
    slug: "guides/langfuse",
    name: "Langfuse tracing",
    tagline:
      "One Langfuse trace per chat turn, with LLM and tool-call spans, via OpenTelemetry.",
    docs: "/docs/integrations/observability/langfuse",
    agentMinutes: [5, 12],
    agent: `${needsAiSdkRoute}

1. Ask the user for LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, and their region's LANGFUSE_BASE_URL (https://cloud.langfuse.com for EU, https://us.cloud.langfuse.com for US, or a self-hosted URL). Write them to .env.local. Never invent keys.
2. Install \`@langfuse/tracing @langfuse/otel @opentelemetry/sdk-node\`. ${packageManager}
3. Create instrumentation.ts at the project root (or src/ if the app lives there) exactly as the docs page above shows: export \`langfuseSpanProcessor = new LangfuseSpanProcessor()\` and start a \`NodeSDK\` with it inside \`register()\`, skipping when \`process.env.NEXT_RUNTIME !== "nodejs"\`. If an instrumentation file exists, add the span processor to it. On Next.js 14 or earlier also set \`experimental.instrumentationHook = true\`.
4. In the chat route, add \`experimental_telemetry: { isEnabled: true }\` to \`streamText\` and wrap the call in \`propagateAttributes({ traceName, userId, sessionId }, async () => streamText(...))\` from @langfuse/tracing. Take \`userId\` from the project's auth and \`sessionId\` from the thread id when the code has them; omit them rather than shipping placeholder strings.
5. If the app deploys to a serverless platform, call \`await langfuseSpanProcessor.forceFlush()\` as the "Serverless flush" note describes.
6. Restart the dev server so instrumentation.ts and the new environment variables load.

Verify: send a message and confirm a trace named after \`traceName\` appears in the Langfuse project within seconds, with a span per LLM call. Nothing appearing usually means the keys are not loaded in the server runtime or the region URL is wrong.`,
  }),
  guide({
    slug: "guides/helicone",
    name: "Helicone logging",
    tagline:
      "Log every LLM request with cost and latency by routing the provider through the Helicone proxy.",
    docs: "/docs/integrations/observability/helicone",
    agentMinutes: [3, 8],
    agent: `This guide changes the server code that creates the LLM provider client. Find it first (usually app/api/chat/route.ts). It assumes the provider is OpenAI through the AI SDK or the OpenAI SDK; for Anthropic, Gemini, or others, the base URL differs, so follow Helicone's provider docs linked under "Notes" on the docs page above and tell the user.

1. Ask the user for their Helicone API key and write HELICONE_API_KEY=<key> to .env.local next to the existing provider key. Never invent one, and never expose it to client code.
2. AI SDK: replace the \`openai\` import with \`const openai = createOpenAI({ baseURL: "https://oai.helicone.ai/v1", headers: { "Helicone-Auth": \`Bearer \${process.env.HELICONE_API_KEY}\` } })\` from @ai-sdk/openai, and leave the \`streamText\` call unchanged. OpenAI SDK: set the same \`baseURL\` and put the header in \`defaultHeaders\`.
3. If several routes create provider clients (chat, titles, suggestions), move the proxied client into one shared module and import it everywhere, so no call bypasses the proxy.
4. Restart the dev server so the new environment variable loads.

Verify: send a message and confirm the request appears in the Helicone dashboard within seconds with token counts and latency. If nothing appears, the server is still calling api.openai.com, or HELICONE_API_KEY is not loaded.`,
  }),
  guide({
    slug: "guides/langsmith",
    name: "LangSmith tracing",
    tagline: "Trace AI SDK calls into a LangSmith project with wrapAISDK.",
    docs: "/docs/integrations/observability/langsmith",
    agentMinutes: [3, 8],
    agent: `${needsAiSdkRoute} With @assistant-ui/react-langgraph on LangGraph Cloud, tracing is built in and this guide is not needed.

1. Ask the user for a LangSmith API key and the project name to trace into. Write LANGSMITH_TRACING=true, LANGSMITH_API_KEY=<key>, and LANGSMITH_PROJECT=<name> to .env.local. Never invent a key.
2. Install \`langsmith\`. ${packageManager}
3. In the chat route, change the AI SDK import to \`import * as ai from "ai";\`, add \`import { wrapAISDK } from "langsmith/experimental/vercel";\`, and take \`const { streamText } = wrapAISDK(ai);\` at module scope. \`convertToModelMessages\` is not wrapped; call it as \`ai.convertToModelMessages\`. Wrap \`generateText\`, \`generateObject\`, and \`streamObject\` the same way if the route uses them.
4. Optional: pass \`providerOptions: { langsmith: createLangSmithProviderOptions({ name, metadata }) }\` with a real user id and thread id when the code has them; do not ship literal placeholder strings.
5. If the app deploys to a serverless platform, add \`await new Client().awaitPendingTraceBatches()\` with \`Client\` from langsmith, as the "Serverless flush" note on the docs page above shows.
6. Do not also set \`experimental_telemetry\`; \`wrapAISDK\` is LangSmith's own path. Restart the dev server.

Verify: send a message and confirm a run appears in the LangSmith project within seconds with inputs, outputs, and token usage. No run usually means LANGSMITH_TRACING is not "true" in the server environment or the key is for a different workspace.`,
  }),
  guide({
    slug: "guides/mcp",
    name: "MCP server tools",
    tagline:
      "Connect MCP servers in the chat route so their tools are available to the model.",
    docs: "/docs/tools/mcp",
    agentMinutes: [5, 15],
    agent: `${needsAiSdkRoute}

1. Ask the user for the MCP server URL and, if it needs one, its auth token. Write MCP_SERVER_URL=<url> and MCP_TOKEN=<token> to .env.local. Never invent a URL or token.
2. Install \`@ai-sdk/mcp\`. ${packageManager} Only for a local stdio server in development, also install \`@modelcontextprotocol/sdk\`.
3. Check whether the project has a \`"use generative"\` toolkit file that calls \`defineToolkit\`. If it does, spread \`defineMcpToolkit({ <name>: { type: "http", url } })\` from @assistant-ui/react into it and use \`new AISDKToolkit({ toolkit })\` from @assistant-ui/ai-sdk in the route: \`tools: await aiToolkit.tools({ frontend: tools })\`, with \`await aiToolkit.close()\` in \`onFinish\`, as the docs page above shows.
4. Otherwise wire it by hand inside the POST handler: \`createMCPClient({ transport: { type: "http", url: process.env.MCP_SERVER_URL!, headers } })\`, \`const tools = await mcpClient.tools()\`, spread them into the existing \`tools\` of \`streamText\`, and call \`await mcpClient.close()\` in \`onFinish\`. Keep tools the route already defines. Send the Authorization header only when a token is set.
5. With several servers, create one client each and close all of them; on duplicate tool names use \`prefix\` (toolkit path) or rename.
6. Tool calls render through the project's existing tool UI (\`ToolFallback\`). Add a custom renderer only if the user asks.

Verify: ask the assistant to use one of the server's tools and confirm a tool call with a result renders in the thread. A route that hangs or 500s before streaming means the MCP server URL or token is wrong.`,
  }),
  guide({
    slug: "guides/user-managed-mcp",
    name: "User-managed MCP servers",
    tagline:
      "End users connect, authenticate, and add MCP servers from a dialog in the browser.",
    docs: "/docs/tools/user-managed-mcp",
    agentMinutes: [10, 20],
    agent: `${needsRuntime}

1. Install \`@assistant-ui/react-mcp\`. ${packageManager}
2. Ask the user which preset connectors to offer (name, URL, and auth type none, bearer, or oauth). Do not ship the docs' example URLs. An empty list is fine if users should only add their own servers.
3. Mount the manager inside the tree that already has the runtime: \`const aui = useAui(); const config = AuiConfig({ mcp: McpManagerResource({ connectors }) });\` and wrap the children in \`<AuiProvider extends={aui} config={config}>\`, as app/providers.tsx on the docs page above shows. Declare connectors with \`defineConnector\`; ids must be unique.
4. ${registryStep} Then run \`npx shadcn@latest add @assistant-ui/mcp-config --yes\` and render \`<McpConfigDialog />\` inside that provider; ask the user where if the layout has no obvious header or settings area.
5. Add the OAuth callback page at app/mcp/callback/page.tsx rendering \`<McpOAuthCallback onComplete={...} />\` inside the same providers, redirecting back to the chat page. If the route differs, set \`oauthRedirectUri\` on the manager to match.
6. Connected tools are frontend tools. On \`useChatRuntime\`, pass \`sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls\` (from ai) so results return to the model, and make sure the chat route forwards the request's frontend \`tools\` to the model.
7. Tell the user the default storage is \`McpLocalStorage()\` and point them to "Storage" and "Auth" on the docs page before production.

Verify: open the dialog, connect a server, ask the assistant to use one of its tools, and confirm the tool call completes and the model continues. A call that never continues means \`sendAutomaticallyWhen\` is missing.`,
  }),
  guide({
    slug: "guides/rtl",
    name: "RTL support",
    tagline:
      "Right-to-left layout for Arabic, Hebrew, and Persian chat interfaces.",
    docs: "/docs/rtl",
    agentMinutes: [3, 10],
    agent: `${needsRuntime} It assumes shadcn-style components under components/.

1. Check whether components/assistant-ui/ and components/ui/ still use physical Tailwind classes (\`ml-*\`, \`pr-*\`, \`text-left\`, \`right-*\`). If they do, make sure the working tree is committed or tell the user first, then run \`npx shadcn@latest migrate rtl\` and \`npx shadcn@latest migrate rtl 'components/assistant-ui/elements/**/*.tsx'\` exactly once. Never re-run either; the migration is not idempotent and duplicates \`rtl:translate-x-*\` classes. Skip both when the files already use logical classes (\`ms-*\`, \`pe-*\`, \`text-start\`).
2. ${registryStep}
3. Run \`npx shadcn@latest add @assistant-ui/direction --yes\`. It adds components/ui/direction.tsx.
4. Ask the user whether the whole app is RTL or the direction switches by locale. For a fixed RTL app, set \`<html lang="<locale>" dir="rtl">\` in the root layout, keeping the existing attributes and using the user's language code.
5. Wrap the app in \`<DirectionProvider dir="rtl">\` from @/components/ui/direction inside a client component, reusing the existing providers file when there is one. For runtime switching, drive \`dir\` from state and also update \`document.documentElement.dir\`.

Verify: open the chat page and confirm the thread is mirrored (text starts from the right, composer controls are flipped) and dropdown menus and popovers open toward the correct side. Menus opening the wrong way mean DirectionProvider is missing.`,
  }),
];
