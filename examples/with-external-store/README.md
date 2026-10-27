# External Store Integration

This example demonstrates how to use assistant-ui with an external message store using `useExternalStoreRuntime`.

Messages are stored in React state. After each submission, the demo waits one second and replies with `Hello, world!`. No API key, backend, or environment variables are required. To connect a real backend, replace the simulated response in `app/MyRuntimeProvider.tsx` with your API call.

## Quick Start

### Using CLI (Recommended)

```bash
npx assistant-ui@latest create my-app --example with-external-store
cd my-app
npm run dev
```

### From a Repository Checkout

Use the Node.js and pnpm versions specified in the repository's root `package.json`. Run these commands from the repository root:

```bash
pnpm install
pnpm turbo build --filter=with-external-store...
pnpm --filter with-external-store dev
```

The example depends on local packages through `workspace:*`. Install with pnpm to link those packages, then build the example and its dependencies so it can import their `dist` outputs. The Turbo filter avoids building unrelated apps in the repository.

Open the local URL printed by Next.js, usually [http://localhost:3000](http://localhost:3000). Send a message to see the simulated reply. Messages reset when the page reloads.

## Features

- External store runtime via `useExternalStoreRuntime`
- Custom message state management
- React state-based message storage
- Message conversion utilities

## Related Documentation

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [External Store Runtime Guide](https://www.assistant-ui.com/docs/runtimes/custom/external-store)
