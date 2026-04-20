# with-image-generation

Minimal Next.js example that demonstrates the `@assistant-ui/react` image
generation primitives: `useImageGeneration`, the `Image` component with
loading / content-filter / complete states, and `Image.Actions`
(download, copy, rate-limited regenerate).

## Run locally

```bash
export OPENAI_API_KEY=sk-...
pnpm --filter with-image-generation dev
```

Then open `http://localhost:3000`.

## How it works

- `app/api/image/route.ts` exposes a server endpoint that calls AI SDK's
  `generateImage` with `openai.image("gpt-image-1")`.
- `app/page.tsx` wires a custom `ImageGenerationAdapter` that POSTs to that
  endpoint, hands it to `useImageGeneration`, and renders the result via the
  `@assistant-ui/ui` `Image` component.
- `Image.Actions` wires up `useImagePartDownload`, `useImagePartCopy`, and
  `useImagePartRegenerate` (with a 3/min rate limit and a pricing hint).
