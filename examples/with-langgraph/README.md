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
NEXT_PUBLIC_API_URL=https://stockbrokeragent-bracesprouls-projects.vercel.app/api
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=stockbroker
```

### Run

```bash
npm install
npm run dev
```

## Features

- LangGraph agent integration via `@assistant-ui/react-langgraph`
- Thread list for conversation management
- Custom tool UI for stock price snapshots
- Custom tool UI for stock purchases

## Related Documentation

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [LangGraph Integration Guide](https://www.assistant-ui.com/docs/runtimes/langgraph)
