# ChatGPT App Studio

Scaffold ChatGPT App projects with one command.

## Usage

```bash
npx chatgpt-app-studio my-app
cd my-app
npm install
npm run dev
```

## What's Included

- Next.js 16 with App Router
- assistant-ui chat components
- AI SDK for streaming
- Tailwind CSS v4
- Example widget
- Export script for deployment

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run export   # Bundle for ChatGPT
```

## Notes

### Dark Mode

Exported widgets inherit the host's theme. Ensure your CSS responds to the `.dark` class on the root element if you need custom dark mode styling.

### MCP Server CORS

The generated MCP server uses permissive CORS (`*`) by default. For production, set `CORS_ORIGIN` in your `.env` file to restrict origins.

## License

MIT
