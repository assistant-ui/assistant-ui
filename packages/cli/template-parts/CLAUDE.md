# Template Parts

## Purpose
Composable template fragments assembled by CLI to create user projects.

## Architecture
- **Base Template**: UI components and layout
- **Providers**: Runtime-specific configurations
- **Registry Integration**: Components installed via shadcn CLI
- **UI/Runtime Separation**: Base provides UI, providers supply runtime hooks

## Structure
```
template-parts/
├── templates.json           # Central configuration
├── base/                    # Base template files
│   ├── app/
│   │   ├── assistant.tsx   # Main UI (imports RuntimeProvider)
│   │   ├── layout.tsx      # App layout
│   │   └── globals.css     # Tailwind styles
│   └── tsconfig.json.template
└── providers/               # Provider-specific runtimes
    ├── vercel-ai-sdk/
    │   └── app/RuntimeProvider.tsx
    ├── assistant-cloud/
    ├── langgraph/
    └── mcp/
```

## Template Composition Flow
```
create-next-app → Base Files → Core Dependencies → Registry Components → Provider Files → Complete App
```

## Provider Pattern
Each provider implements the same interface:
```typescript
// app/RuntimeProvider.tsx
export function useRuntime() {
  return useChatRuntime({ /* provider config */ });
}
```

Base assistant.tsx consumes this:
```typescript
import { useRuntime } from "@/app/RuntimeProvider";
const runtime = useRuntime();
```

## Configuration (templates.json)
- **coreDependencies**: Always installed (clsx, tailwind-merge, etc.)
- **registryItems**: Components from r.assistant-ui.com
- **shadcnItems**: Standard shadcn/ui components
- **providers**: Runtime configurations and dependencies

## CLI Assembly Process
1. Create Next.js base with create-next-app
2. Overwrite with base template files
3. Install core dependencies
4. Install registry components individually (resilient)
5. Copy provider RuntimeProvider and API routes
6. Merge provider dependencies
7. Run package manager install

## Key Design Decisions
- **Individual component installation**: Partial success possible
- **Three-tier dependencies**: Core → Component → Provider
- **No duplicate UI**: Single assistant.tsx for all providers
- **Graceful degradation**: Works even if some components fail

## User Output
Generated templates use:
- **SAME components as registry** with dual-class system
- **aui-* prefixed classes** alongside Tailwind classes
- Example: `className="aui-thread-root flex h-full w-full"`
- Components work with both @assistant-ui/styles CSS and Tailwind
- Standard Next.js + shadcn patterns