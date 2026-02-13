# Assistant-UI Skills Testing & Issues

This document records tests of Claude Code agents using assistant-ui skills to set up projects, identifying failures and areas for improvement.

## Skills Location

Skills are hosted at: https://github.com/assistant-ui/skills

Local clone: `/Users/bassimshahidy/Documents/GitHub/work/skills/`

---

## Test 1: New Project with CLI (npx assistant-ui create)

**Date:** 2026-02-04
**Prompt:** "Set up a new assistant-ui chat application in this directory. Use the assistant-ui CLI and shadcn. Follow best practices."
**Directory:** Empty temp directory (`/tmp/aui-test-1770242824`)

### Agent Behavior
1. Loaded `setup` skill correctly
2. Fetched `llms.txt` and installation docs
3. Attempted `npx assistant-ui@latest create my-chat-app --yes` (failed - invalid flag)
4. Recovered with `npx assistant-ui@latest create my-chat-app` (success)
5. Copied `.env.example` to `.env`
6. **BROKE the template** - Downgraded from `openai.responses("gpt-5-nano")` with reasoning to old `openai("gpt-4o")`
7. Removed `providerOptions` with reasoning config
8. Removed `sendReasoning: true` from response

### Result: FAILURE

**What agent broke:**
```typescript
// TEMPLATE (correct):
model: openai.responses("gpt-5-nano"),
providerOptions: {
  openai: { reasoningEffort: "low", reasoningSummary: "auto" }
},
return result.toUIMessageStreamResponse({ sendReasoning: true });

// AGENT CHANGED TO (wrong):
model: openai("gpt-4o"),
return result.toUIMessageStreamResponse();
```

Agent removed the modern responses API and reasoning features, downgrading to deprecated patterns.

### Learnings
- Agent found CLI via fetched docs (not from skill itself)
- Skill doesn't mention CLI commands at all
- **Agent made unauthorized breaking changes to working template code**
- Skills need to warn: DO NOT MODIFY TEMPLATE CODE unless explicitly asked

---

## Test 2: Existing Vite Project (Manual Setup)

**Date:** 2026-02-04
**Prompt:** "This is an existing Vite React TypeScript project. Add assistant-ui to it to create a chat interface. Use best practices."
**Directory:** Fresh Vite React TS project (`/tmp/aui-test-existing-1770243060`)

### Agent Behavior
1. Loaded `setup` skill
2. Explored project, identified Vite + React + TypeScript
3. Decided to use `useLocalRuntime` (incorrect for Vite)
4. Installed `@assistant-ui/react` and `@assistant-ui/styles` (deprecated, shouldn't use)
5. Wrote custom `Chat.tsx` with `import { Thread } from "@assistant-ui/react"`
6. **FAILED:** `Module has no exported member 'Thread'`
7. Searched packages, found deprecated `@assistant-ui/react-ui`
8. Installed `@assistant-ui/react-ui` v0.2.1
9. **FAILED:** CSS import from deprecated `@assistant-ui/styles` package
11. Build succeeded, but...

### Result: FAILURE (Blank Page)

**Root Cause Analysis:**
1. `@assistant-ui/react-ui` v0.2.1 is deprecated/abandoned
2. It was built for `@assistant-ui/react` v0.11.x
3. Current `@assistant-ui/react` is v0.12.5 with breaking changes
4. Version incompatibility causes runtime crash (blank page)

**What Should Have Happened:**
1. Agent should recognize Vite requires different setup path
2. Should use `useExternalStoreRuntime` (not `useLocalRuntime`)
3. Thread component comes from shadcn registry, not npm package
4. Should reference `tanstack.md` in skill references

### Skill Failures Identified
1. Shows `import { Thread } from "@assistant-ui/react"` - **Thread is NOT exported from this package**
2. Shows `@assistant-ui/styles` - **package is deprecated, not needed**
3. No mention of CLI commands (`npx assistant-ui init` or `create`)
4. No framework decision tree (Next.js vs Vite)
5. TanStack/Vite reference exists but isn't surfaced to agents

---

## Test 3: CLI Create with Cloud Template

**Date:** 2026-02-04
**Prompt:** "Create a new assistant-ui chat application using the assistant-ui CLI. Use the cloud template for persistence support."
**Directory:** `/tmp/aui-test-create-1770246714`

### Agent Behavior
1. Loaded `setup` skill
2. Fetched `llms.txt` and CLI docs
3. Ran `npx assistant-ui@latest create my-app -t cloud`
4. CLI completed successfully

### Result: SUCCESS

**Notes:**
- Agent correctly identified the `-t cloud` flag for templates
- No issues with the CLI create command
- Project created with all proper components

---

## Test 4: Next.js + assistant-ui init

**Date:** 2026-02-04
**Prompt:** "This is a fresh Next.js app with TypeScript and Tailwind. Add assistant-ui chat functionality to it using the assistant-ui CLI init command."
**Directory:** `/tmp/aui-test-init-1770246727/my-nextjs-app` (fresh create-next-app)

### Agent Behavior
1. Loaded `setup` skill
2. Ran `npx assistant-ui@latest init`
3. CLI created components successfully at `components/ui/assistant-ui/thread.tsx`
4. **Agent failed to recognize CLI success** - assumed it only created config
5. Agent fell back to manual installation
6. Wrote `page.tsx` with: `import { Thread } from "@assistant-ui/react"` (WRONG)
7. **FAILED:** `error TS2305: Module '"@assistant-ui/react"' has no exported member 'Thread'`

### Result: FAILURE (Agent error, not CLI error)

**Root Cause Analysis:**
1. **CLI worked correctly** - created `components/ui/assistant-ui/thread.tsx`
2. **Agent didn't check what CLI created** - assumed failure
3. **Skill shows wrong import** - `import { Thread } from "@assistant-ui/react"`
4. **Correct import should be:** `import { Thread } from "@/components/ui/assistant-ui/thread"`
5. Agent blindly followed skill guidance instead of verifying CLI output

**Key Learning:**
The CLI init IS working. The agent failure is 100% due to incorrect skill guidance showing the wrong import path.

---

## Test 5: Add Registry Component to Existing App

**Date:** 2026-02-04
**Prompt:** "Add the markdown-text component from the assistant-ui registry to enable better markdown rendering in chat messages."
**Directory:** `/tmp/aui-test-1770242824/my-chat-app` (from Test 1)

### Agent Behavior
1. Loaded `assistant-ui` skill (not `setup`)
2. Tried to fetch `https://assistant-ui.com/registry/markdown-text.json` - **404 error**
3. Found component already existed (installed by CLI `create` in Test 1)
4. Correctly identified the component was already set up

### Result: PARTIAL SUCCESS (component already existed)

**Learnings:**
- Agent tried **wrong registry URL**: `assistant-ui.com/registry/`
- Correct URL is: `r.assistant-ui.com/`
- Skills should document the correct registry URL
- The `assistant-ui add` CLI command should be used instead of manual fetch

---

## Key Findings

### Thread Component Architecture
- Thread is **NOT** in the `@assistant-ui/react` npm package
- `@assistant-ui/react` exports **ThreadPrimitive** (low-level building blocks), not Thread
- Thread is a **shadcn-style component** installed via CLI/registry
- Registry URL: `https://r.assistant-ui.com/{name}.json`
- After CLI install, import is `@/components/assistant-ui/thread` (local file)

### Framework Support Matrix
| Framework | CLI Support | Runtime Hook | Status |
|-----------|-------------|--------------|--------|
| Next.js | Full (templates) | `useChatRuntime` | Primary/Recommended |
| Vite + TanStack | None (manual) | `useExternalStoreRuntime` | Supported (example exists) |
| Vite + React Router | None (manual) | `useExternalStoreRuntime` | Supported (example exists) |

### Styling Architecture (CORRECTED)
The skill documentation contains **completely wrong styling information**:

**What the skill claims (ALL WRONG):**
- `@assistant-ui/styles` package - **DEPRECATED, NOT NEEDED**
- `@assistant-ui/styles/default.css` - DOES NOT EXIST
- `@assistant-ui/styles/modal.css` - DOES NOT EXIST
- `@assistant-ui/styles/markdown.css` - DOES NOT EXIST
- `AssistantModal` component - DOES NOT EXIST

**Actual styling approach:**
- **Tailwind CSS v4** with `@assistant-ui/ui` components - this is the ONLY approach
- Examples all use: `@import "tailwindcss"` with native Tailwind v4
- **DO NOT use or reference `@assistant-ui/styles`** - it's deprecated and not needed

### Package Status (CORRECTED)
| Package | Status | Notes |
|---------|--------|-------|
| `@assistant-ui/react` | ACTIVE (v0.12.6) | Core package - exports ThreadPrimitive, hooks, NOT Thread |
| `@assistant-ui/react-ai-sdk` | ACTIVE (v1.3.5) | AI SDK adapter |
| `@assistant-ui/styles` | **DEPRECATED** | DO NOT USE - not needed for anything |
| `@assistant-ui/ui` | PRIVATE | Not published - component library for templates |
| `@assistant-ui/react-ui` | DEPRECATED | DO NOT USE - abandoned, incompatible |

---

## Setup Skill Analysis (from subagent investigation)

The setup skill at `/Users/bassimshahidy/Documents/GitHub/work/skills/` contains numerous critical errors:

### HIGH SEVERITY - Completely Wrong Information

1. **References deprecated styles package** (styling.md)
   - Claims: `@assistant-ui/styles` with `default.css`, `modal.css`, `markdown.css`
   - Reality: `@assistant-ui/styles` is deprecated and not needed at all

2. **Non-existent component** (styling.md lines 232-235)
   - Claims: `import { AssistantModal } from "@assistant-ui/react"`
   - Reality: `AssistantModal` does not exist

3. **Wrong import statement** (throughout)
   - Claims: `import { Thread } from "@assistant-ui/react"`
   - Reality: Thread is NOT exported - use `@/components/assistant-ui/thread` after CLI

4. **Wrong Tailwind content path** (styling.md lines 50-54)
   - Claims: `./node_modules/@assistant-ui/react/dist/**/*.js`
   - Reality: Should use Tailwind v4 with `@tailwindcss/postcss`, not manual content paths

### CRITICAL SEVERITY - Missing Documentation

5. **LangGraph missing HITL command forwarding**
   - The skill's LangGraph section does NOT mention `config.command`
   - This causes Python error: `NoneType in _control_branch`
   - Must pass: `{ command: config.command }` when resuming from interrupt

6. **LangGraph missing initialize callbacks**
   - Does NOT mention `config.initialize()`, `create`, `load` options
   - These are REQUIRED for thread persistence

7. **No CLI documentation**
   - `npx assistant-ui create` - not mentioned
   - `npx assistant-ui init` - not mentioned
   - `npx assistant-ui add` - not mentioned

---

## Recommended Skill Fixes

### Priority 1: Remove/Fix Wrong Information
- [ ] Remove ALL `@assistant-ui/styles` references - package is deprecated, not needed
- [ ] Remove `AssistantModal` component references - doesn't exist
- [ ] Remove `import { Thread } from "@assistant-ui/react"` - Thread isn't there
- [ ] Fix Tailwind setup to use v4 approach, not old content paths

### Priority 2: Add CLI as Primary Path
- [ ] Add `npx assistant-ui create` for new projects (templates: default, minimal, cloud, langgraph, mcp)
- [ ] Add `npx assistant-ui init` for existing Next.js projects
- [ ] Add `npx assistant-ui add <component>` for adding registry components
- [ ] Explain that CLI installs shadcn components to `components/assistant-ui/`
- [ ] Show correct import: `import { Thread } from "@/components/assistant-ui/thread"`

### Priority 3: Add LangGraph Critical Info
- [ ] Document `config.command` forwarding for HITL
- [ ] Document `config.initialize()`, `create`, `load` callbacks
- [ ] Add example showing proper interrupt resumption

### Priority 4: Framework Decision Tree
- [ ] Add detection: "Is this Next.js or Vite?"
- [ ] Guide Next.js → CLI init/create
- [ ] Guide Vite → manual setup with `useExternalStoreRuntime`
- [ ] Surface `tanstack.md` reference for Vite projects

### Priority 5: Warn About Common Mistakes
- [ ] Explicitly warn: "DO NOT install @assistant-ui/react-ui" - deprecated
- [ ] Explicitly warn: "DO NOT install @assistant-ui/styles" - deprecated
- [ ] Warn: "DO NOT MODIFY TEMPLATE CODE" unless explicitly asked
- [ ] Warn: "DO NOT 'fix' model names" - templates use intentional configurations
- [ ] Document correct registry URL: `https://r.assistant-ui.com/{name}.json`

---

## Test Results Summary

| Test | Scenario | Result | Key Issue |
|------|----------|--------|-----------|
| 1 | New project with CLI `create` | FAILURE | Agent broke template - downgraded from gpt-5-nano/responses API to old gpt-4o |
| 2 | Existing Vite project | FAILURE | Wrong import, deprecated package, version mismatch |
| 3 | CLI `create` with cloud template | SUCCESS | Template code preserved correctly |
| 4 | Next.js + CLI `init` | FAILURE | CLI worked, agent didn't recognize it due to wrong skill guidance |
| 5 | Add registry component | PARTIAL | Wrong registry URL, component already existed |

### Success Rate: 1/5 (20%)

### Critical Issues Blocking Agent Success
1. **Skill shows non-existent exports** - `Thread`, `AssistantModal` not in `@assistant-ui/react`
2. **Skill references deprecated styles package** - `@assistant-ui/styles` is deprecated, not needed
3. **Skill shows wrong import path** - Should be `@/components/assistant-ui/thread` after CLI
4. **No CLI documentation in skill** - Agents only find CLI by fetching external docs
5. **Wrong registry URL** - Skill doesn't document `r.assistant-ui.com`
6. **Missing LangGraph HITL info** - No mention of `config.command` forwarding
7. **Agents make unauthorized "improvements"** - Downgrade modern APIs to deprecated patterns

### CLI Status: WORKING
- `npx assistant-ui create` - Works correctly
- `npx assistant-ui init` - Works correctly, creates components at `components/ui/assistant-ui/`
- `npx assistant-ui add` - Works correctly

**The CLI is NOT broken. Agent failures are due to incorrect skill guidance.**

### Agents Consistently Make These Mistakes
1. `import { Thread } from "@assistant-ui/react"` - Thread is NOT here (use ThreadPrimitive or local component)
2. `@import "@assistant-ui/styles/..."` - Package is deprecated, not needed
3. Install `@assistant-ui/react-ui` - Deprecated, incompatible
4. Use `useLocalRuntime` for Vite - Should use `useExternalStoreRuntime`
5. **Downgrade working template code** - Replace `openai.responses()` with old `openai()`, remove reasoning features
6. Assume old models (gpt-4o) are "more common" than current ones (gpt-5-nano)

### Skills Need To Add
- **DO NOT MODIFY TEMPLATE CODE** unless explicitly asked
- **DO NOT "FIX" OR "UPDATE" MODEL NAMES** - templates use intentional configurations
- Document current model names and API patterns (responses API, not completions)
- Document that `@assistant-ui/react` exports primitives (ThreadPrimitive), not composed components (Thread)

---

## Setup Skill Fix - 2026-02-05

### What Was Fixed

All files in `skills/assistant-ui/skills/setup/` rewritten. Deployed to `~/.claude/skills/setup/`.

**Files changed:** SKILL.md, ai-sdk.md, styling.md, langgraph.md, tanstack.md, custom-backend.md, ag-ui.md, a2a.md

| Fix | Files |
|-----|-------|
| All Thread imports → `@/components/assistant-ui/thread` | ALL files |
| Removed all `@assistant-ui/styles` references | styling.md, SKILL.md |
| Removed `AssistantModal` (doesn't exist) | styling.md |
| Added CLI docs (create, init, add) | SKILL.md |
| Added template preservation policy | SKILL.md |
| Added package installation policy (whitelist) | SKILL.md |
| Added framework decision tree | SKILL.md |
| Tailwind v4 as only styling approach | styling.md |
| `convertToModelMessages()` needs `await` | SKILL.md, ai-sdk.md |
| Added HITL `config.command` forwarding | langgraph.md |
| Added `config.initialize()`, `create`, `load` callbacks | langgraph.md |
| Added correct registry URL `r.assistant-ui.com` | SKILL.md |
| Removed ALL "wrong" examples (agents copy them) | ALL files |

### Key Principle Applied

**Never show wrong examples in skill files.** Agents copy code from skills verbatim. Showing `// WRONG: import { Thread } from "@assistant-ui/react"` means agents will use that import. Only show the correct pattern.

### Bug Found During Testing

`convertToModelMessages()` from the `ai` package returns a **Promise**. All skill examples were missing `await`. Fixed to `await convertToModelMessages(messages)`.

---

## Post-Fix Test Results - 2026-02-05

| Test | Scenario | Result | Details |
|------|----------|--------|---------|
| 6 | Empty dir + CLI create | PASS | Agent ran `npx assistant-ui create`, full scaffold, correct structure |
| 7 | Fresh Next.js + CLI init | PASS | Agent installed thread via registry, created route, `npm run build` succeeded. Had to add `await` to `convertToModelMessages` and wrap with `TooltipProvider` |
| 8 | Vite + manual setup | PASS | Agent used `useExternalStoreRuntime`, local `thread.tsx` with primitives, Tailwind v4 via `@tailwindcss/vite`. Both `tsc` and `vite build` clean |

### Success Rate: 3/3 (100%) — up from 1/5 (20%)

### What Agents Did Correctly After Fix
1. Imported Thread from `@/components/assistant-ui/thread` (not from npm)
2. Did NOT install `@assistant-ui/styles` or `@assistant-ui/react-ui`
3. Used `useExternalStoreRuntime` for Vite (not `useLocalRuntime`)
4. Used `useChatRuntime` + `AssistantChatTransport` for Next.js
5. Used `convertToModelMessages()` in API routes
6. Set up Tailwind v4 correctly (no old content paths)

### Remaining Issues Observed
1. `npx assistant-ui init` needs interactive `Y` confirmation — agents pipe `echo "Y"` as workaround
2. Next.js test needed manual `lib/utils.ts` creation (cn function) — CLI didn't create it
3. Next.js test needed `TooltipProvider` wrapper — thread component's tooltip-icon-button depends on it
4. These are CLI issues, not skill issues

---

## Independent Verification - 2026-02-05

Tests 6-8 were independently verified by diffing against reference templates, scanning for forbidden patterns, and starting dev servers.

### Test Directories
- Test 6: `/tmp/aui-test-empty/` (CLI create)
- Test 7: `/tmp/aui-test-nextjs/app/` (Next.js + init)
- Test 8: `/tmp/aui-test-vite/app/` (Vite + manual)

### Reference Sources
- Next.js templates: `/Users/bassimshahidy/Documents/GitHub/work/aui-templates/`
- Vite example: `/Users/bassimshahidy/Documents/GitHub/work/assistant-ui/examples/with-tanstack/`

### Forbidden Pattern Scan (All Three Directories)

| Pattern | Test 6 | Test 7 | Test 8 |
|---------|--------|--------|--------|
| `@assistant-ui/styles` in deps or imports | Not found | Not found | Not found |
| `@assistant-ui/react-ui` in deps or imports | Not found | Not found | Not found |
| `import { Thread } from "@assistant-ui/react"` | Not found | Not found | Not found |
| `useLocalRuntime` in source code | Not found | Not found | Not found |

**All three test dirs are clean of every forbidden pattern.**

### Thread Import Verification

| Test | File | Import | Correct? |
|------|------|--------|----------|
| 6 | `app/assistant.tsx:8` | `import { Thread } from "@/components/assistant-ui/thread"` | Yes |
| 7 | `app/page.tsx:8` | `import { Thread } from "@/components/assistant-ui/thread"` | Yes |
| 8 | `src/App.tsx:2` | `import { Thread } from "@/components/assistant-ui/thread"` | Yes |

Thread is imported from local components in all three tests. Primitives (`ThreadPrimitive`, `MessagePrimitive`, `ComposerPrimitive`) are correctly imported from `@assistant-ui/react` inside the local component files — this is the expected pattern.

### API Route / Model Verification

| Test | File | Model Used | API Pattern | `await convertToModelMessages` | `sendReasoning` | `providerOptions` |
|------|------|-----------|-------------|-------------------------------|-----------------|-------------------|
| 6 | `app/api/chat/route.ts` | `openai.responses("gpt-5-nano")` | Responses API | Yes | Yes (`true`) | Yes (reasoningEffort, reasoningSummary) |
| 7 | `app/api/chat/route.ts` | `openai("gpt-4o")` | Completions API | Yes | No | No |
| 8 | N/A (simulated runtime) | N/A | N/A | N/A | N/A | N/A |

**Test 6** preserved the CLI template code perfectly — `openai.responses("gpt-5-nano")` with full reasoning config is exactly what the CLI `create` command generates.

**Test 7** used `openai("gpt-4o")` because the agent wrote the route manually (CLI `init` only installs UI components, not API routes). This matches the skill's own examples — the setup skill shows `openai("gpt-4o")` at `SKILL.md:141` and throughout `ai-sdk.md`. **This is not an agent error; the skill itself uses `openai("gpt-4o")`.**

**Test 8** has no API route — uses `useExternalStoreRuntime` with a simulated streaming response, which is the correct Vite approach.

### Runtime Pattern Verification

| Test | Runtime Hook | Transport | Correct? |
|------|-------------|-----------|----------|
| 6 | `useChatRuntime` | `AssistantChatTransport` | Yes (Next.js pattern) |
| 7 | `useChatRuntime` | `AssistantChatTransport` | Yes (Next.js pattern) |
| 8 | `useExternalStoreRuntime` | Manual state management | Yes (Vite pattern) |

### Dev Server Verification

Each dev server was started and tested with `curl`:

| Test | Port | HTTP Status | Response Content | Errors in Log |
|------|------|-------------|-----------------|---------------|
| 6 | 3101 | 200 | Full Next.js HTML with assistant-ui scripts and CSS | None |
| 7 | 3102 | 200 | Full Next.js HTML (`GET / 200 in 3.6s`) | None |
| 8 | 3103 | 200 | Vite HTML with React refresh, main.tsx module | None (Vite v7.3.1 ready in 416ms) |

**All three dev servers return HTTP 200 with proper HTML. No blank pages, no runtime crashes, no module resolution errors.**

### Template Diff: Test 6 vs Reference

Test 6 (`CLI create`) was compared against `aui-templates/assistant-ui-starter-minimal/`. The test output is an upgraded version of the minimal template:

| Aspect | Reference Template | Test 6 Output |
|--------|-------------------|---------------|
| Model | `openai("gpt-4o")` | `openai.responses("gpt-5-nano")` |
| Reasoning config | None | `providerOptions` + `sendReasoning: true` |
| Layout | Simple Thread only | Full sidebar with ThreadList |
| Extra components | None | reasoning.tsx, thread-list.tsx, threadlist-sidebar.tsx |
| UI primitives | Basic | breadcrumb, input, separator, sheet, sidebar, skeleton |
| `convertToModelMessages` | `await` | `await` |

The CLI's live templates have been updated beyond what's in `aui-templates/`. The local `aui-templates/` directory contains stale copies. **The agent did NOT modify template code — these enhancements came from the CLI itself.**

### Template Diff: Test 8 vs Reference

Test 8 (Vite manual) was compared against `assistant-ui/examples/with-tanstack/`. Key expected differences:

| Aspect | Reference (TanStack Start) | Test 8 (Plain Vite) |
|--------|---------------------------|---------------------|
| Framework | TanStack Start + Nitro SSR | Plain Vite SPA |
| Routing | TanStack file-based routing | None |
| Server code | `src/server/chat.ts` with `createServerFn` | None (simulated runtime) |
| OpenAI SDK | Raw `openai` package | None needed |
| Thread source | `packages/ui/` via monorepo tsconfig paths | Local `src/components/assistant-ui/thread.tsx` |
| Tailwind plugin | `@tailwindcss/vite` | `@tailwindcss/vite` |

These differences are expected — the reference is a full-stack TanStack Start app while the test is a client-only Vite SPA.

### Verified Results Summary

| Test | Scenario | Template Preserved? | Forbidden Patterns? | Thread Import? | Dev Server? | Overall |
|------|----------|--------------------|--------------------|----------------|-------------|---------|
| 6 | Empty dir + CLI create | Yes (not modified) | None found | Local component | HTTP 200, renders | **PASS** |
| 7 | Fresh Next.js + CLI init | N/A (manual route) | None found | Local component | HTTP 200, renders | **PASS** |
| 8 | Vite + manual setup | N/A (no template) | None found | Local primitives | HTTP 200, renders | **PASS** |

### Verified Success Rate: 3/3 (100%)

### New Skill Gap Identified

The setup skill still shows `openai("gpt-4o")` as the model in all examples, while the CLI's live `create` templates now use `openai.responses("gpt-5-nano")` with reasoning config. If agents writing manual API routes should use the responses API pattern, the skill examples need to be updated.

| Location | Current | Should Be (if updating) |
|----------|---------|------------------------|
| `SKILL.md:141` | `openai("gpt-4o")` | `openai.responses("gpt-5-nano")` |
| `ai-sdk.md:73` | `openai("gpt-4o")` | `openai.responses("gpt-5-nano")` |
| `ai-sdk.md:142` | `openai("gpt-4o")` | `openai.responses("gpt-5-nano")` |
| `ai-sdk.md:263` | `openai("gpt-4o")` | `openai.responses("gpt-5-nano")` |
| `ai-sdk.md:281` | `openai("gpt-4o")` | `openai.responses("gpt-5-nano")` |

This is a low-priority gap — `openai("gpt-4o")` still works correctly, it just doesn't leverage the newer responses API with reasoning support.
