# ChatGPT App Studio — Product & Technical Plan

> **Last Updated:** 2025-12-31
> **Status:** MVP Complete — Pre-Release Polish

---

## Table of Contents

1. [Vision](#vision)
2. [What We're Building](#what-were-building)
3. [Current State](#current-state)
4. [MVP Scope](#mvp-scope)
5. [Short-Term Roadmap](#short-term-roadmap)
6. [Medium-Term Roadmap](#medium-term-roadmap)
7. [Long-Term Roadmap](#long-term-roadmap)
8. [Technical Architecture](#technical-architecture)
9. [Future Considerations](#future-considerations)
10. [Open Questions](#open-questions)

---

## Vision

### The Problem

Developers want to build ChatGPT Apps (interactive widgets that render inside ChatGPT conversations). Currently:

- **No official dev tools** — OpenAI hasn't released a development environment
- **No local preview** — You have to deploy to test
- **Undocumented APIs** — `window.openai` behavior is learned through trial and error
- **No scaffolding** — Every project starts from scratch
- **Tedious deployment** — Manual bundling, manifest creation, server setup

### Our Solution

**ChatGPT App Studio** — A development environment and CLI that makes building ChatGPT Apps easy:

1. **Local workbench** — Preview and test widgets without deploying
2. **Simulated `window.openai`** — Full API simulation with mock tools
3. **Export to production** — Generate deployable bundles with one command
4. **CLI tooling** — Scaffold projects, add tools/widgets, deploy

### Target User

Developers at companies building their first ChatGPT App. They:

- Know React/TypeScript
- Have used ChatGPT, maybe the API
- Haven't built a ChatGPT App before
- Want to ship quickly without learning all the internals

### Value Proposition

> "The fastest way to build and ship ChatGPT Apps"

---

## What We're Building

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    ChatGPT App Studio                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │                 │  │                 │  │             │ │
│  │   Workbench     │  │      CLI        │  │   Export    │ │
│  │                 │  │                 │  │             │ │
│  │ Local preview   │  │ chatgpt-app dev │  │ Production  │ │
│  │ Mock tools      │  │ chatgpt-app add │  │ bundles     │ │
│  │ Device presets  │  │ chatgpt-app     │  │ Manifests   │ │
│  │ Console/inspect │  │   export        │  │ Deploy      │ │
│  │                 │  │                 │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Developer Workflow

```
1. SCAFFOLD
   $ npx chatgpt-app-studio my-app
   $ cd my-app

2. DEVELOP
   $ npm run dev
   → Opens workbench at localhost:3000/workbench
   → Edit widget code, see changes live
   → Test with mock tool responses

3. EXPORT
   $ npm run export
   → Generates production widget bundle
   → Generates MCP server with tool handlers
   → Generates ChatGPT App manifest

4. DEPLOY
   → Deploy widget to static host (Vercel, Netlify)
   → Deploy server to serverless (Vercel, Cloudflare)
   → Register in ChatGPT Apps dashboard
```

---

## Current State

### What's Already Built

| Feature                    | Status     | Notes                                  |
| -------------------------- | ---------- | -------------------------------------- |
| Workbench UI               | ✅ Working | Three-panel layout, device frames      |
| `window.openai` simulation | ✅ Working | Full API shim                          |
| Mock tool system           | ✅ Working | Configurable responses, delays, errors |
| Console/inspector          | ✅ Working | Logs all SDK calls                     |
| Device presets             | ✅ Working | Mobile, tablet, desktop                |
| Display mode transitions   | ✅ Working | Inline, PiP, fullscreen                |
| Theme switching            | ✅ Working | Light/dark                             |
| POI Map widget             | ✅ Working | Complete example widget                |
| SDK guide                  | ✅ Working | AI-powered docs assistant              |
| Persistence                | ✅ Working | URL params, localStorage               |

### What's Missing

| Feature                     | Status       | Priority   |
| --------------------------- | ------------ | ---------- |
| Export feature              | ✅ Working   | ~~High~~   |
| CLI                         | ✅ Working   | ~~High~~   |
| Project scaffolding         | ✅ Working   | ~~High~~   |
| MCP server generation       | ✅ Working   | ~~High~~   |
| **Developer onboarding**    | ❌ Not built | **High**   |
| **Hooks API documentation** | ✅ Done      | ~~High~~   |
| **Export validation**       | ✅ Partial   | ~~High~~   |
| **Deployment guidance**     | ✅ Done      | ~~High~~   |
| DX polish (single command)  | ✅ Partial   | ~~Medium~~ |
| Component auto-discovery    | ❌ Not built | Medium     |
| Testing infrastructure      | ❌ Not built | Medium     |
| Tool definition UI          | ❌ Not built | Medium     |
| More widget examples        | ❌ Not built | Medium     |
| Deployment automation       | ❌ Not built | Low        |

---

## MVP Scope

### Goal

Ship a usable tool that lets developers build, test, and export ChatGPT Apps.

### Success Criteria

1. ✅ Developer can scaffold a new project with one command
2. ✅ Developer can preview widgets locally in the workbench
3. ✅ Developer can export a production-ready bundle
4. ✅ Exported bundle works when deployed to ChatGPT

### What's IN MVP

| Feature               | Description                           |
| --------------------- | ------------------------------------- |
| `chatgpt-app-studio`  | Scaffold new projects via npx         |
| `npm run dev`         | Start workbench for local development |
| `npm run export`      | Generate production bundle            |
| Starter template      | Basic widget + tool setup             |
| Export: widget bundle | Compiled HTML/JS for ChatGPT          |
| Export: manifest      | ChatGPT App manifest.json             |
| Documentation         | README, getting started guide         |

### What's NOT in MVP (deferred)

| Feature               | Why Defer                    |
| --------------------- | ---------------------------- |
| Tool definition UI    | JSON/code is fine for MVP    |
| Multiple templates    | One good template is enough  |
| Deployment automation | Manual deploy is fine        |
| Visual testing        | Nice to have, not essential  |
| Team sharing          | Single developer focus first |

---

## Short-Term Roadmap

### Phase 1: Export Feature ✅ COMPLETE

**Goal:** Generate a production-ready widget bundle from the workbench.

**What "export" produces:**

```
export/
├── widget.html             # Self-contained widget with inlined JS/CSS
├── manifest.json           # ChatGPT App manifest
└── README.md               # Deployment instructions
```

**Tasks:**

- [x] Create export directory structure
- [x] Bundle widget with esbuild to single HTML
- [x] Inject `window.openai` bridge script for iframe communication
- [x] Generate manifest.json from widget config
- [x] Generate README with deployment steps
- [x] Add "Export" button to workbench UI
- [x] Compile Tailwind CSS via PostCSS

**Files created:**

```
lib/export/
├── index.ts                # Main export function
├── bundler.ts              # esbuild bundling
├── compile-css.ts          # Tailwind CSS compilation
├── generate-html.ts        # HTML wrapper generation
├── generate-manifest.ts    # Manifest generation
├── production-provider.tsx # Production OpenAI bridge
└── types.ts                # Export config types
```

### Phase 2: CLI Foundation ✅ COMPLETE

**Goal:** Create the scaffolding CLI.

**Commands:**

```bash
npx chatgpt-app-studio my-app   # Scaffold new project
npm run dev                      # Start workbench (in generated project)
npm run export                   # Export production bundle
```

**Tasks:**

- [x] Set up CLI package structure
- [x] Implement interactive prompts (project name, description)
- [x] Copy template files and update package.json
- [x] Detect package manager (npm/yarn/pnpm/bun)
- [x] Add progress indicators and helpful output
- [x] Handle errors gracefully
- [x] Add `--help` and `--version` flags
- [x] Node.js version validation (>=20.9.0)

**Files created:**

```
packages/cli/                     # Renamed from packages/chatgpt-app-studio
├── package.json
├── bin/
│   └── chatgpt-app-studio.js
├── src/
│   ├── index.ts              # Main CLI entry
│   └── utils.ts              # Helpers (copy, validate, etc.)
└── templates/
    └── starter/              # Template files
```

### Phase 3: Project Template ✅ COMPLETE

**Goal:** Create a complete starter template with workbench and examples.

**Generated project structure:**

```
my-app/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # Redirects to workbench
│   ├── workbench/
│   │   └── page.tsx          # Dev workbench
│   └── api/
│       ├── export/           # Export API route
│       └── mcp-proxy/        # MCP proxy (dev only)
│
├── components/
│   ├── workbench/            # Workbench UI components
│   └── examples/             # Example widgets (POI Map, Welcome)
│
├── lib/
│   ├── workbench/            # Workbench logic, store, types
│   └── export/               # Export pipeline
│
└── server/                   # Optional MCP server (if selected)
    ├── package.json
    ├── src/
    │   ├── index.ts          # MCP server entry
    │   └── tools/            # Tool handlers
    └── vercel.json           # Deploy config
```

**Tasks:**

- [x] Create starter template with all workbench features
- [x] Include POI Map and Welcome Card examples
- [x] Set up export pipeline in template
- [x] Optional MCP server generation
- [x] Package manager detection and appropriate commands
- [x] Print clear next steps after scaffolding

### Phase 4: Documentation & Polish ✅ COMPLETE

**Goal:** Make the tool usable by others.

**Tasks:**

- [x] Write README with getting started guide
- [x] Document known issues for v1
- [x] Add `--help` and `--version` to CLI
- [x] Clean up console output with @clack/prompts
- [x] Fix security issues from code review (postMessage origin, CORS config)
- [x] Add tool name collision detection in MCP generation
- [x] Add console entry limit (500 max) to prevent memory issues
- [x] Fix shell metacharacter quoting in CLI output

---

## Medium-Term Roadmap

_After MVP ships (weeks 3-6)_

### Tool Definition UI

Add a UI in the workbench for defining tools without writing JSON:

```
┌─────────────────────────────────────────────────────────────┐
│  Define Tool: search_locations                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Name: [search_locations_______________]                    │
│                                                             │
│  Description:                                               │
│  [Search for locations by query and coordinates___________] │
│                                                             │
│  Parameters:                                                │
│  ┌────────────────────────────────────────────────────────┐│
│  │  query      string    required    [×]                  ││
│  │  location   object    required    [×]                  ││
│  │   ├─ lat    number    required                         ││
│  │   └─ lng    number    required                         ││
│  │  limit      number    optional    [×]                  ││
│  │                                   [+ Add Parameter]    ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  [Save Tool]  [Generate Mock Data]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Tasks:**

- [ ] Design tool definition data model
- [ ] Create parameter editor component
- [ ] Support nested objects and arrays
- [ ] Generate TypeScript types from definitions
- [ ] Generate mock data from schemas
- [ ] Persist tool definitions

### MCP Server Scaffolding ✅ COMPLETE

Generate a deployable MCP server from tool definitions.

**What was built:**

```
server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts            # Server entry with MCP SDK
│   ├── tools/
│   │   ├── types.ts        # Tool handler types
│   │   ├── [tool-name].ts  # Individual handlers
│   │   └── index.ts        # Exports
├── .env.example
├── vercel.json             # Deploy config
└── README.md
```

**Implementation:**

- Uses `@modelcontextprotocol/sdk` with `StreamableHTTPServerTransport`
- Widget registered as MCP resource with `text/html+skybridge` MIME type
- Tool handlers generated with default responses from workbench mock data
- Zod schemas generated from JSON Schema definitions
- OpenAI-specific metadata (`openai/outputTemplate`, etc.) properly included
- Available via `exportWidget()` with `includeServer: true` option

**Files:**

```
lib/export/mcp-server/
├── types.ts              # MCPServerConfig, MCPToolConfig
├── generate-server.ts    # Server entry generator
├── generate-tools.ts     # Tool handler generator
├── generate-configs.ts   # package.json, tsconfig, vercel.json
└── index.ts              # Main exports
```

### More Widget Examples

Add 2-3 more complete widget examples:

| Widget          | Description                                |
| --------------- | ------------------------------------------ |
| Data Table      | Sortable, filterable table with pagination |
| Form Wizard     | Multi-step form with validation            |
| Chart Dashboard | Interactive charts with filters            |

**Tasks:**

- [ ] Design each widget
- [ ] Implement with full SDK integration
- [ ] Add to template options
- [ ] Document patterns used

### CLI Enhancements

```bash
chatgpt-app add tool <name>       # Scaffold a new tool
chatgpt-app add widget <name>     # Scaffold a new widget
chatgpt-app generate types        # Generate TS types from tools
chatgpt-app validate              # Validate project structure
```

### Developer Onboarding ⭐ HIGH PRIORITY

Help developers understand ChatGPT Apps before they start building.

**Problem:** Developers scaffold a project and see the workbench, but don't understand:

- What is a ChatGPT App?
- How does the widget ↔ MCP server relationship work?
- When do I need an MCP server vs. not?
- What can I build with this?

**Tasks:**

- [ ] First-run welcome modal explaining the mental model
- [ ] Interactive tutorial: "Build your first widget in 5 minutes"
- [ ] Annotated example widgets explaining SDK patterns
- [ ] Decision tree: "Do I need an MCP server?"
- [ ] Gallery of real-world use cases / inspiration

### Hooks API Documentation ✅ COMPLETE

Make the React hooks layer discoverable and well-documented.

**Problem:** Developers don't know what hooks are available (`useToolInput`, `useTheme`, `useDisplayMode`, etc.) or how to use them. They have to dig through `lib/workbench/` source code.

**What was built:**

- [x] Create `lib/workbench/README.md` with hooks reference
- [x] Add TypeScript examples for each hook
- [x] Document common patterns (loading states, error handling, transitions)
- [x] Export all hooks from `@/lib/workbench` for clean imports

**Deferred:**

- [ ] Add JSDoc comments to all exported hooks
- [ ] In-workbench "SDK Reference" panel (or enhance existing SDK Guide)

### Export Validation ✅ PARTIAL

Catch issues before deployment instead of discovering them in production.

**Problem:** `npm run export` is a black box. Developers don't know if their export will work until they deploy to ChatGPT.

**What was built:**

- [x] Bundle size analysis with warnings (>500KB warning, >1MB critical)
- [x] Manifest schema validation (required fields, placeholder URL detection)
- [x] Success summary with next steps (clear deployment instructions)

**Deferred:**

- [ ] Browser compatibility check (flag Node.js-only APIs)
- [ ] Preview exported widget locally before deploy
- [ ] Dependency audit (flag problematic packages)

### Deployment Guidance ✅ COMPLETE

Provide clear, actionable deployment instructions.

**Problem:** "Deploy to ChatGPT" is hand-wavy. README says "register in ChatGPT Apps dashboard" but doesn't link to it or explain the process.

**What was built:**

- [x] Direct link to ChatGPT Apps dashboard in export output and README
- [x] Step-by-step deployment guide (Vercel, Netlify, any static host)
- [x] Verification checklist before submitting
- [x] Troubleshooting guide for common issues (blank page, CORS, loading)

**Deferred:**

- [ ] Screenshots in deployment guide (requires external hosting)

### Developer Experience Polish ✅ PARTIAL

Reduce friction in the development workflow.

**What was built:**

- [x] Single-command dev server: `npm run dev` starts both Next.js + MCP server
  - Created `scripts/dev.ts` that detects if `server/` exists
  - Runs both processes with labeled output (`[next]`, `[server]`)
  - Proper cleanup on Ctrl+C
  - Warns if server deps not installed

**Deferred:**

- [ ] Auto-discover widgets from `components/widgets/` convention (no manual registry)
- [ ] Better error messages with actionable fixes
- [ ] Hot reload improvements for faster iteration
- [ ] "New widget" scaffolding within existing project

### Testing Infrastructure

Enable developers to test their widgets properly.

**Tasks:**

- [ ] vitest setup in generated template
- [ ] Example widget test file demonstrating patterns
- [ ] Testing utilities for SDK hooks (mock providers)
- [ ] GitHub Actions CI template
- [ ] Guide: "How to test your ChatGPT App"

---

## Long-Term Roadmap

_Future considerations (month 2+)_

### Deployment Automation

```bash
chatgpt-app deploy --platform vercel
```

- [ ] Vercel integration
- [ ] Cloudflare Workers integration
- [ ] GitHub Actions templates
- [ ] Environment variable management

### Visual Testing

- [ ] Screenshot comparison across device presets
- [ ] Accessibility testing (axe integration)
- [ ] Visual regression CI

### Record & Replay

- [ ] Record tool calls and responses
- [ ] Save as replayable scenarios
- [ ] Use for demos and testing

### Team Features

- [ ] Share workbench configurations
- [ ] Cloud sync for scenarios
- [ ] Collaborative editing

### MCP ext-apps Support

_If/when MCP ext-apps matures:_

- [ ] Add MCP adapter
- [ ] Multi-platform build targets
- [ ] Platform-agnostic hooks

See [Future Considerations](#future-considerations) for more detail.

---

## Technical Architecture

### Project Structure (Current)

```
chatgpt-app-studio/
├── app/
│   ├── workbench/           # Workbench pages
│   └── api/                 # API routes
│
├── components/
│   ├── workbench/           # Workbench UI components (code-block, shared)
│   └── examples/            # Example widget apps (poi-map, welcome-card)
│
├── lib/
│   ├── workbench/           # Workbench logic
│   │   ├── store.ts         # Zustand store
│   │   ├── openai-context.tsx  # window.openai simulation
│   │   ├── types.ts
│   │   └── mock-config/
│   └── export/              # NEW: Export logic
│
└── packages/
    └── cli/                 # Scaffolding CLI (npx chatgpt-app-studio)
```

### Key Abstractions

**1. OpenAI Context (`lib/workbench/openai-context.tsx`)**

Provides the simulated `window.openai` API:

```typescript
interface WindowOpenAI {
  // Globals
  theme: "light" | "dark";
  locale: string;
  displayMode: "inline" | "pip" | "fullscreen";
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  widgetState: Record<string, unknown> | null;

  // Methods
  callTool(name: string, args: object): Promise<ToolResult>;
  setWidgetState(state: object): void;
  requestDisplayMode(args: { mode: string }): Promise<void>;
  sendFollowUpMessage(args: { prompt: string }): Promise<void>;
  openExternal(args: { href: string }): void;
  // ... etc
}
```

**2. Workbench Store (`lib/workbench/store.ts`)**

Zustand store managing all workbench state:

- Selected component
- Display mode, theme, locale
- Tool input/output
- Console logs
- Mock configuration
- Panel visibility

**3. Mock System (`lib/workbench/mock-config/`)**

Configurable mock responses for tools:

- Multiple variants per tool (success, error, empty, slow)
- Configurable delays
- Custom response data

### Export Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Export Process                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Read widget source                                      │
│     └─► widgets/main/index.tsx                              │
│                                                             │
│  2. Bundle with Vite/esbuild                                │
│     └─► Single JS file with all dependencies                │
│                                                             │
│  3. Generate HTML wrapper                                   │
│     └─► index.html with inlined JS/CSS                      │
│                                                             │
│  4. Inject bridge script                                    │
│     └─► Communication with ChatGPT host                     │
│                                                             │
│  5. Generate manifest                                       │
│     └─► manifest.json for ChatGPT registration              │
│                                                             │
│  6. Output to export/                                       │
│     └─► Ready for deployment                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Future Considerations

### MCP ext-apps Support

MCP ext-apps is an emerging open standard for building interactive UIs in AI chat interfaces. It's currently in draft status but may mature.

**When to add MCP support:**

- The spec stabilizes (no longer "draft")
- Multiple hosts support it (beyond Claude Desktop)
- Developers request it
- ChatGPT support is stable

**How we'd add it:**

1. Create adapter abstraction (RuntimeAdapter interface)
2. Refactor current code to use ChatGptAdapter
3. Add McpAdapter using official SDK
4. Add build target selection (`--target mcp`)

**Why we're deferring:**

- Spec is unstable
- Market is small
- Adds complexity
- ChatGPT is the priority

### Platform-Agnostic Hooks

If we add MCP support, we'd want hooks that work across platforms:

```typescript
// Instead of using window.openai directly:
const result = await window.openai.callTool("search", args);

// Use platform-agnostic hooks:
const callTool = useCallTool();
const result = await callTool("search", args);
```

This would be implemented via the adapter pattern:

```typescript
interface RuntimeAdapter {
  callTool(name: string, args: object): Promise<ToolResult>;
  getDisplayMode(): DisplayMode;
  requestDisplayMode(mode: DisplayMode): Promise<void>;
  // ... etc
}

class ChatGptAdapter implements RuntimeAdapter { ... }
class McpAdapter implements RuntimeAdapter { ... }
class WorkbenchAdapter implements RuntimeAdapter { ... }
```

---

## Open Questions

### Resolved ✅

| Question                  | Decision                                           |
| ------------------------- | -------------------------------------------------- |
| **Naming**                | "ChatGPT App Studio" (`chatgpt-app-studio` on npm) |
| **Build tool**            | esbuild for speed; Tailwind via PostCSS            |
| **Template structure**    | Single package with Next.js App Router             |
| **CSS strategy**          | Tailwind CSS v4 required (included in template)    |
| **Minimum viable export** | HTML bundle + manifest + optional MCP server       |

### Still Open

1. **Business model:** Open source? Freemium?
   - Currently planning open source release
   - Sustainability model TBD

2. **Distribution:** npm only, or also a hosted playground?
   - Currently npm-only via `npx chatgpt-app-studio`

3. **Testing the export:**
   - Manual testing against ChatGPT Apps beta
   - No automated integration tests yet

---

## Appendix: ChatGPT Apps API Reference

### window.openai Globals (Read-only)

| Property               | Type                                | Description                                    |
| ---------------------- | ----------------------------------- | ---------------------------------------------- |
| `theme`                | `"light" \| "dark"`                 | Current theme                                  |
| `locale`               | `string`                            | User's locale (e.g., "en-US")                  |
| `displayMode`          | `"inline" \| "pip" \| "fullscreen"` | Current display mode                           |
| `previousDisplayMode`  | `"inline" \| "pip" \| "fullscreen"` | Display mode before current (for transitions)  |
| `maxHeight`            | `number`                            | Max height in inline mode                      |
| `toolInput`            | `object`                            | Input from the tool that triggered this widget |
| `toolOutput`           | `object \| null`                    | Output from the most recent tool call          |
| `toolResponseMetadata` | `object \| null`                    | Metadata from tool response                    |
| `widgetState`          | `object \| null`                    | Persisted widget state                         |
| `userAgent`            | `object`                            | Device info and capabilities                   |
| `safeArea`             | `object`                            | Safe area insets for fullscreen                |
| `view`                 | `object \| null`                    | Current view configuration                     |
| `userLocation`         | `object \| null`                    | User's location (if available)                 |

### window.openai Methods

| Method                            | Description                      |
| --------------------------------- | -------------------------------- |
| `callTool(name, args)`            | Call an MCP tool                 |
| `setWidgetState(state)`           | Persist widget state             |
| `requestDisplayMode({ mode })`    | Request display mode change      |
| `sendFollowUpMessage({ prompt })` | Send message to ChatGPT          |
| `openExternal({ href })`          | Open URL in new tab              |
| `requestClose()`                  | Request widget close             |
| `requestModal({ title, params })` | Show modal overlay               |
| `notifyIntrinsicHeight(height)`   | Report widget's intrinsic height |
| `uploadFile(file)`                | Upload file                      |
| `getFileDownloadUrl({ fileId })`  | Get download URL                 |

---

## Changelog

| Date       | Changes                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------- |
| 2024-12-29 | Initial plan (MCP-first approach)                                                                 |
| 2024-12-29 | Revised to ChatGPT-first approach                                                                 |
| 2024-12-30 | MVP complete: CLI, export, project scaffolding                                                    |
| 2024-12-30 | MCP server generation complete                                                                    |
| 2025-12-31 | Pre-release polish: security fixes, collision detection                                           |
| 2025-12-31 | Updated PLAN.md: marked phases complete, resolved questions                                       |
| 2025-12-31 | Renamed packages/chatgpt-app-studio → packages/cli                                                |
| 2025-12-31 | Added high-priority roadmap items: onboarding, hooks docs, export validation, deployment guidance |
| 2025-12-31 | Added medium-priority items: DX polish, testing infrastructure                                    |
| 2025-12-31 | Completed Hooks API Documentation: `lib/workbench/README.md` with full hooks reference            |
| 2025-12-31 | Added Export Validation: bundle size analysis, manifest validation, enhanced success summary      |
| 2025-12-31 | Added Deployment Guidance: enhanced README with Vercel/Netlify steps, verification checklist      |
| 2025-12-31 | Added DX Polish: unified `npm run dev` starts both Next.js and MCP server automatically           |
