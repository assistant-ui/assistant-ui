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
tapApiResource()

// Types
ScopeApi<K>
ApiObject
ApiProxy
AssistantScopeRegistry (module augmentation)
registerAssistantScope()
```

**Status:** Need to document this separation clearly. Consider whether `tap*` prefix is sufficient signal.

---

## Open Issue 3: "key" vs "id" Inconsistency in Lookups

**Problem:** Different lookup APIs use different field names:

```typescript
// tapLookupResources uses "key"
lookup.api({ key: "foo-1" })

// tapStoreList uses "id"
foos.api({ id: "foo-1" })
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
| `actions` vs `api` | Standardized on `api` |
| `ApiObject` allows nested objects | No, functions only |
| `tap*` prefix for internal utilities | Keep as signal for "advanced use" |
