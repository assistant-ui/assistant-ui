# AG-UI Protocol Integration

This example demonstrates how to integrate assistant-ui with the AG-UI protocol for connecting to AG-UI compatible agents.

## Quick Start

### Using CLI (Recommended)

```bash
npx assistant-ui@latest create my-app --example with-ag-ui
cd my-app
```

### Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_AGUI_AGENT_URL=http://localhost:8000/agent
```

### Run

```bash
npm run dev
```

## Features

- AG-UI protocol integration via `@assistant-ui/react-ag-ui`
- Custom browser alert tool demonstration
- Client-side tool execution
- Tool result rendering

## Related Documentation

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [AG-UI Protocol](https://docs.ag-ui.com)
