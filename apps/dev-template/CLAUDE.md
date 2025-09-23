# Dev Template

## Purpose
Development environment for testing assistant-ui templates with provider switching capabilities.

## Architecture
- **Single UI Source**: Imports components directly from registry via aliases
- **Multi-Provider Support**: Test all 4 providers (Vercel AI SDK, Assistant Cloud, LangGraph, MCP)
- **Live Provider Switching**: Floating UI to switch providers without restart
- **Registry Integration**: Components use dual-class system (aui-* + Tailwind)

## Key Files
```
app/
├── assistant-with-provider.tsx  # Main UI with runtime switching
├── page.tsx                     # Entry point with provider context
├── api/                         # Provider-specific API routes
│   ├── vercel-ai-sdk/
│   ├── assistant-cloud/
│   ├── langgraph/
│   └── mcp/
components/
├── provider-switcher.tsx        # Floating provider selector UI
└── assistant-ui/                # Imported from registry
contexts/
└── provider-context.tsx         # Provider state management
```

## Provider Configuration

### Runtime Isolation
Each provider has explicit cloud persistence settings:
- **vercel-ai-sdk**: No cloud (transport only)
- **assistant-cloud**: With cloud persistence
- **langgraph**: Explicitly `cloud: undefined`
- **mcp**: Explicitly `cloud: undefined`

### API Routes
Each provider has its own API endpoint:
- `/api/vercel-ai-sdk` - Standard AI SDK
- `/api/assistant-cloud` - Cloud-enabled AI SDK
- `/api/langgraph` - LangGraph integration
- `/api/mcp` - Model Context Protocol

## Development Workflow

```bash
# Start dev server
pnpm dev

# Test provider switching
# Use floating menu in top-right corner

# Components auto-reload from registry
# Changes in registry reflect immediately
```

## Component Imports
Components import from registry via TypeScript aliases:
```typescript
import { Thread } from "@/components/assistant-ui/thread";
// Resolves to: apps/registry/components/assistant-ui/thread.tsx
```

## Testing Features
- Provider persistence in localStorage
- Environment variable validation
- Missing dependency warnings
- Graceful degradation on API failures

## Important Notes
- This is NOT distributed to users
- Uses aui-* classes for development convenience
- Registry components have dual-class system
- Provider switching demonstrates runtime flexibility