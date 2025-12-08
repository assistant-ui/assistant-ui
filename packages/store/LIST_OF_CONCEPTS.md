# List of Concepts

## User Facing

These are concepts that users consuming assistant-ui need to understand.

### Packages

- **@assistant-ui/store** - The store package
- **@assistant-ui/tap** - The tap package

### Core

- **AssistantProvider** - React component that provides the AssistantClient to the component tree
- **useAssistantClient(clientInputs?)** - Hook to access or create an AssistantClient with optional client inputs
- **AssistantClient** - The main object for accessing clients: `client.thread().speak()`

### State

- **State** - The current state of all clients
- **useAssistantState(selector)** - Hook to subscribe to state changes with a selector function
- **AssistantIf** - Conditional rendering component that takes a `condition(state) => boolean`

### Events

- **Events** - Things that happen in the system that can be listened to
- **useAssistantEvent(eventSelector, callback)** - Hook to listen for events
- **EventSelector** - String like `"thread.updated"` or object `{ scope, event }`
- **WildcardEventSelectors** - Use `"*"` to match any event or scope
- **Payload** - Data passed to event callbacks

### Client Access

- **Client** - A named unit of state and methods (e.g., `thread`, `message`)
- **ClientField** - Function on AssistantClient to access a client's methods: `client.thread()`
- **ClientSource** - The parent client name (e.g., `"thread"` for messages)
- **ClientQuery** - Parameters to identify a specific client instance (e.g., `{ messageId }`)

---

## Client Author Facing

These are concepts for developers creating custom clients.

### Client Definition

- **ClientDefinition** - Type defining a client: `{ state, methods, meta?, events? }`
- **ClientOutput<K>** - Return type from client resources: `{ state, methods }`
- **AssistantClientRegistry** - Module augmentation interface to register custom clients
- **ClientMeta** - Metadata about a client: `{ source, query }`

### Client Patterns

- **RootClient** - Top-level client with `source: "root"`, `query: {}`
- **DerivedClient** - Client created from another client with `source`, `query`, and `get`

### Tap Hooks

- **tapAssistantClient()** - Access the AssistantClient inside tap resources
- **tapEmitEvent()** - Get the emit function to emit events from tap resources

### List Management

- **tapClientList(config)** - Create stateful lists with add/remove functionality
- **tapClientLookup(map, getElement, deps?)** - Create lookup-based collections
- **TapClientListProps** - Config: `{ initialValues, resource, getKey }`
- **TapClientListResourceProps** - Props passed to list items: `{ key, initialData, remove }`

### Events

- **AssistantEventMap** - Complete map of all events (includes `"*"` wildcard)
- **AssistantEventScopeConfig** - Module augmentation to map event sources to parent clients
- **EventSource<TEvent>** - The part before the dot (e.g., `"thread"` from `"thread.updated"`)

### Base Types

- **ClientObject** - Base interface for methods types (plain object with methods)
- **ClientsInput** - Map of client names to their ResourceElement inputs
- **AssistantClients** - The complete set of all registered clients
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

- **RootClientResource** - Wraps a single root client with store functionality
- **RootClientsResource** - Mounts all root clients with unified subscription
- **DerivedClientResource** - Creates a derived client field with memoized methods
- **DerivedClientsResource** - Handles all derived clients

### Client Proxying

- **tapClientResource** - Wraps ResourceElement to create stable client proxy
- **tapClientResources** - Batch version for multiple resources
- **ClientProxy** - Proxy handler for read-only, stable client proxies
- **SYMBOL_GET_OUTPUT** - Internal symbol to access raw `{ state, methods }` output

### Event Internals

- **EventManager** - Internal: `{ on(event, callback), emit(event, payload) }`
- **normalizeEventSelector** - Converts event selector to normalized form
- **checkEventScope** - Type guard for event scope validation
- **ClientEventMap** - Combined map of all events from all clients
- **SourceByScope<TScope>** - Resolves event sources for a given scope

### Store Utilities

- **Store<T>** - Interface: `{ getState(), subscribe(listener) }`
- **StoreResource** - Convert a ResourceElement into a Store

### Utilities

- **splitClients** - Separates clients into `rootClients` and `derivedClients`
