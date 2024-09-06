# LangGraph Example

[Hosted Demo](https://assistant-ui-langgraph.vercel.app/)

This example demonstrates how to use LangChain LangGraph with assistant-ui.

It is meant to be used with the backend found at LangGraph's Stockbroker example: https://github.com/bracesproul/langgraphjs-examples/tree/main/stockbroker

You need to set the following environment variables:

```env
NEXT_PUBLIC_API_URL=https://stockbrokeragent-bracesprouls-projects.vercel.app/api
NEXT_PUBLIC_LANGGRAPH_GRAPH_ID=stockbroker
```

To run the example, run the following commands:

```sh
npm install
npm run dev
```