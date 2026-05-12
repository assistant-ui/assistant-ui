# Xulux Coding Agent - Context for Claude Code

## What This Is

Xulux is a coding agent built on top of the assistant-ui docs app. It helps users scaffold assistant-ui MVP projects by:

1. Exploring docs/examples via `listDocs` and `readDoc`.
2. Reading monorepo source templates via `bash` / `readFile` against the static `/repo` snapshot.
3. Provisioning a live Blaxel cloud sandbox via `provisionSandbox`.
4. Writing/running code in the sandbox via `exec`.
5. Returning a public preview URL via `refreshCanvas`.

Frontend page: `/playground` AI Builder (`apps/docs/app/playground/page.tsx`)
Temporary test page: `/xulux` (`apps/docs/app/xulux/page.tsx`)
API route: `POST /api/xulux/chat` (`apps/docs/app/api/xulux/chat/route.ts`)

## Current Status

- [x] API route wired up with agent tools.
- [x] Blaxel sandbox provisioning working.
- [x] Public preview URL via `sandbox.previews.createIfNotExists`.
- [x] Fresh sandbox per page load.
- [x] Frontend shell in `/playground` AI Builder mode.
- [x] Expandable tool call UI.
- [x] Frontend canvas observes `refreshCanvas` and renders iframe preview.
- [x] `/api/xulux/examples` derives the catalog from Fumadocs examples plus existing example card metadata.
- [x] `/api/xulux/download` exports the sandbox workspace.

## Key Decisions

### Session Management

- `sessionId` is generated with `crypto.randomUUID()` on each session reset.
- `sandboxExec` is request-scoped inside the chat POST handler.
- The agent must call `provisionSandbox` before `exec` in each new conversation.

### Sandbox Preview URL

- Blaxel `sandbox.metadata.url` requires auth and is not iframe-safe.
- Public previews are created with `sandbox.previews.createIfNotExists({ spec: { port: 3000, public: true } })`.
- The sandbox dev server must bind to `0.0.0.0:3000`.
- `refreshCanvas.url` is the frontend preview-ready signal.

### Template/Example Catalog

- Agent-side discovery uses `listDocs` -> `readDoc` -> `bash`.
- Frontend catalog uses `GET /api/xulux/examples`.
- The catalog source is `apps/docs/lib/xulux/examples-catalog.ts`, joining:
  - Fumadocs examples pages from `apps/docs/lib/source.tsx`
  - Existing card metadata from `apps/docs/lib/examples.ts`
- Internal hosted previews use `/playground/xulux-preview/[slug]`.
- Selecting an example shows that preview and stores selected-template context; it does not auto-send `template.prompt`.

## File Map

```text
apps/docs/app/
  playground/page.tsx                         - final AI Builder / UI Builder entry point
  playground/xulux-preview/[slug]/page.tsx    - internal standalone example preview
  xulux/page.tsx                              - temporary test page
  api/xulux/
    chat/route.ts                             - main POST handler and tools
    examples/route.ts                         - examples/templates catalog
    download/route.ts                         - workspace export endpoint
    blaxel-sandbox.ts                         - Blaxel SDK wrapper

apps/docs/components/xulux/
  XuluxApp.tsx
  shell/XuluxShell.tsx
  canvas/*
  landing/*
  examples/ExamplePreview.tsx
  templates/*

apps/docs/lib/
  source.tsx                                  - Fumadocs source + examples loader
  examples.ts                                 - existing docs example card metadata
  xulux/examples-catalog.ts                   - Xulux catalog joiner
```
