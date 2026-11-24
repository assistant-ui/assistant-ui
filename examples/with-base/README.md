# Base Example

A coding agent's chat built from assistant-ui primitives. It is a pattern for giving a chat a product's look: one file for the thread, one for the sidebar shell around it, and a stylesheet that starts from a shadcn/ui preset and adds the few colors the preset cannot express.

## Run it

From the monorepo root:

```bash
pnpm install
pnpm exec turbo build --filter='with-base^...'
pnpm --filter with-base dev
```

Open [http://localhost:3000](http://localhost:3000).

### Model key

Copy `examples/with-base/.env.example` to `.env.local` in the same folder and set `OPENAI_API_KEY`. Without a key the chat route answers with "No model key is set." The route has no sign-in, so add your own authentication and rate limiting before you deploy it with a key.

The model menu lists the models chosen in the settings, under Models, and sends the chosen one to the route as `provider/id`. That list comes from the [Modelpedia API](https://modelpedia.dev/docs/api) and is kept in the browser's local storage. The route runs OpenAI models only and answers with an error for any other provider; with the menu on Default it runs `ROUTE_MODEL` from `lib/models.ts`.

## What the example demonstrates

| Concern | Where it lives |
|---|---|
| Runtime, message queue, dictation, suggestion and feedback adapters, chat titles | `app/providers.tsx` |
| Home page and chat page | `app/page.tsx`, `app/chat/page.tsx` |
| Chat route, model and reasoning level | `app/api/chat/route.ts` |
| Follow-up prompts written by the model after a reply | `app/api/suggest/route.ts` |
| Home page: the app's places, with search, sort and pins | `components/base/home.tsx` |
| Pins, kept in the browser's local storage | `lib/pins.ts` |
| Thread, composer and its menus, queue, messages, work trace, feedback, forks | `components/base/base.tsx` |
| Sidebar shell, projects, recent chats, the shared menu parts | `components/base/base-thread-shell.tsx` |
| The route's default model and the reasoning levels | `lib/models.ts` |
| Model catalog from Modelpedia, its filters, and the chosen models | `lib/modelpedia.ts`, `lib/model-catalog.ts`, `lib/chosen-models.ts`, `components/base/filter-menu.tsx` |
| Settings dialog and its sections | `components/base/settings-dialog.tsx`, `settings-appearance.tsx`, `settings-models.tsx` |
| The theme a person sets: colors, tint and options, kept in a cookie | `lib/custom-theme.ts`, `lib/theme.ts`, `lib/theme-presets.ts` |
| Guest account from the session cookie | `proxy.ts`, `lib/guest.ts`, `components/base/nav-user.tsx` |
| A line drawing for each place on the home page | `components/base/item-glyph.tsx` |
| Theme: the shadcn/ui preset's values, then the overrides | `app/globals.css` |

## What only keeps its choice

The project, branch, worktree switch, environment, approval level, sidebar sort order and a temporary chat's Personalized choice are kept in the page and shown in the composer and sidebar. Nothing reads them yet: the chat route cannot open a project, check out a branch or run a command. Wire them to your own agent to make them do something.
