# List of Concepts

## User Facing

These are concepts that users consuming assistant-ui need to understand.

### Packages

- **@assistant-ui/store** - The store package
- **@assistant-ui/tap** - The tap package

### Core

- **AssistantProvider** - React component that provides the AssistantClient to the component tree
- **useAssistantClient(scopeInputs?)** - Hook to access or create an AssistantClient with optional scope inputs
- **AssistantClient** - The main object for accessing scopes: `client.thread().speak()`

### State

- **State** - The current state of all scopes
- **useAssistantState(selector)** - Hook to subscribe to state changes with a selector function
- **AssistantIf** - Conditional rendering component that takes a `condition(state) => boolean`

### Events

- **Events** - Things that happen in the system that can be listened to
- **useAssistantEvent(eventSelector, callback)** - Hook to listen for events
- **EventSelector** - String like `"thread.updated"` or object `{ scope, event }`
- **WildcardEventSelectors** - Use `"*"` to match any event or scope
- **Payload** - Data passed to event callbacks

### Scope Access

- **Scope** - A named unit of state and client (e.g., `thread`, `message`)
- **ScopeField** - Function on AssistantClient to access a scope's client: `client.thread()`
- **ScopeSource** - The parent scope name (e.g., `"thread"` for messages)
- **ScopeQuery** - Parameters to identify a specific scope instance (e.g., `{ messageId }`)

---

## Scope Author Facing

These are concepts for developers creating custom scopes.

### Scope Definition

- **ScopeDefinition** - Type defining a scope: `{ state, client, meta?, events? }`
- **ScopeOutput<K>** - Return type from scope resources: `{ state, client }`
- **AssistantScopeRegistry** - Module augmentation interface to register custom scopes
- **ScopeMeta** - Metadata about a scope: `{ source, query }`

### Scope Registration

- **registerAssistantScope({ name, defaultInitialize })** - Register a default scope implementation
- **getDefaultScopeInitializer(name)** - Retrieve the registered initializer for a scope
- **hasRegisteredScope(name)** - Check if a scope has been registered

### Scope Patterns

- **RootScope** - Top-level scope with `source: "root"`, `query: {}`
- **DerivedScope** - Scope created from another scope with `source`, `query`, and `get`

### Tap Hooks

- **tapAssistantClient()** - Access the AssistantClient inside tap resources
- **tapEmitEvent()** - Get the emit function to emit events from tap resources

### List Management

- **tapStoreList(config)** - Create stateful lists with add/remove functionality
- **tapLookupResources(map, getElement, deps?)** - Create lookup-based collections
- **TapStoreListConfig** - Config: `{ initialValues, resource, idGenerator? }`
- **TapStoreListResourceProps** - Props passed to list items: `{ initialValue, remove }`

### Events

- **AssistantEventMap** - Complete map of all events (includes `"*"` wildcard)
- **AssistantEventScopeConfig** - Module augmentation to map event sources to parent scopes
- **EventSource<TEvent>** - The part before the dot (e.g., `"thread"` from `"thread.updated"`)

### Base Types

- **ClientObject** - Base interface for client types (plain object with methods)
- **ScopeResources** - Map of scope names to their ResourceElement inputs
- **AssistantScopes** - The complete set of all registered scopes
- **Unsubscribe** - `() => void` returned by subscription functions

---

## Internal

These are implementation details not meant for public use.

### Context Internals

- **AssistantContext** - React context containing the AssistantClient
- **AssistantTapContextValue** - Internal context: `{ client, events }`
- **tapAssistantContext()** - Internal tap hook for accessing AssistantTapContextValue
- **withAssistantTapContextProvider** - Provides tap context to resources

### Resource Wrappers

- **RootScopeResource** - Wraps a single root scope with store functionality
- **RootScopesResource** - Mounts all root scopes with unified subscription
- **DerivedScopeResource** - Creates a derived scope field with memoized client
- **DerivedScopesResource** - Handles all derived scopes

### Client Proxying

- **tapClientResource** - Wraps ResourceElement to create stable client proxy
- **tapClientResources** - Batch version for multiple resources
- **ReadonlyClientHandler** - Proxy handler for read-only, stable client proxies
- **ProxiedAssistantState** - Lazy state access via Proxy
- **SYMBOL_GET_OUTPUT** - Internal symbol to access raw `{ state, client }` output

### Event Internals

- **EventManager** - Internal: `{ on(event, callback), emit(event, payload) }`
- **normalizeEventSelector** - Converts event selector to normalized form
- **checkEventScope** - Type guard for event scope validation
- **ScopeEventMap** - Combined map of all events from all scopes
- **SourceByScope<TScope>** - Resolves event sources for a given scope

### Store Utilities

- **Store<T>** - Interface: `{ getState(), subscribe(listener), flushSync() }`
- **asStore(resourceElement)** - Convert a ResourceElement into a Store

### Utilities

- **splitScopes** - Separates scopes into `rootScopes` and `derivedScopes`
