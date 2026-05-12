# Xulux Coding Agent — Context for Claude Code

## What this is

Xulux is a coding agent built on top of the assistant-ui docs app. It helps users scaffold assistant-ui MVP projects by:
1. Exploring docs/examples via `listDocs` + `readDoc`
2. Reading monorepo source templates via `bash` / `readFile` (static snapshot at `/repo`)
3. Provisioning a live Blaxel cloud sandbox via `provisionSandbox`
4. Writing/running code in the sandbox via `exec`
5. Returning a public preview URL via `refreshCanvas`

Frontend page: `/xulux` (`apps/docs/app/xulux/page.tsx`)
API route: `POST /api/xulux/chat` (`apps/docs/app/api/xulux/chat/route.ts`)

## Current status (as of 2026-05-11)

- [x] API route wired up with all 7 tools
- [x] Blaxel sandbox provisioning working
- [x] Public preview URL via `sandbox.previews.createIfNotExists`
- [x] Fresh sandbox per page load (UUID sessionId, no sessionStorage)
- [x] Frontend page at `/xulux` using existing docs chat UI
- [x] Nav link added to header (`apps/docs/lib/constants.ts`)
- [x] Expandable tool call UI (click to reveal input/output)
- [ ] **Frontend canvas** — iframe to show the sandbox preview. See TODO in README.md.

## Key decisions and what was tried/rejected

### Session management
- `sessionId` is generated with `useState(() => crypto.randomUUID())` on every page load — intentionally no persistence
- This ensures each session gets a fresh sandbox from the template image
- `sandboxExec` is request-scoped (`let sandboxExec = null` inside POST handler) — agent must call `provisionSandbox` on each new conversation

### Sandbox preview URL
- Blaxel's `sandbox.metadata.url` requires auth headers — not usable in a plain `<iframe>`
- Solution: `sandbox.previews.createIfNotExists({ metadata: { name: "preview" }, spec: { port: 3000, public: true } })` — returns a fully public URL
- Dev server in the sandbox must bind to `0.0.0.0 --port 3000`

### Template/example discovery
- Tried: dedicated `listTemplates` tool, separate docs page for templates, reading a README
- Rejected all of these — agent already has `listDocs` → `readDoc` → `bash` flow to find examples and read source from the static `/repo` snapshot
- Current: agent uses `bash` to explore `/repo` (e.g. `find templates/ -type f`) and reads files directly

### Tool display
- `provisionSandbox`, `exec`, `refreshCanvas` do NOT have custom display cases in `messages.tsx`
- They fall through to the default expandable handler — click the tool call chip to see input/output
- Only `listDocs`, `readDoc`, `bash`, `readFile` have named labels in `getToolDisplay`

### Mastra removal
- Original blaxel file used `@mastra/core/workspace` — stripped entirely
- Now pure `@blaxel/core` wrapper: `SandboxInstance`, `process.exec`, retry/readiness logic only

## What to work on next

### 1. Frontend canvas (highest priority)
When the agent calls `refreshCanvas`, the tool result is `{ url: string }`. The frontend needs to:
- Listen for `refreshCanvas` tool results in the message stream
- Store the URL in state
- Render `<iframe src={url} />` in a split-panel layout next to the chat

Two approaches:
- **Frontend tool** (recommended): pass `refreshCanvas` as a client-side tool in the `tools` prop of `useChatRuntime` / `AssistantChatTransport` body. The client handles the tool result directly.
- **Read from message stream**: scan `useThreadRuntime` message parts for tool-call results with `toolName === "refreshCanvas"`

### 2. Prompt iteration
System prompt is in `SYSTEM_PROMPT` const at the top of `chat/route.ts`. Areas to refine:
- Scaffolding instructions (which template to pick, file structure)
- Error recovery when exec fails
- How to handle user requests that aren't MVP projects

### 3. Environment setup for local dev
Required in `apps/docs/.env.local`:
```
BL_WORKSPACE=<your-blaxel-workspace>
BL_API_KEY=<your-api-key>
BL_SANDBOX_TEMPLATE=<image-name>
OPENAI_API_KEY=<key>
```
Sandbox image must have Node.js and the ability to run Vite/Next.js dev servers.

## File map

```
apps/docs/app/
  xulux/page.tsx              — frontend page (useChatRuntime → /api/xulux/chat)
  api/xulux/
    chat/route.ts             — main POST handler, all 7 tools defined here
    blaxel-sandbox.ts         — Blaxel SDK wrapper (provisionSandbox, fetchPreviewUrl)
    README.md                 — API reference docs
    CLAUDE.md                 — this file

apps/docs/components/docs/assistant/
  messages.tsx                — ToolCall component (expandable), AssistantMessage
  thread.tsx                  — AssistantThread layout
  context.tsx                 — AssistantPanelProvider

apps/docs/lib/
  constants.ts                — NAV_ITEMS (xulux link added here)
  source.tsx                  — fumadocs source + examples loaders
```
