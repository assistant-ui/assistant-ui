# assistant-ui + Eve

This is an [assistant-ui](https://github.com/assistant-ui/assistant-ui) starter project powered by [Eve](https://eve.dev/).

## Getting Started

First, add an AI Gateway key to `.env.local`:

```sh
AI_GATEWAY_API_KEY=your-api-key
```

Then run the development server:

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

The Eve agent lives in `agent/`, and the browser UI connects to the built-in Eve HTTP channel through `useEveAgentRuntime()`.
