# External Store Integration

This example demonstrates how to use assistant-ui with an external message store using `useExternalStoreRuntime`.

## Quick Start

### Using CLI (Recommended)

```bash
npx assistant-ui@latest create my-app --example with-external-store
cd my-app
```

### Environment Variables

Create `.env.local`:

```
OPENAI_API_KEY=sk-...
```

### Run

```bash
npm run dev
```

## Features

- External store runtime via `useExternalStoreRuntime`
- Custom message state management
- React state-based message storage
- Message conversion utilities

## Related Documentation

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [External Store Runtime Guide](https://www.assistant-ui.com/docs/runtimes/external-store)
