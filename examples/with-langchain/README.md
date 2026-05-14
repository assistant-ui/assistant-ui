# LangChain `useStream` Example

Demonstrates `@assistant-ui/react-langchain`, which wraps `useStream` from `@langchain/react` and exposes it as an assistant-ui runtime.

> assistant-ui also ships `@assistant-ui/react-langgraph`, which integrates with `@langchain/langgraph-sdk` directly and currently has a broader feature set. Pick the adapter that matches your upstream choice. See [the comparison](https://www.assistant-ui.com/docs/runtimes/langchain/comparison).

## Quick Start

```bash
pnpm install
```

### Environment Variables

Create `.env.local`:

```sh
NEXT_PUBLIC_LANGGRAPH_API_URL=http://localhost:2024
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=your_graph_id
```

Start a local LangGraph server via [LangGraph Studio](https://github.com/langchain-ai/langgraph-studio) pointing at your graph, or use [LangSmith](https://www.langchain.com/langsmith) for a hosted deployment.

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key Features

- `useStreamRuntime` — thin wrapper around `useStream` from `@langchain/react`.
- `useLangChainState<T>(key)` — reads arbitrary custom state keys (demo uses `state.todos` in `TodosPanel`).
- No hand-written stream generator, no `create` / `load` / `getCheckpointId` glue.

## Files of interest

- `app/MyRuntimeProvider.tsx` — entire runtime setup in ~15 lines.
- `components/TodosPanel.tsx` — demonstrates `useLangChainState<Todo[]>("todos", [])`.

## Related Documentation

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [LangChain useStream Integration](https://www.assistant-ui.com/docs/runtimes/langchain)
- [react-langgraph vs react-langchain](https://www.assistant-ui.com/docs/runtimes/langchain/comparison)
