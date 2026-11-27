# Recipe: Show a tool result as your own component

A chat that answers weather questions with a weather card: a server-side `getWeather` tool and a render-only toolkit entry. The walkthrough is the [Show a tool result as your own component](https://www.assistant-ui.com/docs/recipes/tool-ui) recipe.

## Run it

From the repository root:

```bash
pnpm install
pnpm turbo build --filter='recipe-tool-ui^...'
OPENAI_API_KEY=sk-... pnpm --filter recipe-tool-ui dev
```

Ask for the weather in a city.

## Test it

After the install and build steps above, `pnpm --filter recipe-tool-ui test` runs the route with a scripted model and renders the card, so it needs no API key.
