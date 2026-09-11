# LangGraph Integration

[Hosted Demo](https://assistant-ui-langgraph.vercel.app/)

This example demonstrates how to use LangChain LangGraph with assistant-ui. It is meant to be used with the backend found at LangGraph's Stockbroker example: https://github.com/bracesproul/langgraphjs-examples/tree/main/stockbroker

## Quick Start

### Using CLI (Recommended)

```bash
npx assistant-ui@latest create my-app --example with-langgraph
cd my-app
```

### Environment Variables

Create `.env.local`:

```
LANGGRAPH_API_URL=http://localhost:2024
LANGCHAIN_API_KEY=
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=stockbroker
```

`LANGGRAPH_API_URL` is the LangGraph deployment URL the bundled `/api/[..._path]` proxy fetches from. `LANGCHAIN_API_KEY` is forwarded as `x-api-key` and can be blank for an unauthenticated dev server. `NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID` is the graph id (a key under `graphs` in your `langgraph.json`).

The proxy rejects browser requests marked same-site or cross-site so the example works without exposing `LANGCHAIN_API_KEY` to the client. For clients without Fetch Metadata, reverse proxies must preserve the public scheme and host in the request URL for the `Origin` fallback. Request-context checks are not user authentication. Before deploying with a cloud API key, require your application session in the proxy route and apply a durable rate limit.

### Run

```bash
npm install
npm run dev
```

## Features

- LangGraph agent integration via `@assistant-ui/react-langchain`
- Thread list for conversation management
- Custom tool UI for stock price snapshots
- Custom tool UI for stock purchases

## Related Documentation

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [LangGraph Integration Guide](https://www.assistant-ui.com/docs/runtimes/langgraph)
