# Codex Example

A coding agent's chat in the look of Codex, built from assistant-ui primitives. It is a pattern for giving a chat a product's look: one file for the thread, one for the sidebar shell around it, and a stylesheet that starts from a shadcn/ui preset and adds the few colors the preset cannot express.

## Run it

From the monorepo root:

```bash
pnpm install
pnpm exec turbo build --filter='with-codex^...'
pnpm --filter with-codex dev
```

Open [http://localhost:3000](http://localhost:3000).

### Model key

Copy `examples/with-codex/.env.example` to `.env.local` in the same folder and set `OPENAI_API_KEY`. Without a key the chat route answers with "No model key is set." The route has no sign-in, so add your own authentication and rate limiting before you deploy it with a key.

The model menu lists the models in `lib/models.ts` and sends the chosen id to the route. Set those ids to the models your key can use.

## What the example demonstrates

| Concern | Where it lives |
|---|---|
| Runtime, dictation adapter, chat titles | `app/page.tsx` |
| Chat route, model and reasoning level | `app/api/chat/route.ts` |
| Thread, composer and its menus, messages | `components/codex/codex.tsx` |
| Sidebar shell, projects, recent chats, the shared menu parts | `components/codex/codex-thread-shell.tsx` |
| Models and reasoning levels | `lib/models.ts` |
| Sample projects and their branches | `lib/data.json` |
| Theme: the shadcn/ui preset's values, then the overrides | `app/globals.css` |

## What only keeps its choice

The project, branch, worktree switch, environment, approval level and sidebar sort order are kept in the page and shown where Codex shows them. Nothing reads them yet: the chat route cannot open a project, check out a branch or run a command. Wire them to your own agent to make them do something.
