// The prompt copied by the "Copy prompt" button in the homepage hero.
// Paste into any AI coding agent (Claude Code, Cursor, Windsurf, Codex, etc.)
// to scaffold and wire up assistant-ui inside the user's project.

export const SETUP_PROMPT = `Step 1: Read the docs

Read https://assistant-ui.com/llms-full.txt — the full reference in one
file. Append ".mdx" to any docs URL for raw markdown
(e.g. /docs/installation.mdx).

Step 2: Ask the user

Ask (a) fresh project vs (b) integrate into an existing project, and which
runtime: default (AI SDK + OpenAI), LangGraph, Assistant Cloud, MCP, or a
custom backend (Assistant Transport / AG-UI / A2A / Google ADK).

Step 3: Create or integrate

You are in a non-interactive agent shell — do NOT omit the flags below.

If (a) fresh project:
Run: npx assistant-ui@latest create <app-name> -t <template>

Templates: default (unsure), minimal, cloud, cloud-clerk, langgraph, mcp.
For custom backends without a template, swap -t for -e:
AG-UI → \`-e with-ag-ui\`, Google ADK → \`-e with-google-adk\`,
Assistant Transport → \`-e with-assistant-transport\`.
A2A: use \`-t minimal\`, then install @assistant-ui/react-a2a manually.
<app-name> and -t/-e are required.

If (b) existing project:
Detect the framework first. init ONLY supports Next.js App Router (it
scaffolds app/assistant.tsx + app/api/chat/route.ts).

- Vite / React Router v7 / TanStack Start / Expo → init does NOT work.
  Prefer starting fresh with \`create <name> -e with-react-router\` /
  \`with-tanstack\` / \`with-expo\` and migrating code in. In-place only
  if you must: \`npx shadcn@latest add https://r.assistant-ui.com/thread.json\`,
  install the provider SDK, and wire your own server for the chat endpoint
  (Vite/Expo do not bundle one). See /docs/installation.mdx Manual Setup.
- Next.js App Router → confirm package manager, Tailwind (v3 or v4), and
  env var location, then run:

  npx assistant-ui@latest init --yes

--yes is required. init scaffolds:
- components/assistant-ui/thread.tsx (Thread UI)
- app/assistant.tsx (exports <Assistant />, already wraps Thread in
  AssistantRuntimeProvider with runtime + transport)
- app/api/chat/route.ts (OpenAI backend)

Dependencies are installed automatically. If components.json already
exists, init aborts — use \`add <name>\` instead.

After create OR init:
- Put the provider key in .env.local (OPENAI_API_KEY / ANTHROPIC_API_KEY …).
- Non-OpenAI: swap the model in app/api/chat/route.ts and install that
  provider's @ai-sdk/* package.
- Render <Assistant /> (from \`@/app/assistant\`) in the root page.
  Do NOT rebuild the provider — assistant.tsx already does it.
- More components: \`npx assistant-ui@latest add <name>\`
  (thread-list, assistant-modal, attachment, …).

Step 4: Verify

Start the dev server and send a test message. Success = the reply streams
token-by-token in the Thread. If it fails, diagnose:
- 401 / missing key → .env.local not loaded; restart the dev server
- 500 on /api/chat → route file provider mismatch
- Styles missing → Tailwind / globals.css not wired

Stuck on anything else? Report the exact error to the user — do not loop.
`;
