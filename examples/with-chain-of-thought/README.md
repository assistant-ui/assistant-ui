# Chain of Thought Example

A real chat flow that renders reasoning, tool calls, and source citations as grouped message parts. Demonstrates `MessagePrimitive.GroupedParts` with a nested `groupBy` path, plus structured `source` parts emitted from a search tool.

## Quick start

### Using the CLI

```bash
npx assistant-ui@latest create my-app --example with-chain-of-thought
cd my-app
```

### Environment variables

`OPENAI_API_KEY` is optional. With the key set the route runs a real reasoning model and a `search_web` tool; without it the route streams a deterministic mock response with the same chunk shapes, so the UI is fully demonstrable offline.

Create `.env.local`:

```
OPENAI_API_KEY=sk-...
```

### Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What the example demonstrates

| Concern | Where it lives |
|---|---|
| Real chat flow with `useChatRuntime` | `app/page.tsx` |
| Reasoning, tool calls, source citations streamed as message parts | `app/api/chat/route.ts` |
| Nested adjacency-based grouping with `MessagePrimitive.GroupedParts` | `app/MyThread.tsx` |
| `Sources` component rendering `source` parts | `app/MyThread.tsx` |
| Fallback path that runs without an API key | `app/api/chat/route.ts` (`streamFallback`) |

## How parts are grouped

The thread groups three part types under one collapsible "Thinking" section, then renders source badges in a row below it. The grouping is configured on `MessagePrimitive.GroupedParts`:

```tsx
<MessagePrimitive.GroupedParts
  groupBy={(part) => {
    if (part.type === "reasoning") return ["group-chainOfThought", "group-reasoning"];
    if (part.type === "tool-call") return ["group-chainOfThought", "group-tool"];
    if (part.type === "source") return ["group-chainOfThought", "group-sources"];
    return null;
  }}
>
```

Each part is mapped to a nested group key path. Adjacent parts that share a path are coalesced and rendered through the matching `group-*` case in the render function. `null` leaves a part ungrouped.

This is the canonical pattern. For non-adjacent clustering (parts that share an identifier but appear at different positions in the message), see [`/docs/ui/part-grouping`](https://www.assistant-ui.com/docs/ui/part-grouping).

## How sources are emitted

The route emits structured `source-url` chunks; `@assistant-ui/react-ai-sdk` converts them to `source` message parts that the `Sources` component renders as badges. They are not URLs scraped from assistant text.

```ts
writer.write({
  type: "source-url",
  sourceId: "src-1",
  url: "https://example.com/report",
  title: "Example report",
});
```

In the real path the `search_web` tool returns sources in its output, and the route writes one `source-url` chunk per result immediately after the `tool-output-available` chunk. In the fallback path the same shape is written directly. The UI rendering is identical in both modes.

## Why these features live together

Chain-of-thought, tool calls, and citation sources are the parts of an assistant turn a user typically wants to inspect together. Grouping them under one collapsible keeps the message tidy by default and reveals the full reasoning trail on demand.

## Related documentation

- [Message Part Grouping](https://www.assistant-ui.com/docs/ui/part-grouping)
- [Sources component](https://www.assistant-ui.com/docs/ui/sources)
- [AI SDK v6 runtime](https://www.assistant-ui.com/docs/runtimes/ai-sdk/v6)
