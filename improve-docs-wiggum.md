# Docs Improvement Progress (Wiggum)

## Goal
Find open-source projects using assistant-ui, improve docs to onboard new users faster.

## Session Log

### 2026-03-12 — Session 1

#### Research Findings

Top open-source repos using @assistant-ui/react:

| Repo | Stars | Version | Key Patterns |
|---|---|---|---|
| mastra-ai/mastra | 21,931 | ^0.12.10 | Shipped in `@mastra/playground-ui` npm package |
| afadil/wealthfolio | 7,140 | latest | `useExternalStoreRuntime`, 11x tool UIs, CSV attachments, thread persistence |
| microsoft/CopilotStudioSamples | 708 | ^0.10.9 | `react-ai-sdk`, Azure MSAL auth |
| opencmit/JoinAI-Agent | 260 | ^0.10.24 | MCP SDK + E2B + LangGraph |
| Th0rgal/sandboxed.sh | 300 | latest | `makeAssistantToolUI` receipt/confirmed state pattern |
| Yonom/assistant-ui-langgraph-fastapi | 186 | ^0.7.0 | LangGraph Python FastAPI + Next.js |
| ONLYOFFICE/desktop-sdk | 66 | present | Embedded in Chromium plugin for office suite |

Key findings:
- **wealthfolio** is the gold standard for `useExternalStoreRuntime` in production
- **Mastra** is the biggest indirect consumer (~22k stars)
- **Microsoft** validated the library for enterprise use

#### Changes Made

1. **`apps/docs/lib/examples.ts`** — Added 2 community examples:
   - Wealthfolio (7k stars, ExternalStoreRuntime gold standard)
   - Microsoft CopilotStudio Samples (enterprise Azure integration)
   - Downloaded OG preview screenshots to `public/screenshot/examples/`

2. **`apps/docs/content/docs/runtimes/custom/external-store.mdx`** — Added:
   - Callout at top referencing Wealthfolio as real-world production reference
   - Wealthfolio link in Related Resources section at bottom

### 2026-03-12 — Session 2

#### Additional Repos Found

| Repo | Stars | Version | Key Patterns |
|---|---|---|---|
| readest/readest | 18,655 | 0.11.56 | Cross-platform Tauri ebook reader, react-ai-sdk + react-markdown |
| MODSetter/SurfSense | 13,234 | latest | NotebookLM alt, read-only ExternalStoreRuntime for public chat replay |
| VoltAgent/voltagent | 6,679 | latest | AI agent framework, official assistant-ui starter template |
| AgentOps-AI/agentops | 5,359 | latest | Agent observability, ExternalStoreRuntime for recorded session replay |
| MiguelsPizza/WebMCP | 1,038 | latest | Browser extension sidepanel + MCP tools |
| bytechefhq/bytechef | 736 | latest | n8n alternative, embeddable chat SDK with SSE + attachments |

#### Changes Made

1. **`apps/docs/lib/examples.ts`** — Added 4 more community examples (sorted by stars):
   - Readest (18k stars, Tauri cross-platform ebook reader)
   - SurfSense (13k stars, NotebookLM alternative)
   - VoltAgent (6.7k stars, AI agent framework)
   - AgentOps (5.4k stars, agent observability dashboard)
   - Downloaded OG preview screenshots for all 4

2. **`apps/docs/content/docs/(docs)/index.mdx`** — Added "Seen in the Wild" section:
   - Table of 8 notable OSS projects with star counts and descriptions
   - Social proof that builds new-user trust immediately on landing page

3. **`apps/docs/content/docs/(docs)/guides/tool-ui.mdx`** — Added "Real-World Examples" section:
   - Links to Wealthfolio's 11 tool UIs, AgentOps replay pattern, LangGraph stockbroker

4. **`apps/docs/content/docs/runtimes/ai-sdk/v6.mdx`** — Added "Real-World Examples" section:
   - Readest (18k), VoltAgent (6.7k), Microsoft Copilot Studio as `useChatRuntime` references

### 2026-03-12 — Session 3

#### Real Code Extracted

- **VoltAgent** — Uses server-side orchestration (NOT `sendAutomaticallyWhen`). Agent calls tools internally and returns single streamed response.
- **SurfSense** — Read-only `useExternalStoreRuntime`: `isRunning: false`, no-op `onNew`, no `ComposerPrimitive`. Confirmed pattern.
- **WebMCP** — Uses `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls` from `ai` package. Custom headers for model provider/name/key routing. Uses `runtime.registerModelContextProvider` to inject MCP tools dynamically.

#### Changes Made

1. **`apps/docs/content/docs/runtimes/ai-sdk/v6.mdx`** — Added two new API reference sections:
   - `sendAutomaticallyWhen` — client-side agentic loop with `lastAssistantMessageIsCompleteWithToolCalls`
   - Custom headers for dynamic model routing — multi-provider pattern with header-based dispatch
   - Fixed VoltAgent description (server-side, not sendAutomaticallyWhen)

2. **`apps/docs/content/docs/runtimes/custom/external-store.mdx`** — Added "Read-Only Conversation Viewer" pattern:
   - `isRunning: false` + no-op `onNew` + no Composer = public share viewer
   - SurfSense callout (13k stars)
   - Also shows `ReadonlyThreadProvider` alternative

3. **`apps/docs/content/docs/(docs)/guides/multi-agent.mdx`** — Added "Client-Side Agentic Loops" section:
   - `sendAutomaticallyWhen` vs server-side orchestration comparison table
   - Links to AI SDK v6 reference

4. **`apps/docs/content/docs/(docs)/copilots/model-context.mdx`** — Added "Dynamic Tool Registration" section:
   - `runtime.registerModelContextProvider` for runtime-discovered tools (MCP servers, user config)
   - WebMCP callout (1k stars) as real-world reference

### 2026-03-13 — Session 4

#### Research Findings

- **`updateToolResult`** — Searched GitHub; wealthfolio's `updateToolResult` is their own Tauri/SQLite adapter, NOT from @assistant-ui/react. The standard pattern is `addResult` from tool UI render props.
- **`usePersistentState`** — wealthfolio's own localStorage hook, not from @assistant-ui/react. Standard pattern is `useState` + localStorage.
- **No new 1000+ star repos** found using assistant-ui in this session.
- **`@assistant-ui/react-native`** — Only netzbegruenung/Gruenerator found publicly. Very limited adoption.
- New minor finds: `instavm/coderunner-ui` (199 stars) uses `useAssistantInstructions` with capability descriptions.

#### Changes Made

1. **`apps/docs/content/docs/(docs)/guides/tool-ui.mdx`**:
   - Fixed missing `await` on `convertToModelMessages` in Quick Start backend example
   - Added **"Stateful View Modes"** pattern — `useState` for toggling between chart/table views
   - Added **"Form Submission with Confirmed State"** pattern — using `addResult` to lock in `submitted: true` state so form doesn't re-appear on re-render. Wealthfolio production callout.

2. **`apps/docs/content/docs/(docs)/guides/tools.mdx`**:
   - Fixed 3 instances of missing `await` on `convertToModelMessages`

3. **Multiple other docs** — Fixed missing `await` on `convertToModelMessages` in:
   - `apps/docs/content/docs/react-native/index.mdx` (3 instances)
   - `apps/docs/content/docs/(reference)/api-reference/integrations/vercel-ai-sdk.mdx` (1 instance)
   - `apps/docs/content/docs/ui/model-selector.mdx` (1 instance)
   - **Total: All remaining instances of this AI SDK v6 async bug are now fixed across all docs**

### 2026-03-12 — Session 5

#### New Repos Found

| Repo | Stars | Key Patterns |
|---|---|---|
| stack-auth/stack | 6,733 | YC S24 auth platform; useLocalRuntime + ThreadHistoryAdapter + toolComponents prop pattern |
| bytechefhq/bytechef | 736 | Latest 0.12.x; ExternalStoreRuntime + AG-UI protocol + published npm SDK |
| cyberdesk-hq/cyberdesk | 308 | Computer-use agent + assistant-ui chat interface pattern |
| speakeasy-api/gram | 215 | Config-driven AssistantModal + framer-motion animations |

#### Changes Made

1. **`apps/docs/lib/examples.ts`** — Added 3 community examples:
   - **Gram** (speakeasy-api/gram) — AI code review with framer-motion AssistantModal
   - **Stack Auth** (stack-auth/stack, 6.7k stars) — YC S24 auth platform with prop-driven AssistantChat
   - **ByteChef** (bytechefhq/bytechef, 736 stars) — AI workflow automation with AG-UI + ExternalStoreRuntime
   - Downloaded OG screenshots for stack-auth.png, bytechef.png

2. **`apps/docs/content/docs/(docs)/index.mdx`** — Updated "Seen in the Wild" table:
   - Added Stack Auth (6.7k stars) and ByteChef (700+ stars)

3. **`apps/docs/content/docs/ui/assistant-modal.mdx`** — Added "Patterns" section:
   - **Framer Motion Animations** — Full pattern using controlled `open` state + `AnimatePresence` + `motion.div`
   - **Controlled Open State** — Keyboard shortcut pattern (⌘K) to toggle modal programmatically

4. **`apps/docs/content/docs/(docs)/copilots/make-assistant-readable.mdx`** — Added "Patterns" section:
   - Data Table pattern
   - Clickable Action Buttons pattern
   - Combining with `useAssistantInstructions` pattern
   - Related components section

5. **`apps/docs/content/docs/runtimes/custom/local.mdx`** — Added "Reusable AssistantChat Component Pattern":
   - Props-based pattern: accepts `ChatModelAdapter + ThreadHistoryAdapter + toolComponents`
   - Production callout for Stack Auth (6.7k stars, YC S24)

### 2026-03-13 — Session 6

#### Changes Made

1. **`apps/docs/content/docs/(docs)/guides/context-api.mdx`** — Added 3 new "Common Patterns":
   - **Suggestion Buttons (append vs. setText)** — `aui.thread().append()` sends immediately; `aui.composer().setText()` stages text for after run ends. Production callout for Unsloth (53k stars).
   - **Edit While Running (Cancel + Resend)** — `useAuiEvent("thread.runEnd")` + a `resendAfterCancelRef` flag to auto-resend after cancel. Enables edit-while-running UX.
   - **Inline Thread Rename** — `aui.threadListItem().rename()` for auto-naming threads from first message content.

2. **`apps/docs/content/docs/(docs)/guides/editing.mdx`** — Rewrote from 57 to ~130 lines:
   - Added full ExternalStoreRuntime editing pattern with `onEdit` callback
   - Added "Auto-Resend After Edit" pattern using `useAuiEvent("thread.runEnd")` + programmatic editor
   - Added `MessagePrimitive.If editing={false}` pattern for hiding content during edit mode
   - Added API reference for `ActionBarPrimitive.Edit`, `ComposerPrimitive.Cancel`, `ComposerPrimitive.Send`, and `onEdit`

3. **`apps/docs/content/docs/(docs)/guides/branching.mdx`** — Rewrote from 61 to ~100 lines:
   - Added Programmatic Navigation section with `aui.message().switchToBranch()`
   - Added Conditional Rendering by Branch section with `MessagePrimitive.If hasBranches`
   - Added ExternalStoreRuntime `setMessages`/`onReload` patterns for custom state management

### 2026-03-13 — Session 7

#### New Repos Found

| Repo | Stars | Key Patterns |
|---|---|---|
| openops-cloud/openops | 1,003 | useAISDKRuntime + sendAutomaticallyWhen + BaseToolWrapper collapsible + chain-of-thought Reasoning + MermaidRenderer |

#### Changes Made

1. **`apps/docs/content/docs/(docs)/guides/tool-ui.mdx`**:
   - Added **"Multi-Step Wizard UI"** pattern — multi-page form with `useState` tracking step (upload → preview → mapping → confirm), calling `addResult` only at final step. Inspired by Wealthfolio's CSV import wizard.
   - Added **"Reusable Tool Wrapper"** pattern — `BaseToolWrapper` shared wrapper with status check/X/spinner icon and expand/collapse. Production callout for OpenOps (1k stars).

2. **`apps/docs/content/docs/(docs)/guides/speech.mdx`** — Rewrote from 41 to ~130 lines:
   - Added UI components section with `ActionBarPrimitive.Speak`/`ActionBarPrimitive.StopSpeaking` and `AuiIf` conditional
   - Added custom adapter interface example
   - Added ElevenLabs TTS adapter example (full implementation)
   - Added `useAuiState` reading speaking state example

3. **`apps/docs/content/docs/(docs)/guides/context-api.mdx`** — Added pattern:
   - **"Auto-Generate Thread Title After Run"** — `threadRuntime.unstable_on("runEnd", ...)` to derive titles from first message. Production callout for Exograph (344 stars).

4. **`apps/docs/content/docs/(docs)/guides/tools.mdx`** — Added "Patterns" section:
   - **Permission-Checked Tools** — `usePermissionCheckedTool` wrapper that returns `{status: "rejected"}` on permission failure instead of throwing. Production callout for Nussknacker (713 stars).
   - **Registration-via-Render Pattern** — null-rendering React components as self-contained tool registrations that can access React context.

5. **`apps/docs/content/docs/(docs)/architecture.mdx`** — Added "Design System Integration" section:
   - `asChild` pattern with MUI Chip + SuggestionPrimitive.Trigger example
   - Context-aware suggestions by page/route
   - Three-layer table comparing pre-built, primitives+asChild, and Context API
   - Production callout for VerifyWise (237 stars, MUI full chat UI)

6. **`apps/docs/lib/examples.ts`** — Added 4 new community examples:
   - OpenOps (1k stars, FinOps automation)
   - Nussknacker (713 stars, stream processing)
   - Exograph (344 stars, GraphQL backend)
   - VerifyWise (237 stars, AI governance)

7. **`apps/docs/content/docs/(docs)/index.mdx`** — Added 4 new entries to "Seen in the Wild" table

8. **Screenshots downloaded**: openops.png, nussknacker.png, exograph.png, verifywise.png

9. **`apps/docs/content/docs/runtimes/ai-sdk/v6.mdx`** — Added:
   - **"Forwarding Registered Tools to Custom Backend"** — `runtimeRef` + `getModelContext().tools` pattern to inject registered tool schemas into each outbound request. Inspired by OpenOps.
   - Added OpenOps and VerifyWise to Real-World Examples section

10. **`apps/docs/content/docs/runtimes/custom/local.mdx`** — Added:
    - **"Custom SSE ChatModelAdapter"** — Full custom SSE streaming adapter example with typed event parsing (start/delta/tool/stop/error/aborted). Production callout for Nussknacker (713 stars).

### 2026-03-13 — Session 8

#### Changes Made

1. **`apps/docs/content/docs/ui/assistant-modal.mdx`** — Added "CSS Animations (No Library Required)" pattern:
   - Uses Radix UI `data-[state=open]` / `data-[state=closed]` with Tailwind `animate-in`/`animate-out`
   - No framer-motion dependency needed
   - Shows trigger icon rotation via `group-data-[state=open]`

2. **`apps/docs/content/docs/(docs)/guides/context-api.mdx`** — Added "Triggering Messages from External Systems" pattern:
   - Global runtime singleton bridge for Redux/external integration
   - `runtime.thread.append()` from outside React tree
   - Production callout for Nussknacker (713 stars)

3. **`apps/docs/content/docs/(docs)/guides/embedding.mdx`** — **Created new guide**:
   - "Embedding in Existing Apps" — how to add AI to an existing React app
   - Mode 1: Floating Modal, Mode 2: Panel/Sidebar
   - `useAssistantInstructions` for page-aware context
   - `makeAssistantVisible` for page content visibility
   - Global runtime singleton for programmatic triggering
   - Per-page tool registration with `useAssistantTool`
   - Provider placement best practices

4. **`apps/docs/content/docs/(docs)/guides/meta.json`** — Added `"embedding"` to pages array

5. **`apps/docs/content/docs/(docs)/installation.mdx`** — Added "Embed in an Existing App" card to What's Next section

6. **`apps/docs/content/docs/(docs)/index.mdx`** — Added "Embed in an Existing App" card to What's Next section

7. **`apps/docs/content/docs/(docs)/guides/chain-of-thought.mdx`** — Added OpenOps production callout (1k stars, chain-of-thought reasoning for cloud cost optimization)

8. **`apps/docs/content/docs/(docs)/guides/suggestions.mdx`** — Improved "Context-Aware Suggestions" section:
   - Replaced generic example with route-based dynamic suggestions pattern
   - Added VerifyWise production callout (237 stars, page-aware suggestions)

### 2026-03-13 — Session 9

#### Changes Made

1. **`apps/docs/content/docs/runtimes/ag-ui.mdx`** — **Created new AG-UI runtime docs page**:
   - Installation, Quick Start (frontend + Python backend example)
   - `useAgUiRuntime` configuration reference
   - Multi-thread support with `threadList` adapter pattern
   - Supported events table (TEXT_MESSAGE, THINKING, TOOL_CALL, STATE, etc.)
   - ByteChef production callout (700+ stars)
   - Links to with-ag-ui example

2. **`apps/docs/content/docs/runtimes/meta.json`** — Added `"ag-ui"` to runtimes navigation

3. **`apps/docs/content/docs/runtimes/pick-a-runtime.mdx`** — Updated:
   - Added AG-UI to decision tree mermaid diagram
   - Added AG-UI card to Pre-Built Integrations section
   - Added AG-UI to architecture explanation ("Built on ExternalStoreRuntime")
   - Added AG-UI example to examples list

#### New Repos Found (Research Agent)

| Repo | Stars | Key Patterns |
|---|---|---|
| potpie-ai/potpie | 5,280 | Spec-driven dev, useChatRuntime, knowledge graph codebase understanding |
| tiann/hapi | 2,640 | Remote AI coding app (Claude Code/Codex/Gemini), useExternalStoreRuntime |
| stellarlinkco/codex | 394 | Open-source coding agent, useExternalStoreRuntime |
| proliferate-ai/proliferate | 237 | Background AI agent, useExternalStoreRuntime |
| tercumantanumut/selene | 146 | Multi-platform agent hub (WhatsApp/Telegram/Slack), useChatRuntime |
| SeloSlav/2d-multiplayer-survival-mmorpg | 136 | In-game AI chat in multiplayer game, useChatRuntime |
| instructa/constructa-starter | 123 | AI-First SaaS starter kit, data stream runtime |
| flora131/atomic | 117 | Autonomous coding agent, useExternalStoreRuntime |

#### Changes Made

4. **`apps/docs/lib/examples.ts`** — Added 2 new community examples:
   - Potpie (5.2k stars, AI code development)
   - Hapi (2.6k stars, remote AI coding)
   - Downloaded OG screenshots for both

5. **`apps/docs/content/docs/(docs)/index.mdx`** — Added Potpie and Hapi to "Seen in the Wild" table

### 2026-03-13 — Session 10

#### Changes Made

1. **`apps/docs/content/docs/runtimes/a2a.mdx`** — **Created new A2A runtime docs page**:
   - Installation, Quick Start with SSE streaming pattern
   - `useA2ARuntime` configuration reference
   - `useA2ATaskState`, `useA2AArtifacts` hooks for reading task progress and produced artifacts
   - Supported events table (task-update, task-complete, artifacts, etc.)
   - A2AMessage type reference

2. **`apps/docs/content/docs/runtimes/meta.json`** — Added `"a2a"` to runtimes navigation

3. **`apps/docs/content/docs/runtimes/pick-a-runtime.mdx`** — Updated:
   - Added A2A to decision tree mermaid diagram
   - Added A2A card to Pre-Built Integrations section
   - Added A2A to architecture explanation ("Built on ExternalStoreRuntime")

### 2026-03-13 — Session 11

#### Research Conducted

- **Wealthfolio deep-dive**: Read full `use-chat-runtime.ts` (~500 lines), tool-uis registry, tool-fallback component. Extracted 3 production patterns:
  1. RAF-based streaming throttle (requestAnimationFrame batching for ~60fps)
  2. Tool UI registry pattern (keyed map for 11+ tool UIs)
  3. Optimistic thread creation (adding threads to TanStack Query cache before server confirms)
- **Microsoft CopilotStudio**: Inspected `AssistantUICopilotStudioClient` — uses standard `useChatRuntime`, no unique enterprise auth patterns to extract.
- **Reviewed for thin docs**: chain-of-thought, message-timing, attachments, suggestions, model-selector, installation, llm/agent-skills, data-stream, react-hook-form — all comprehensive. No major gaps found.

#### Changes Made

1. **`apps/docs/content/docs/runtimes/custom/external-store.mdx`** — Added 3 new production patterns:
   - **"Streaming with RAF Throttling"** — `requestAnimationFrame` batching to prevent 100s of re-renders during high-frequency streaming. Wealthfolio production callout.
   - **"Tool UI Registry Pattern"** — Centralized keyed map for organizing many tool UIs (5+) at scale, with dynamic registration.
   - **"Optimistic Thread Creation"** — Adding threads to sidebar cache immediately on first message, with delayed invalidation for server sync.

### 2026-03-13 — Session 12

#### Research Conducted

- **Potpie (`potpie-ai/potpie-ui`)**: Investigated — standard assistant-ui components generated via CLI, no unique patterns to extract
- **Hapi (`tiann/hapi`)**: Investigated — custom chat system with message normalization/reconciliation on top of assistant-ui, too complex and repo-specific to document as general patterns
- **Cyberdesk (`cyberdesk-hq/cyberdesk`, 308 stars)**: Investigated — uses `useChatRuntime` with custom headers to pass desktop ID for computer-use agent. Standard assistant-ui integration with side-by-side layout (chat + virtual desktop). No novel assistant-ui patterns
- **OpenOps (`openops-cloud/openops`, 1k stars)**: Investigated — uses `useAISDKRuntime` + `useChat` with auto-name-generation and frontend tool execution via `sendAutomaticallyWhen`. Custom history component (not using assistant-ui's ThreadList primitives). Patterns are backend-specific, not generalizable
- **SeloSlav MMORPG**: Could not find on GitHub — no public repo with assistant-ui integration exists
- **GitHub code search**: Found 21 repos using `useChatRuntime` — all previously known repos (wealthfolio, potpie-ui, unsloth, verifywise) plus many low-star repos (<15 stars) without novel patterns
- **Doc pages reviewed (all comprehensive, no changes needed)**: multi-agent.mdx, tool-ui.mdx, editing.mdx, speech.mdx, branching.mdx, context-api.mdx

#### Changes Made

1. **`apps/docs/content/docs/(docs)/guides/patterns.mdx`** — **Created new Production Patterns page** showcasing all patterns discovered across 12 sessions:
   - Streaming & Performance: RAF throttling, optimistic thread creation
   - Tool UIs at Scale: registry pattern, reusable wrapper, form submission with confirmed state
   - Co-Pilot Patterns: page-aware context injection, permission-checked tools, context-aware suggestions
   - Runtime Patterns: custom SSE adapter, dynamic headers, externally triggered messages, agentic loops
   - Layout Patterns: side-by-side chat + content, MUI/non-Tailwind integration
   - Data & Visualization: chart/table toggle, CSV attachment adapter
   - Each pattern includes production callout linking to the open-source repo where it's used

2. **`apps/docs/content/docs/(docs)/guides/meta.json`** — Added `"patterns"` as first entry in guides navigation

3. **`apps/docs/content/docs/(docs)/index.mdx`** — Added "Production Patterns" card to the What's Next section + 7 new repos to "Seen in the Wild" table (GROWI 1.4k, Adorable 682, PAI-RAG 438, Cyberdesk 308, JobSync 284)

4. **`apps/docs/lib/examples.ts`** — Added 4 new community examples: GROWI, Adorable, Cyberdesk, JobSync

5. **`apps/docs/content/docs/(docs)/guides/patterns.mdx`** — Added "System Capability Description" pattern from coderunner-ui (using `useAssistantInstructions` to describe system topology, tools, and workflow examples)

### 2026-03-13 — Session 13

#### Research Conducted

- **GROWI false positive cleanup**: Verified `repo:growilabs/growi @assistant-ui` returns 0 results. Removed GROWI from index.mdx and examples.ts
- **New repo search**: Searched GitHub code for `useChatRuntime`, `makeAssistantToolUI`, `useExternalStoreRuntime`, and `AssistantRuntimeProvider`. Found no new high-star repos (>200 stars) beyond those already documented
- **psd401/aistudio (2 stars)**: Deep investigation revealed 3 novel patterns despite low star count:
  1. Multi-provider tool name registration (same UI for OpenAI's `web_search_preview` and Google's `google_search`)
  2. Custom fetch interceptor on `AssistantChatTransport` for response header metadata
  3. `argsText` fallback for streaming tool args
- **Patterns page audit**: Background agent verified all 4 core APIs (`sendAutomaticallyWhen`, `useAssistantInstructions`, `makeAssistantToolUI`, `ThreadHistoryAdapter`) exist. Found missing imports in 2 code examples
- **Star count check**: ThinkEx-OSS/thinkex (35), web3insight-ai/web3insight (N/A), JeremyFabrikapp/supadmin (10), wagner-niklas/Alfred (65), Laihiujin/SYNAPSEAUTOMATION (47) — all too low for showcase

#### Changes Made

1. **`apps/docs/content/docs/(docs)/index.mdx`** — Removed GROWI false positive from "Seen in the Wild" table

2. **`apps/docs/lib/examples.ts`** — Removed GROWI false positive from community examples

3. **`apps/docs/content/docs/(docs)/guides/patterns.mdx`** — 3 improvements:
   - Fixed missing imports in "Reusable Tool Wrapper" pattern (added `useState`, `cn`)
   - Fixed missing imports in "Chart/Table Toggle" pattern (added `useState`, `cn`, `makeAssistantToolUI`)
   - Added **"Multi-Provider Tool Name Registration"** pattern — shared renderer registered under multiple provider-specific tool names with `argsText` fallback
   - Added **"Custom Transport Fetch Interceptor"** pattern — intercepting `AssistantChatTransport` fetch for response headers, error handling, and dynamic body builders

#### New Repos Found (Not Enough Stars for Showcase)

| Repo | Stars | Notes |
|---|---|---|
| proliferate-ai/proliferate | 237 | Background agent platform, custom coding session runtime |
| brekkylab/ailoy | 142 | Rust/WASM AI agent library, recommends assistant-ui in docs |
| instructa/constructa-starter | 123 | SaaS starter kit distributing assistant-ui |
| ONLYOFFICE/desktop-sdk | 66 | Major office suite, AI agent plugin using assistant-ui |
| muppet-dev/kit | 59 | MCP server debugger using assistant-ui as playground |

4. **`apps/docs/content/docs/(docs)/index.mdx`** — Removed JobSync false positive (doesn't use assistant-ui), updated Adorable description

5. **`apps/docs/lib/examples.ts`** — Removed JobSync false positive, updated Adorable description to reflect actual integration depth

#### Conclusion

No new high-star repos found. The ecosystem is growing through smaller projects and starter templates rather than new >1k-star adoptions. Patterns page has been hardened with import fixes and 2 new practical patterns. Docs quality continues to be high across all reviewed pages (assistant-sidebar, react-hook-form, langgraph, use-assistant-instructions — all comprehensive).

## Backlog / Next Session Ideas

- [x] Create a new guide: "Building production AI features with ExternalStoreRuntime" using wealthfolio patterns — added RAF streaming, tool UI registry, and optimistic thread creation patterns to external-store.mdx
- [ ] Add Microsoft CopilotStudio example doc with enterprise auth patterns (Azure MSAL)
- [x] Document AG-UI runtime — created ag-ui.mdx + updated pick-a-runtime
- [x] Document multi-step CSV import wizard pattern (wealthfolio `import-csv-tool-ui.tsx`) — added to tool-ui.mdx
- [x] CSS data-state animation for AssistantModal — added to assistant-modal.mdx
- [x] Redux integration: externally triggering messages via `runtime.thread.append()` — added to context-api.mdx
- [x] Embedding guide — created embedding.mdx
- [x] A2A (Agent-to-Agent) protocol runtime docs — created a2a.mdx + updated pick-a-runtime
- [x] Computer-use agent + assistant-ui chat interface pattern (cyberdesk) — investigated: standard useChatRuntime, no novel patterns
- [x] OpenOps multi-thread history management — investigated: custom history UI (not using ThreadList), backend-specific patterns
- [x] Potpie's knowledge graph + useChatRuntime pattern — investigated: standard CLI-generated components
- [x] Hapi's remote coding agent session bridge — investigated: custom chat system, too complex to extract
- [x] In-game AI chat pattern (SeloSlav MMORPG) — no public repo found
- [x] `instavm/coderunner-ui` (199 stars) — Investigated: three-state tool UI + useAssistantInstructions patterns already well-documented in existing guides
- [x] ExternalStoreRuntime branching limitation (#3161) — Added callout to branching.mdx
- [x] LangGraph thread-switching lifecycle (#2587) — Added lifecycle overview to langgraph/index.mdx
- [x] Outdated model names in installation.mdx — Updated Anthropic + Bedrock to latest
- [x] Stray code fence in suggestions.mdx — Fixed
- [ ] VerifyWise pattern: chart data generation with dual parsing (legacy text separator + modern tool invocation)
- [ ] Constructa-starter as a "SaaS template with assistant-ui" reference
- [ ] Add Microsoft CopilotStudio example doc with enterprise auth patterns (Azure MSAL)
- [ ] LangGraph HITL interrupt patterns (#2974) — Python-side interrupt patterns not documented
- [ ] Multi-agent tool UI rendering (#3030) — Multi-agent guide already covers this well, may not need changes
- [ ] Monitor for new high-star repos using assistant-ui

### 2026-03-13 — Session 14

#### Research Conducted

- **GitHub issues search**: Found 12 relevant issues, 7 still open. Key gaps: undocumented AttachmentSource values (#3477), unstable `components` prop causing streaming failures (#3478), missing HITL interrupt patterns (#2974)
- **Doc page reviews**: Reviewed attachments.mdx (642 lines), external-store.mdx, embedding.mdx — all high quality, no critical issues
- **pick-a-runtime.mdx**: Comprehensive (238 lines), includes decision tree, feature comparison, pitfalls — no changes needed
- **part-grouping.mdx**: Comprehensive (538 lines) but missing real-world example callout
- **tool-group.mdx**: Comprehensive (213 lines) — no changes needed
- **llm.mdx** (Agent Skills): Comprehensive (212 lines) with MCP, Skills, llms.txt — no changes needed
- **cloud/index.mdx**: Clean overview — no changes needed
- **Additional search**: Found psd401/aistudio has sophisticated patterns but only 2 stars. consuelohq/opensaas uses makeAssistantToolUI for CRM confirmations. No new high-star repos found

#### Changes Made

1. **`apps/docs/content/docs/(docs)/guides/attachments.mdx`** — Added "Attachment Sources" section:
   - Documented the 3 source values: `"thread-composer"`, `"edit-composer"`, `"message"`
   - Table showing where each source renders and which component provides it
   - Code example showing source-based conditional rendering
   - Addresses GitHub issue #3477

2. **`apps/docs/content/docs/(reference)/api-reference/primitives/message.mdx`** — Added stability warning for `components` prop:
   - Warning callout explaining that inline `components` objects cause streaming failures
   - Code example showing correct (stable reference) vs incorrect (inline object) patterns
   - Addresses GitHub issue #3478

3. **`apps/docs/content/docs/ui/part-grouping.mdx`** — Added real-world example:
   - Adorable production callout (682 stars) using `Unstable_PartsGrouped` for file operation grouping
   - Cross-reference to Production Patterns guide

4. **`apps/docs/content/docs/(docs)/guides/patterns.mdx`** — Added "Tool Call Grouping" pattern:
   - Full implementation using `MessagePrimitive.Unstable_PartsGrouped`
   - Adorable production callout showing Cursor/Lovable-style UX

5. **`apps/docs/content/docs/(docs)/index.mdx`** — Removed JobSync false positive, updated Adorable description

6. **`apps/docs/lib/examples.ts`** — Removed JobSync false positive, updated Adorable description

### 2026-03-13 — Session 15

#### Research Conducted

- **instavm/coderunner-ui (199 stars)**: Investigated `execution-tool-ui.tsx` and `my-runtime-provider.tsx`. Found three-state tool UI pattern (running/error/complete) with partial streaming results, and `useAssistantInstructions` with detailed capability descriptions. Both patterns are already well-documented in existing guides (tool-ui.mdx, use-assistant-instructions.mdx)
- **Docs page audit**: Reviewed 9 additional pages:
  - `speech.mdx` — Comprehensive, no changes needed
  - `context-api.mdx` — Comprehensive (747 lines), no changes needed
  - `editing.mdx` — Comprehensive, no changes needed
  - `suggestions.mdx` — Found stray code fence bug (line 258)
  - `chain-of-thought.mdx` — Comprehensive, no changes needed
  - `quoting.mdx` — Comprehensive, no changes needed
  - `installation.mdx` — Found outdated model names
  - `embedding.mdx` — Comprehensive, no changes needed
  - `use-assistant-instructions.mdx` — Comprehensive, no changes needed

#### Changes Made

1. **`apps/docs/content/docs/(docs)/guides/branching.mdx`** — Added ExternalStoreRuntime branching limitation callout:
   - `ThreadMessageLike` lacks `parentId`, so loading branched conversations from backend is not currently supported
   - Workaround: store full branch state yourself and call `setMessages` with the right branch on load
   - Addresses GitHub issue #3161

2. **`apps/docs/content/docs/(docs)/installation.mdx`** — Updated outdated model names:
   - Anthropic tab: `claude-3-7-sonnet-20250219` → `claude-sonnet-4-6`
   - AWS Bedrock tab: `anthropic.claude-3-5-sonnet-20240620-v1:0` → `anthropic.claude-sonnet-4-6-20260312-v1:0`

3. **`apps/docs/content/docs/(docs)/guides/suggestions.mdx`** — Fixed formatting bug:
   - Removed stray closing code fence (```) on line 258 after VerifyWise Callout

4. **`apps/docs/content/docs/runtimes/langgraph/index.mdx`** — Added thread lifecycle documentation:
   - New "Lifecycle Overview" section explaining when `create`, `load`, and `stream` are called
   - ASCII flow diagram showing the interaction sequence
   - Callout explaining common pitfall (missing `externalId` from `create` prevents `load`)
   - Addresses GitHub issue #2587 (10 upvotes)
