# Design Decisions: @assistant-ui/store

Open issues and pending decisions for the store package.

---

## Open Issue 1: Resource Factory Naming Convention

**Question:** Should resource factories (CloudThreadList, AISDKThread, etc.) have a naming convention?

| Option | Example | Pros | Cons |
|--------|---------|------|------|
| No suffix | `CloudThreadList()` | Cleanest, minimal | Not obviously "special" |
| `Client` suffix | `CloudThreadListClient()` | Familiar (QueryClient) | Verbose, confuses with AssistantClient |
| `$` prefix | `$CloudThreadList()` | Distinctive | Exotic, non-React |
| `Adapter` suffix | `CloudThreadListAdapter()` | Accurate | Technical jargon |

**Current recommendation:** No suffix. The configuration tree structure provides context:

```typescript
useAssistantClient({
  threads: CloudThreadList({      // position "threads" tells you what this is
    thread: () => AISDKThread({
      history: CloudHistory(),
      feedback: ArizeFeedback()
    })
  })
})
```

**Status:** Needs final decision.

---

## Open Issue 2: User API vs Library-Author API Documentation

**Problem:** The package exports both user-facing and internal APIs without clear separation.

**User-facing API (minimal):**
```typescript
// Hooks (3)
useAssistantClient(config?)
useAssistantState(selector)
useAssistantEvent(event, cb)

// Components (2)
AssistantProvider
AssistantIf

// Configuration (1)
DerivedScope(config)
```

**Library-author API (advanced):**
```typescript
// tap utilities
tapStoreContext()
tapStoreList()
tapLookupResources()
tapClientResource()

// Types
ScopeOutput<K>
ClientObject
AssistantScopeRegistry (module augmentation)
registerAssistantScope()
```

**Status:** Need to document this separation clearly. Consider whether `tap*` prefix is sufficient signal.

---

## Open Issue 3: "key" vs "id" Inconsistency in Lookups

**Problem:** Different lookup APIs use different field names:

```typescript
// tapLookupResources uses "key"
lookup.client({ key: "foo-1" })

// tapStoreList uses "id"
foos.client({ id: "foo-1" })
```

`tapStoreList` translates `{ id }` to `{ key }` internally.

**Options:**
1. Standardize on `key` everywhere (breaking change for tapStoreList)
2. Standardize on `id` everywhere (breaking change for tapLookupResources)
3. Keep both (current, but inconsistent)

**Status:** Needs decision.

---

## Resolved Decisions

For reference, these have been decided:

| Decision | Resolution |
|----------|------------|
| `actions` vs `client` | Standardized on `client` |
| `ClientObject` allows nested objects | No, functions only |
| `tap*` prefix for internal utilities | Keep as signal for "advanced use" |
| `getState` in API | Optional convention, not enforced by store |
| `value` vs `state`/`client` in scope defs | Use `state` and `client` separately |
| `ApiProxy` type | Removed - just use `TApi` directly |
| `meta` and `events` in scope defs | Optional, default to `never` |

---

## Resolved: getState Convention

**Decision:** `getState()` is an **optional convention**, not enforced by the store.

**Rationale:**
- The store uses an internal `SYMBOL_GET_STATE` mechanism for `useAssistantState`
- This allows `getState()` to be optional in user-facing APIs
- Users who want `getState()` can add it to their `client` type and implement it
- Reduces type complexity - no need for `ApiProxy` or `ScopeValue` wrapper types

**Implementation:**
- `tapClientResource` creates a proxy that intercepts `SYMBOL_GET_STATE` internally
- `useAssistantState` uses `getClientState()` which accesses this symbol
- User's `client` is passed through directly without modification
- Types use `T["client"]` directly, no wrapper types needed

**Pattern for users who want getState:**
```typescript
// Define types separately to avoid duplication
type FooState = { bar: string };
type FooApi = {
  getState: () => FooState;  // optional - add if you want it
  updateBar: (bar: string) => void;
};

// In resource implementation
return {
  state,
  client: {
    getState: () => state,  // implement it yourself
    updateBar,
  },
};
```

---

## Resolved: Scope Definition Structure

**Decision:** Use separate `state` and `client` fields instead of `value` with `getState`.

**Before:**
```typescript
interface AssistantScopeRegistry {
  foo: {
    value: {
      getState: () => { bar: string };
      updateBar: (bar: string) => void;
    };
    meta: { ... };
    events: { ... };
  };
}
```

**After:**
```typescript
interface AssistantScopeRegistry {
  foo: {
    state: { bar: string };
    client: {
      getState: () => { bar: string };  // optional
      updateBar: (bar: string) => void;
    };
    meta: { ... };
    events: { ... };
  };
}
```

**Rationale:**
- Clearer separation of concerns
- `state` is what `useAssistantState` selects from
- `client` is what `aui.foo()` returns
- `getState` is optional in `client` - just a convention
- Recommended pattern: define types separately to avoid duplication

**Recommended pattern:**
```typescript
// Define all types separately
type FooState = { bar: string };
type FooApi = {
  getState: () => FooState;
  updateBar: (bar: string) => void;
};
type FooMeta = { source: "fooList"; query: { index: number } | { id: string } };
type FooEvents = {
  "foo.updated": { id: string };
};

declare module "@assistant-ui/store" {
  interface AssistantScopeRegistry {
    // Minimal scope - just state and client
    simple: {
      state: FooState;
      client: FooClient;
    };
    // Full scope with meta and events (both optional)
    foo: {
      state: FooState;
      client: FooClient;
      meta: FooMeta;
      events: FooEvents;
    };
  }
}
```

---

## Resolved: Optional meta and events

**Decision:** `meta` and `events` are optional fields in scope definitions.

**Rationale:**
- Not all scopes need source/query tracking (`meta`)
- Not all scopes emit events (`events`)
- Reduces boilerplate for simple scopes
- Type defaults to `never` when omitted

**Implementation:**
```typescript
export type ScopeDefinition<
  TState extends Record<string, unknown> = Record<string, unknown>,
  TApi extends ClientObject = ClientObject,
  TMeta extends ScopeMetaType = never,  // defaults to never
  TEvents extends Record<string, unknown> = never,  // defaults to never
> = {
  state: TState;
  client: TClient;
  meta?: TMeta;
  events?: TEvents;
};
```

**Usage:**
- Omit `meta` for root scopes or scopes that don't need source/query tracking
- Omit `events` for scopes that don't emit events
- Include `meta` for derived scopes that use `DerivedScope` with source/query
