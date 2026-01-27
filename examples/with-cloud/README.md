# Assistant Cloud Integration

This example demonstrates how to use assistant-ui with Assistant Cloud for persistent conversation storage and thread management.

## Quick Start

### Using CLI (Recommended)

```bash
npx assistant-ui@latest create my-app --example with-cloud
cd my-app
```

### Environment Variables

Create `.env.local`:

```
OPENAI_API_KEY=sk-...
JWT_SECRET=your-jwt-secret
ASSISTANT_API_KEY=sk-aui-proj-...
NEXT_PUBLIC_ASSISTANT_BASE_URL=https://proj-xxxx.assistant-api.com
```

### Run

```bash
npm run dev
```

## Features

- Persistent conversation storage with Assistant Cloud
- Thread list for managing multiple conversations
- Vercel AI SDK integration
- Markdown message rendering

## Related Documentation

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [Assistant Cloud Guide](https://www.assistant-ui.com/docs/cloud)
