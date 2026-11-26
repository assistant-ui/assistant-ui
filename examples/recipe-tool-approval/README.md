# Recipe: ask before running a tool

A support agent that looks up orders on its own and asks the user before it refunds one. The walkthrough is the [Ask before running a tool](https://www.assistant-ui.com/docs/recipes/tool-approval) recipe.

## Run it

From the repository root:

```bash
pnpm install
pnpm turbo build --filter='recipe-tool-approval^...'
cp examples/recipe-tool-approval/.env.example examples/recipe-tool-approval/.env.local
# fill in OPENAI_API_KEY and TOOL_APPROVAL_SECRET
pnpm --filter recipe-tool-approval dev
```

Ask it to refund order `A-1001`. The refund card waits for Approve or Deny.

## Test it

`pnpm --filter recipe-tool-approval test` runs the route against a scripted model, so it needs no API key.
