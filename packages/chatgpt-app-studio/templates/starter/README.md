# My ChatGPT App

A ChatGPT App built with [ChatGPT App Studio](https://github.com/assistant-ui/assistant-ui/tree/main/packages/chatgpt-app-studio).

## Setup

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

### Optional: SDK Guide (requires OpenAI API key)

The in-workbench SDK Guide assistant requires an OpenAI API key. To enable it, add:

```
OPENAI_API_KEY="your-key"
```

to `.env.local`.

## Commands

| Command          | Description        |
| ---------------- | ------------------ |
| `npm run dev`    | Start dev server   |
| `npm run build`  | Production build   |
| `npm run export` | Bundle for ChatGPT |

## Deploying

1. Run `npm run export`
2. Host the `export/widget/` files
3. Update `manifest.json` with your URL
4. Register at ChatGPT Apps dashboard

## Project Structure

```
app/              Next.js pages
components/       Shared UI components
lib/workbench/    Dev environment (see README)
lib/export/       Export bundler
```
