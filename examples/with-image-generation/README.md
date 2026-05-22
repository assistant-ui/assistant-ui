# with-image-generation

Minimal Next.js example that generates an image through a server route and renders it with the `@assistant-ui/ui` `Image` component (loading, content-filter, zoom, and download / copy / regenerate actions). It runs without credentials by falling back to a mock image when `OPENAI_API_KEY` is unset.

## Run locally

```bash
export OPENAI_API_KEY=sk-...
pnpm --filter with-image-generation dev
```

Then open `http://localhost:3000`.

## How it works

- `app/api/image/route.ts` exposes a server endpoint that calls AI SDK's `generateImage` with `openai.image("gpt-image-1")` and returns an `ImageMessagePart`-shaped payload. Without `OPENAI_API_KEY` it returns a mock image so the example still runs.
- `app/page.tsx` POSTs the prompt to that endpoint, stores the result as an `ImageMessagePart`, and renders it with the `@assistant-ui/ui` `Image` component.
- `Image.Actions` provides download and copy buttons plus a regenerate button wired through its `onRegenerate` callback.
