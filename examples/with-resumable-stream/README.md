# with-resumable-stream

Demonstrates `assistant-stream/resumable`: persist an in-flight LLM response on the server so the client can reload or lose its connection mid-stream and pick up where it left off.

## How it works

1. Each `POST /api/chat` mints a new UUIDv4 `streamId` server-side and returns it in the `x-resumable-stream-id` header. `AssistantChatTransport` reads that header on the browser and stores the latest pending id in `sessionStorage`.
2. The route runs `streamText`, then pipes the byte body through `context.run(streamId, () => uiMessageStreamBody)`. The bytes are persisted in the configured store while being streamed to the client.
3. If the client disconnects mid-stream, the server-side producer task keeps running and continues to append bytes to the store.
4. On page load, if `sessionStorage` still has a stream id, the client calls `chat.resumeStream()`. The transport's `resumable` adapter rewrites the AI SDK reconnect request to `GET /api/chat/resume/[streamId]`, which calls `context.resume(streamId)` and replays the persisted bytes (plus any new ones) to the reconnecting client.
5. When the response stream closes naturally, the transport detects the AI SDK `finish` SSE event in the body and clears the stored id. Cancellation does not clear the id, so a reload mid-stream still finds it on next mount.

## Quick start

```sh
cp .env.example .env.local
# Optional: put your OPENAI_API_KEY in .env.local for the real model. Without
# it, the example falls back to a slow built-in mock so you can demo resume.
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), send a prompt, then reload the page mid-response. The same answer keeps filling in.

## Client integration

The browser side is wired through two helpers from `@assistant-ui/react-ai-sdk`:

- `createResumableSessionStorage()` returns a small `sessionStorage`-backed storage object for the pending stream id. Pass `{ key }` to namespace per route. Use `localStorage` instead if you want a stream that survives full browser restarts (and accept the cross-tab race that comes with it).
- `AssistantChatTransport` accepts a `resumable` option. When set, the transport captures the `x-resumable-stream-id` response header, watches the SSE body for the `finish` event so the stored id is cleared on natural completion (cancellation leaves it intact), and redirects `chat.resumeStream()` reconnects to the configured `resumeApi`.

The example fires `chat.resumeStream()` from a one-shot `useEffect` when storage already has an id at mount time. If you switch to `useChatRuntime`, that resume call is wired automatically.

## Server methods

The `ResumableStreamContext` returned by `createResumableStreamContext` exposes:

- `run(streamId, makeStream)`: producer-or-consumer entrypoint. Auto-elects the role via the store, so concurrent callers with the same id share the persisted output.
- `resume(streamId)`: strict consumer; returns `null` when the stream does not exist.
- `requireResume(streamId)`: same as `resume`, but throws `ResumableStreamError("missing")` instead of returning `null`.
- `status(streamId)`: probe the lifecycle state without opening a reader.
- `delete(streamId)`: remove all state for a stream.

## Storage

By default the example uses `createInMemoryResumableStreamStore` from `assistant-stream/resumable`. The store is memoized on `globalThis` via `Symbol.for`, so it survives Next.js hot reload but not full server restart. Default TTL is 24h; configure with `defaultTtlMs` if you want shorter eviction.

To use Redis instead, set `REDIS_URL` in `.env.local`:

```sh
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your-api-key-here
```

The example will use the `assistant-stream/resumable/redis` adapter automatically. With Redis, resumable state survives server restarts (until the per-stream TTL expires; default 24h).

You can run a local Redis quickly with Docker:

```sh
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

## Production checklist

`GET /api/chat/resume/[streamId]` in this example serves any caller who knows the stream id. UUIDv4 is unguessable in practice, but the id leaks into response headers, `sessionStorage`, browser history, and access logs. Before deploying:

- Gate the resume endpoint with the same auth your chat endpoint uses.
- Bind `streamId` to the requesting user at creation time and reject mismatches before calling `context.resume`.
- On serverless platforms that kill the request handler when the response returns (Vercel, Cloudflare), pass `waitUntil` from `next/server` (`after`) when constructing the context. Otherwise the producer task is interrupted and resume cannot recover the rest of the stream.

## Files of interest

- `lib/resumable-context.ts`: picks the store based on `REDIS_URL` and memoizes a single `ResumableStreamContext` across module reloads.
- `app/api/chat/route.ts`: POST endpoint that mints a fresh `streamId`, runs `streamText` (or a mock), and wraps the response body in `context.run`.
- `app/api/chat/resume/[streamId]/route.ts`: GET endpoint that calls `context.resume` and replays the persisted bytes.
- `app/page.tsx`: wires `useChat` with `AssistantChatTransport`'s `resumable` adapter and triggers `chat.resumeStream()` on mount when a pending id exists.

## Related documentation

- [assistant-ui documentation](https://www.assistant-ui.com/docs)
- [AI SDK reconnect API](https://sdk.vercel.ai/docs)
