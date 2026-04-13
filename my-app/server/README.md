# My App MCP Server

MCP server for your ChatGPT app.

## Quick Start

```bash
npm install
npm run dev
```

Server runs at `http://localhost:3001/mcp`

## Test with MCP Inspector

```bash
npm run inspect
```

## Deploy

### Vercel

```bash
vercel deploy
```

### Manual

1. Build: `npm run build`
2. Start: `npm start`

## Tools

- **example_tool**: An example tool for your ChatGPT app

## Adding New Tools

1. Create a new handler in `src/tools/`
2. Register it in `src/index.ts`
3. Update your widget to call the tool

## Security

### CORS Configuration

By default, this server allows requests from any origin (`Access-Control-Allow-Origin: *`).

**For production**, restrict CORS to your widget's domain:

```typescript
// In src/index.ts, replace:
res.setHeader("Access-Control-Allow-Origin", "*");

// With your specific origin:
res.setHeader("Access-Control-Allow-Origin", "https://your-widget-domain.com");
```

Or use an environment variable:

```typescript
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "*";
res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
```

---

Generated with [ChatGPT App Studio](https://github.com/assistant-ui/assistant-ui/tree/main/packages/chatgpt-app-studio)
