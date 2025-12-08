# Store Package Directory Restructure Proposal

## Version 1.0 - Initial Proposal

### Current Structure Analysis

```
packages/store/src/
├── index.ts                    # Public exports
├── types.ts                    # Core types
├── AssistantContext.tsx        # React Context + Provider
├── useAssistantClient.tsx      # Main hook (236 lines, contains multiple resources)
├── useAssistantState.tsx       # State subscription hook
├── useAssistantEvent.ts        # Event subscription hook
├── AssistantIf.tsx             # Conditional rendering component
├── EventContext.ts             # Event types + EventManager (160 lines)
├── DerivedClient.ts            # DerivedClient marker resource
├── AssistantTapContext.ts      # tapClient + tapEmit
├── ClientStackContext.ts       # Client stack context
├── tapClientResource.ts        # tapClientResource + tapClientResources (162 lines)
├── tapClientLookup.ts          # List lookup by index/key
├── tapClientList.ts            # Dynamic list with add/remove
└── utils/
    ├── StoreResource.ts        # ResourceElement → Store conversion
    └── splitClients.ts         # Split root/derived clients
```

**Total: 14 source files**

### Issues Identified

1. **Flat structure** - 12 files at root level, only 2 in utils/
2. **Large multi-purpose files**:
   - `useAssistantClient.tsx` (236 lines) contains 6 resources + 2 hooks
   - `tapClientResource.ts` (162 lines) contains ClientProxy class + 2 functions
   - `EventContext.ts` (160 lines) contains types + EventManager resource
3. **Inconsistent naming prefixes**:
   - `Assistant*` (AssistantContext, AssistantIf, AssistantTapContext)
   - `use*` (useAssistantClient, useAssistantState, useAssistantEvent)
   - `tap*` (tapClientResource, tapClientLookup, tapClientList)
   - `*Context` (AssistantContext, AssistantTapContext, ClientStackContext, EventContext)
4. **Mixed concerns**:
   - `AssistantContext.tsx` - React context + provider + hook
   - `EventContext.ts` - types + resource implementation
5. **Unclear public vs internal separation**

### Proposed Structure v1

```
packages/store/src/
├── index.ts                        # Public exports only

├── core/                           # Core types and foundational code
│   ├── types.ts                    # ClientSchema, ClientRegistry, AssistantClient, etc.
│   ├── events.ts                   # Event types (AssistantEvent, AssistantEventMap, etc.)
│   ├── EventManager.ts             # EventManager resource (extracted)
│   └── ClientStackContext.ts       # Client stack context for event scoping

├── react/                          # React integration layer
│   ├── context/
│   │   └── AssistantContext.tsx    # React context + provider
│   ├── hooks/
│   │   ├── useAssistantClient.tsx  # Main client hook
│   │   ├── useAssistantState.tsx   # State subscription hook
│   │   └── useAssistantEvent.ts    # Event subscription hook
│   └── components/
│       └── AssistantIf.tsx         # Conditional rendering

├── tap/                            # Tap integration primitives
│   ├── context/
│   │   └── TapContext.ts           # tapClient + tapEmit (renamed from AssistantTapContext)
│   ├── client/
│   │   ├── tapClientResource.ts    # Single resource wrapper
│   │   ├── tapClientResources.ts   # Batch resources wrapper (extracted)
│   │   └── ClientProxy.ts          # ClientProxy class (extracted)
│   └── collections/
│       ├── tapClientLookup.ts      # Lookup by index/key
│       └── tapClientList.ts        # Dynamic list with add/remove

├── factories/                      # Client factory utilities
│   └── DerivedClient.ts            # DerivedClient marker resource

└── internal/                       # Internal utilities (not exported)
    ├── StoreResource.ts            # ResourceElement → Store
    ├── splitClients.ts             # Split root/derived clients
    ├── ProxiedAssistantState.ts    # Extracted from useAssistantState
    └── RootClientsResource.ts      # Extracted from useAssistantClient
```

### File Count Comparison

| Category | Current | Proposed |
|----------|---------|----------|
| Root level | 12 | 1 (index.ts) |
| core/ | 0 | 4 |
| react/ | 0 | 5 |
| tap/ | 0 | 6 |
| factories/ | 0 | 1 |
| internal/ | 0 | 4 |
| utils/ | 2 | 0 |
| **Total** | **14** | **21** |

### Export Structure

```typescript
// index.ts - Public API

// React hooks
export { useAssistantClient } from "./react/hooks/useAssistantClient";
export { useAssistantState } from "./react/hooks/useAssistantState";
export { useAssistantEvent } from "./react/hooks/useAssistantEvent";

// React components
export { AssistantProvider } from "./react/context/AssistantContext";
export { AssistantIf } from "./react/components/AssistantIf";

// Factories
export { DerivedClient } from "./factories/DerivedClient";

// Tap hooks (for client authors)
export { tapClient, tapEmit } from "./tap/context/TapContext";
export { tapClientLookup } from "./tap/collections/tapClientLookup";
export { tapClientList } from "./tap/collections/tapClientList";

// Types
export type { ClientRegistry, ClientResourceOutput } from "./core/types";
```

---

## Design Issues - Iteration 1

After reviewing the v1 proposal, here are the identified design issues:

### Issue 1: Over-fragmentation
- Splitting 14 files into 21 files adds complexity
- Small files like `ClientProxy.ts` and `tapClientResources.ts` are tightly coupled to their origin files
- Creates more import paths to manage

### Issue 2: Deep nesting
- `react/context/`, `react/hooks/`, `react/components/` creates 3 levels of nesting
- `tap/context/`, `tap/client/`, `tap/collections/` similarly nested
- For a package with ~15 exports, this is excessive

### Issue 3: Inconsistent abstraction levels
- `core/` contains both types and implementations (EventManager)
- `tap/` mixes context and data structures
- `factories/` has only one file

### Issue 4: "internal/" is ambiguous
- Some "internal" utilities are used by library authors
- `StoreResource` might need to be exported for advanced use cases

### Issue 5: Naming still inconsistent
- `TapContext.ts` vs `ClientStackContext.ts` (one has prefix, one doesn't)
- `AssistantContext.tsx` vs `TapContext.ts` (different prefixes)

---

## Version 2.0 - Refined Proposal

Based on the issues identified, here's a simpler structure:

```
packages/store/src/
├── index.ts                        # Public exports

├── types/                          # All type definitions
│   ├── client.ts                   # ClientSchema, ClientRegistry, ClientResourceOutput, etc.
│   ├── events.ts                   # Event types (AssistantEvent, AssistantEventMap, etc.)
│   └── index.ts                    # Re-exports all types

├── hooks/                          # All React hooks
│   ├── useAssistantClient.tsx      # Main client hook
│   ├── useAssistantState.tsx       # State subscription hook
│   └── useAssistantEvent.ts        # Event subscription hook

├── components/                     # All React components
│   ├── AssistantProvider.tsx       # Provider component
│   └── AssistantIf.tsx             # Conditional rendering

├── tap/                            # All tap integration
│   ├── tapClient.ts                # tapClient + tapEmit hooks
│   ├── tapClientResource.ts        # Resource wrapper (keeps ClientProxy internal)
│   ├── tapClientLookup.ts          # Lookup by index/key
│   └── tapClientList.ts            # Dynamic list

├── primitives/                     # Foundational building blocks
│   ├── DerivedClient.ts            # DerivedClient marker
│   ├── EventManager.ts             # Event system
│   ├── ClientStackContext.ts       # Client hierarchy tracking
│   └── AssistantContext.ts         # React context internals

└── utils/                          # Internal utilities
    ├── StoreResource.ts
    └── splitClients.ts
```

### Benefits of v2

1. **Flatter hierarchy** - Max 2 levels of nesting
2. **Clear categories** - types, hooks, components, tap, primitives, utils
3. **Consistent file size** - No need to extract small pieces
4. **Matches mental model** - "Where's the useAssistantState hook?" → "hooks/"
5. **12 source files → 16 files** - Modest increase, mostly from extracting types

---

## Design Issues - Iteration 2

### Issue 1: "primitives" naming
- "Primitives" suggests low-level building blocks
- But `DerivedClient` and `EventManager` are quite different in purpose
- `AssistantContext` is more of an internal implementation detail

### Issue 2: Provider placement
- `AssistantProvider` is exported from `AssistantContext.tsx` currently
- Splitting into separate file means `AssistantContext.ts` becomes internal-only
- But the context hook is also used by other modules

### Issue 3: Types folder
- Having a separate types folder means types are separate from their implementations
- Event types are in `types/events.ts` but EventManager is in `primitives/`
- This separation can make the code harder to follow

### Issue 4: tapClient naming
- `tapClient.ts` contains both `tapClient` and `tapEmit`
- Should these be in separate files or is the combined file fine?

### Issue 5: Missing test considerations
- No consideration for test file placement
- Should tests mirror the source structure?

---

## Version 3.0 - Final Proposal

Based on all iterations, here's the refined final structure:

```
packages/store/src/
├── index.ts                        # Public exports

├── client/                         # Client system (core abstraction)
│   ├── types.ts                    # ClientSchema, ClientRegistry, ClientResourceOutput
│   ├── DerivedClient.ts            # DerivedClient marker resource
│   ├── ClientProxy.ts              # ClientProxy class (extracted, internal)
│   └── splitClients.ts             # Split root/derived clients (moved from utils)

├── events/                         # Event system
│   ├── types.ts                    # Event types (AssistantEvent, AssistantEventMap, etc.)
│   ├── EventManager.ts             # EventManager resource
│   └── normalizeSelector.ts        # normalizeEventSelector utility

├── context/                        # Context management
│   ├── AssistantContext.tsx        # React context + AssistantProvider
│   ├── TapContext.ts               # Tap context (tapClient, tapEmit)
│   └── ClientStackContext.ts       # Client stack for event scoping

├── hooks/                          # React hooks (user-facing)
│   ├── useAssistantClient.tsx      # Main client hook
│   ├── useAssistantState.tsx       # State subscription hook
│   └── useAssistantEvent.ts        # Event subscription hook

├── components/                     # React components (user-facing)
│   └── AssistantIf.tsx             # Conditional rendering

├── tap/                            # Tap utilities (library-author-facing)
│   ├── tapClientResource.ts        # Single resource → client proxy
│   ├── tapClientLookup.ts          # Lookup by index/key
│   └── tapClientList.ts            # Dynamic list with add/remove

└── utils/                          # Internal utilities
    ├── StoreResource.ts            # ResourceElement → Store
    └── ProxiedAssistantState.ts    # Extracted from useAssistantState
```

### Final Structure Rationale

| Folder | Purpose | Audience |
|--------|---------|----------|
| `client/` | Core client type system | Both |
| `events/` | Event pub/sub system | Both |
| `context/` | React + Tap context management | Internal |
| `hooks/` | React hooks | Users |
| `components/` | React components | Users |
| `tap/` | Tap integration utilities | Library authors |
| `utils/` | Internal helpers | Internal |

### Key Decisions

1. **`client/` folder** - Groups all client-related code (types, DerivedClient, proxy)
2. **`events/` folder** - Clean separation of event system (types + implementation)
3. **`context/` folder** - All context code in one place (React + Tap + ClientStack)
4. **Keep `hooks/` and `components/` separate** - Standard React organization
5. **`tap/` folder** - Clear signal these are for library authors
6. **`utils/` stays for truly internal code** - StoreResource, ProxiedAssistantState

### File Count: 14 → 17 (modest increase)

### Export Changes

```typescript
// index.ts

// React hooks
export { useAssistantClient } from "./hooks/useAssistantClient";
export { useAssistantState } from "./hooks/useAssistantState";
export { useAssistantEvent } from "./hooks/useAssistantEvent";

// React components
export { AssistantProvider } from "./context/AssistantContext";
export { AssistantIf } from "./components/AssistantIf";

// Client authoring
export { DerivedClient } from "./client/DerivedClient";
export { tapClient, tapEmit } from "./context/TapContext";
export { tapClientLookup } from "./tap/tapClientLookup";
export { tapClientList } from "./tap/tapClientList";

// Types
export type { ClientRegistry, ClientResourceOutput } from "./client/types";
```

---

## Design Issues - Iteration 3 (Final Review)

### Resolved Issues
- Clear folder organization by domain
- Appropriate abstraction levels
- Consistent naming (folders by concept, files by what they export)
- Reasonable file count increase

### Remaining Considerations

1. **Migration effort** - Changing all imports is work, but barrel exports in index.ts shield users

2. **Future growth** - Structure accommodates new hooks, components, tap utilities easily

3. **Test placement** - Recommend `__tests__/` folders alongside source files

4. **Documentation alignment** - Markdown files should be updated to reflect new paths in examples

### Alternative Considered: Keep Flat

An alternative is to keep the flat structure but just:
- Extract types to `types.ts` (already exists)
- Extract event types to `events.ts`
- Keep everything else flat

This has lower migration cost but doesn't address the organizational issues.

---

## Recommendation

**Adopt Version 3.0** with these priorities:

1. **Phase 1**: Extract types and events (low risk)
2. **Phase 2**: Organize hooks and components (medium risk)
3. **Phase 3**: Reorganize tap utilities and context (higher risk, do last)

The final structure provides clear organization while remaining practical for a package of this size.

---

## Iteration 4 - Questioning Fundamental Assumptions

Taking a step back to question the premises of the restructuring effort.

### Assumption 1: "Folder organization improves discoverability"

**Challenge:** Does adding folders actually help developers?

- Modern IDEs have fuzzy file search (Cmd+P in VS Code)
- Developers often search by symbol name, not browse folders
- Adding folders increases path length without clear benefit
- The package only has ~15 public exports

**Counter-evidence:**
- The React codebase itself uses a relatively flat structure
- Popular packages like `zustand`, `jotai` keep sources flat
- TanStack Query uses flat structure with descriptive filenames

**Revised thinking:** Folder organization helps *conceptual understanding*, not file discovery. The question is: does this package's complexity warrant conceptual grouping?

### Assumption 2: "Separating types from implementation is good"

**Challenge:** Having `events/types.ts` and `events/EventManager.ts` separates related code.

- When working on events, you need both files open
- TypeScript already separates types from runtime via type imports
- Co-location (types in same file) is often preferred in modern TS

**Conclusion:** Keep types with their implementations. Only extract to separate file if types are shared across many modules.

### Assumption 3: "The current structure is problematic"

**Challenge:** Let's examine each "problem":

1. "Flat structure" - Is this actually a problem? 14 files isn't unwieldy
2. "Large files" - 160-236 lines is not large by any reasonable standard
3. "Mixed concerns" - Context + Provider together is actually good co-location
4. "Inconsistent naming" - The prefixes actually convey meaning:
   - `use*` = React hook
   - `tap*` = tap primitive
   - `*Context` = context-related

**Revised assessment:** The "problems" may be perceived rather than actual. The current structure follows conventions that convey information through naming.

### Design Issue - Iteration 4

**Critical Issue: We may be solving a non-problem.**

The current flat structure with 14 files is perfectly reasonable. The "issues" identified are largely subjective preferences, not actual pain points.

**Questions to answer before restructuring:**
1. Have developers complained about the structure?
2. Are there actual bugs or maintenance issues caused by the current structure?
3. Will refactoring introduce bugs for marginal organizational benefit?

---

## Iteration 5 - Alternative Approaches

Given the critical analysis in Iteration 4, let's explore alternative approaches.

### Alternative A: Minimal Changes (Conservative)

Keep the flat structure, but address the few genuine issues:

```
packages/store/src/
├── index.ts
├── types.ts                    # Keep as-is
├── AssistantContext.tsx        # Keep as-is (provider + context together is fine)
├── AssistantIf.tsx
├── AssistantTapContext.ts      # Rename: tapContextHooks.ts
├── ClientStackContext.ts
├── DerivedClient.ts
├── EventContext.ts             # Rename: events.ts
├── tapClientList.ts
├── tapClientLookup.ts
├── tapClientResource.ts
├── useAssistantClient.tsx
├── useAssistantEvent.ts
├── useAssistantState.tsx
└── utils/
    ├── StoreResource.ts
    └── splitClients.ts
```

**Changes:**
- Rename `AssistantTapContext.ts` → `tapContextHooks.ts` (clearer purpose)
- Rename `EventContext.ts` → `events.ts` (simpler, matches content)

**Pros:** Minimal disruption, fixes naming issues
**Cons:** Doesn't address "flat structure" (which may not be a real issue)

### Alternative B: By Audience (Pragmatic)

Organize by who uses the code:

```
packages/store/src/
├── index.ts                    # Public exports

├── public/                     # User-facing API
│   ├── useAssistantClient.tsx
│   ├── useAssistantState.tsx
│   ├── useAssistantEvent.ts
│   ├── AssistantProvider.tsx   # Extracted from AssistantContext
│   ├── AssistantIf.tsx
│   └── DerivedClient.ts

├── author/                     # Library author API
│   ├── tapClient.ts            # tapClient + tapEmit
│   ├── tapClientResource.ts
│   ├── tapClientLookup.ts
│   └── tapClientList.ts

├── core/                       # Shared internal code
│   ├── types.ts
│   ├── events.ts
│   ├── AssistantContext.ts     # Just the context, not provider
│   ├── TapContext.ts           # Internal context
│   ├── ClientStackContext.ts
│   └── utils/
│       ├── StoreResource.ts
│       └── splitClients.ts
```

**Pros:** Clear separation by audience (aligns with LIST_OF_CONCEPTS.md)
**Cons:** "author" folder name is unusual

### Alternative C: Feature Modules (Domain-Driven)

Organize by feature/domain:

```
packages/store/src/
├── index.ts

├── client/                     # Client system
│   ├── index.ts                # Barrel export
│   ├── types.ts
│   ├── DerivedClient.ts
│   ├── useAssistantClient.tsx
│   └── AssistantContext.tsx

├── state/                      # State subscription
│   ├── index.ts
│   ├── useAssistantState.tsx
│   └── ProxiedAssistantState.ts

├── events/                     # Event system
│   ├── index.ts
│   ├── types.ts
│   ├── EventManager.ts
│   ├── useAssistantEvent.ts
│   └── ClientStackContext.ts

├── collections/                # List/lookup utilities
│   ├── index.ts
│   ├── tapClientResource.ts
│   ├── tapClientLookup.ts
│   └── tapClientList.ts

└── components/                 # React components
    ├── AssistantIf.tsx
    └── AssistantProvider.tsx
```

**Pros:** Each folder is a self-contained feature
**Cons:** Some files don't fit neatly (where does TapContext go?)

### Design Issues - Iteration 5

1. **Alternative A is probably sufficient** - Most "issues" are naming, not structure
2. **Alternative B maps well to documentation** - LIST_OF_CONCEPTS.md already uses user/author split
3. **Alternative C may over-engineer** - Feature modules work better for larger codebases

---

## Iteration 6 - Final Synthesis

After 5 iterations, here's the final synthesis.

### Key Insights

1. **The current structure isn't broken** - 14 files in a flat structure is manageable
2. **Naming is the real issue** - `EventContext.ts`, `AssistantTapContext.ts` are unclear
3. **Documentation matters more than folders** - Good README and AGENTS.md help more than reorganization
4. **Migration cost is real** - Any restructuring requires updating imports, tests, and docs

### Recommended Path: Incremental Improvement

**Step 1: Rename unclear files (no folder changes)**
- `EventContext.ts` → `events.ts`
- `AssistantTapContext.ts` → `tapHooks.ts` (contains tapClient, tapEmit)

**Step 2: Update index.ts comments to categorize exports**
```typescript
// index.ts

// === User-facing React Hooks ===
export { useAssistantClient } from "./useAssistantClient";
export { useAssistantState } from "./useAssistantState";
export { useAssistantEvent } from "./useAssistantEvent";

// === User-facing React Components ===
export { AssistantProvider } from "./AssistantContext";
export { AssistantIf } from "./AssistantIf";

// === Client Authoring (Library Authors) ===
export { DerivedClient } from "./DerivedClient";
export { tapClient, tapEmit } from "./tapHooks";
export { tapClientLookup } from "./tapClientLookup";
export { tapClientList } from "./tapClientList";

// === Types ===
export type { ClientRegistry, ClientResourceOutput } from "./types";
```

**Step 3: Consider folder structure only if package grows significantly**
If the package grows to 25+ files, consider the "By Audience" structure (Alternative B).

### Final File Structure Recommendation

```
packages/store/src/
├── index.ts                    # Categorized exports with comments
├── types.ts                    # Core types (unchanged)
├── events.ts                   # (renamed from EventContext.ts)
├── AssistantContext.tsx        # React context + provider (unchanged)
├── AssistantIf.tsx             # (unchanged)
├── tapHooks.ts                 # (renamed from AssistantTapContext.ts)
├── ClientStackContext.ts       # (unchanged)
├── DerivedClient.ts            # (unchanged)
├── tapClientList.ts            # (unchanged)
├── tapClientLookup.ts          # (unchanged)
├── tapClientResource.ts        # (unchanged)
├── useAssistantClient.tsx      # (unchanged)
├── useAssistantEvent.ts        # (unchanged)
├── useAssistantState.tsx       # (unchanged)
└── utils/
    ├── StoreResource.ts        # (unchanged)
    └── splitClients.ts         # (unchanged)
```

### Changes Summary

| Change Type | Count |
|-------------|-------|
| Files renamed | 2 |
| Files moved | 0 |
| New files | 0 |
| Deleted files | 0 |

### Why This Is Better Than v3.0

1. **Minimal disruption** - Only 2 renames vs. 17 file changes
2. **Fixes actual issues** - Unclear naming was the real problem
3. **No migration burden** - External imports unchanged (index.ts barrel)
4. **Leaves room for growth** - Can reorganize later if needed
5. **Avoids premature optimization** - Current structure works fine

### Decision Matrix

| Criteria | Keep Current | Minimal Changes | Full Restructure (v3.0) |
|----------|--------------|-----------------|------------------------|
| Discoverability | Good | Good | Better |
| Migration effort | None | Low | High |
| Risk of bugs | None | Low | Medium |
| Addresses real issues | No | Yes | Yes |
| Future flexibility | Good | Good | Good |
| **Recommendation** | No | **Yes** | No |

---

## Final Recommendation

**Adopt the "Minimal Changes" approach:**

1. Rename `EventContext.ts` → `events.ts`
2. Rename `AssistantTapContext.ts` → `tapHooks.ts`
3. Add categorized comments to `index.ts`
4. Update documentation paths as needed

This achieves the goal of improved clarity with minimal risk and effort.

If the package grows significantly (25+ files), revisit with Alternative B (By Audience) structure.
