This is the [assistant-ui](https://github.com/Yonom/assistant-ui) starter project for langgraph.

## Getting Started

First, add your langgraph API url and assistant id to `.env.local` file:

```
LANGCHAIN_API_KEY=your_langchain_api_key
LANGGRAPH_API_URL=your_langgraph_api_url
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=your_assistant_id_or_graph_id
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
