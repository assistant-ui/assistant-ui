# Recipe: Save chat history in your own database

A chat app whose threads and messages live in a SQLite database it owns (`node:sqlite`, nothing to install), with a thread list sidebar. The walkthrough is the [Save chat history in your own database](https://www.assistant-ui.com/docs/recipes/chat-history) recipe.

## Run it

From the repository root:

```bash
pnpm install
pnpm turbo build --filter='recipe-chat-history^...'
OPENAI_API_KEY=sk-... pnpm --filter recipe-chat-history dev
```

Send a message, reload the page, and the thread is still in the sidebar. The database is `chat.db`; set `DATABASE_PATH` to move it.

## Test it

`pnpm --filter recipe-chat-history test` runs the adapter against the routes and an in-memory database, so it needs no API key.
