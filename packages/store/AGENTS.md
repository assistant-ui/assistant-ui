# What is tap?

**tap** (Reactive Resources) is a zero-dependency reactive state management library that brings **React's hooks mental model to state management outside of React components**.

## Core Concept

Instead of limiting hooks to React components, tap lets you use the same familiar hooks pattern (`useState`, `useEffect`, `useMemo`, etc.) to create self-contained, reusable units of reactive state and logic called **Resources** that can be used anywhere - in vanilla JavaScript, servers, or outside of React.

## Philosophy

- **Unified mental model**: Use the same hooks pattern everywhere
- **Framework agnostic**: Zero dependencies, works with or without React
- **Lifecycle management**: Resources handle their own cleanup automatically
- **Type-safe**: Full TypeScript support with proper type inference

## How It Works

tap implements a **render-commit pattern** similar to React:

### Render Phase

1. Each resource instance has a "fiber" that tracks state and effects
2. When a resource function runs, hooks record their data in the fiber
3. The library maintains an execution context to track which fiber's hooks are being called
4. Each hook stores its data in cells indexed by call order (enforcing React's rules)

### Commit Phase

1. After render, collected effect tasks are processed
2. Effects check if dependencies changed using shallow equality
3. Old effects are cleaned up before new ones run
4. Updates are batched using microtasks to prevent excessive re-renders

## Key APIs

### Creating Resources

```typescript
const Counter = resource(({ incrementBy = 1 }) => {
  const [count, setCount] = tapState(0);

  const increment = tapCallback(() => {
    setCount((c) => c + incrementBy);
  }, [incrementBy]);

  return { count, increment };
});

// Create and mount
const handle = createResource(new Counter({ incrementBy: 1 }));
handle.getState(); // Get current state
handle.subscribe(fn); // Subscribe to changes
handle.updateInput(props); // Update props
handle.dispose(); // Cleanup
```

### Available Hooks

| Hook                    | Purpose                         | React Equivalent |
| ----------------------- | ------------------------------- | ---------------- |
| `tapState(initial)`     | Manages local state             | `useState`       |
| `tapEffect(fn, deps)`   | Runs side effects with cleanup  | `useEffect`      |
| `tapMemo(fn, deps)`     | Memoizes expensive computations | `useMemo`        |
| `tapCallback(fn, deps)` | Memoizes callbacks              | `useCallback`    |
| `tapRef(initial)`       | Creates mutable reference       | `useRef`         |

### Resource Composition

**Single Resource:**

```typescript
const Timer = resource(() => {
  const counter = tapResource({ type: Counter, props: { incrementBy: 1 } });

  tapEffect(() => {
    const interval = setInterval(() => counter.increment(), 1000);
    return () => clearInterval(interval);
  }, []);

  return counter.count;
});
```

**Multiple Resources (like lists):**

```typescript
const TodoList = resource(() => {
  const todos = [
    { id: "1", text: "Learn tap" },
    { id: "2", text: "Build app" },
  ];

  const todoItems = tapResources(
    todos.map((todo) => new TodoItem({ text: todo.text }, { key: todo.id })),
  );

  return todoItems;
});
```

### Context Support

```typescript
const MyContext = createContext(defaultValue);

// Provide context
withContextProvider(MyContext, value, () => {
  // Inside this function, tapContext can access the value
});

// Access context
const value = tapContext(MyContext);
```

### React Integration

```typescript
import { useResource } from "@assistant-ui/tap/react";

function MyComponent() {
  const state = useResource(new Counter({ incrementBy: 1 }));
  return <div>{state.count}</div>;
}
```

## Design Patterns

### Automatic Cleanup

```typescript
tapEffect(() => {
  const subscription = eventEmitter.on("data", handler);

  // Cleanup returned automatically when resource unmounts
  return () => subscription.unsubscribe();
}, [dependencies]);
```

### API Wrapper Pattern

A common pattern in assistant-ui is to wrap resource state in a stable API object:

```typescript
export const tapApi = <TApi extends ApiObject & { getState: () => any }>(
  api: TApi,
) => {
  const ref = tapRef(api);

  tapEffect(() => {
    ref.current = api;
  });

  const apiProxy = tapMemo(
    () =>
      new Proxy<TApi>({} as TApi, new ReadonlyApiHandler(() => ref.current)),
    [],
  );

  return tapMemo(
    () => ({
      state: api.getState(),
      api: apiProxy,
    }),
    [api.getState()],
  );
};
```

## Important Rules

tap follows React's rules for hooks:

1. **Hook Order**: Hooks must be called in the same order in every render
2. **No Conditional Hooks**: Can't call hooks inside conditionals or loops
3. **No Async Hooks**: Hooks must be called synchronously during render

## Use Cases in assistant-ui

tap is used throughout assistant-ui for:

1. **State Management**: Application-wide state without Redux/Zustand
2. **Event Handling**: Managing event subscriptions and cleanup
3. **Resource Lifecycle**: Auto-cleanup of WebSockets, timers, subscriptions
4. **Composition**: Nested resource management (threads, messages, tools)
5. **Context Injection**: Passing values through resource boundaries without prop drilling
6. **API Wrapping**: Creating reactive API objects with `getState()` and `subscribe()`

## Example: Tools Management

```typescript
export const Tools = resource(({ toolkit }: { toolkit?: Toolkit }) => {
  const [state, setState] = tapState<ToolsState>(() => ({
    tools: {},
  }));

  const modelContext = tapModelContext();

  tapEffect(() => {
    if (!toolkit) return;

    // Register tools and setup subscriptions
    const unsubscribes: (() => void)[] = [];
    // ... registration logic

    return () => unsubscribes.forEach((fn) => fn());
  }, [toolkit, modelContext]);

  return tapApi<ToolsApi>({
    getState: () => state,
    setToolUI,
  });
});
```

## Why tap?

tap allows assistant-ui to:

- **Reuse React knowledge**: Developers already familiar with hooks can immediately work with tap
- **Framework flexibility**: Core logic can work outside React components
- **Automatic cleanup**: No memory leaks from forgotten unsubscribes
- **Composability**: Resources can nest and combine naturally
- **Type safety**: Full TypeScript inference for state and APIs
- **Zero dependencies**: Lightweight and portable

For more details, see the [@assistant-ui/tap package](../tap).
