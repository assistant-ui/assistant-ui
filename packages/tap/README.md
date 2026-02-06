# @assistant-ui/tap

**tap** (Reactive Resources) is a zero-dependency reactive state management library that brings **React's hooks mental model to state management outside of React components**.

## Installation

```bash
npm install @assistant-ui/tap
```

## What is tap?

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

## Core Concepts

### Resources

Resources are self-contained units of reactive state and logic. They follow the same rules as React hooks:

- **Hook Order**: Hooks must be called in the same order in every render
- **No Conditional Hooks**: Can't call hooks inside conditionals or loops
- **No Async Hooks**: Hooks must be called synchronously during render
- Resources automatically handle cleanup and lifecycle

### Creating Resources

```typescript
import { createResourceRoot, tapState, tapEffect } from "@assistant-ui/tap";

// Define a resource using familiar hook patterns
const Counter = resource(({ incrementBy = 1 }: { incrementBy?: number }) => {
  const [count, setCount] = tapState(0);

  tapEffect(() => {
    console.log(`Count is now: ${count}`);
  }, [count]);

  return {
    count,
    increment: () => setCount((c) => c + incrementBy),
    decrement: () => setCount((c) => c - incrementBy),
  };
});

// Create an instance
const root = createResourceRoot();
const counter = root.render(Counter({ incrementBy: 2 }));

// Subscribe to changes
const unsubscribe = counter.subscribe(() => {
  console.log("Counter value:", counter.getValue().count);
});

// Use the resource
counter.getValue().increment();
```

## `resource`

Creates a resource element factory. Resource elements are plain objects of the type `{ type: ResourceFn<R, P>, props: P, key?: string | number }`.

```typescript
const Counter = resource(({ incrementBy = 1 }: { incrementBy?: number }) => {
  const [count, setCount] = tapState(0);
});

// create a Counter element
const counterEl = Counter({ incrementBy: 2 });

// create a Counter instance
const root = createResourceRoot();
root.render(counterEl);
root.unmount();
```

## Hook APIs

### `tapState`

Manages local state within a resource, exactly like React's `useState`.

```typescript
const [value, setValue] = tapState(initialValue);
const [value, setValue] = tapState(() => computeInitialValue());
```

### `tapEffect`

Runs side effects with automatic cleanup, exactly like React's `useEffect`.

```typescript
tapEffect(() => {
  // Effect logic
  return () => {
    // Cleanup logic
  };
}, [dependencies]);
```

### `tapMemo`

Memoizes expensive computations, exactly like React's `useMemo`.

```typescript
const expensiveValue = tapMemo(() => {
  return computeExpensiveValue(dep1, dep2);
}, [dep1, dep2]);
```

### `tapCallback`

Memoizes callbacks to prevent unnecessary re-renders, exactly like React's `useCallback`.

```typescript
const stableCallback = tapCallback(() => {
  doSomething(value);
}, [value]);
```

### `tapRef`

Creates a mutable reference that persists across renders, exactly like React's `useRef`.

```typescript
// With initial value
const ref = tapRef(initialValue);
ref.current = newValue;

// Without initial value
const ref = tapRef<string>(); // ref.current is undefined
ref.current = "hello";
```

### `tapResource`

Composes resources together - resources can render other resources.

```typescript
const Timer = resource(() => {
  const counter = tapResource({ type: Counter, props: { incrementBy: 1 } });

  tapEffect(() => {
    const interval = setInterval(() => {
      counter.increment();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return counter.count;
});
```

### `tapResources`

Renders multiple resources from an array, similar to React's list rendering. Returns an array with each resource's result.

```typescript
tapResources<E extends ResourceElement<any, any>>(
  getElements: () => readonly E[],
  getElementsDeps: readonly any[]
): ExtractResourceReturnType<E>[]
```

**Parameters:**
- `getElements`: A function that returns an array of ResourceElements
- `getElementsDeps`: Dependency array for memoizing the getElements function

**Example:**

```typescript
const TodoItem = resource((props: { text: string }) => {
  const [completed, setCompleted] = tapState(false);
  return { text: props.text, completed, setCompleted };
});

const TodoList = resource(() => {
  const todos = tapMemo(
    () => [
      { id: "1", text: "Learn tap" },
      { id: "2", text: "Build something awesome" },
    ],
    [],
  );

  // Returns Array<{ text, completed, setCompleted }>
  const todoItems = tapResources(
    () => todos.map((todo) => TodoItem({ text: todo.text })),
    [todos]
  );

  return todoItems;
});
```

**Key features:**
- Resource instances are preserved when keys remain the same (use `withKey()` to provide stable keys)
- Automatically cleans up resources when removed from the array
- Handles resource type changes (recreates fiber if type changes)

### `tap` and Context Support

Create and use context to pass values through resource boundaries without prop drilling.

```typescript
import {
  createResourceContext,
  tap,
  withContextProvider,
} from "@assistant-ui/tap";

const MyContext = createResourceContext(defaultValue);

// Provide context
withContextProvider(MyContext, value, () => {
  // Inside this function, tap can access the value
});

// Access context in a resource
const value = tap(MyContext);
```

## Resource Management

### `createResourceRoot`

Create an instance of a resource. Call `render()` with a resource element to render it and mount effects. Returns a `SubscribableResource` with `getValue()` and `subscribe()`.

```typescript
import { createResourceRoot } from "@assistant-ui/tap";

const root = createResourceRoot();
const counter = root.render(Counter({ incrementBy: 1 }));

// Access current value
console.log(counter.getValue().count);

// Subscribe to changes
const unsubscribe = counter.subscribe(() => {
  console.log("Counter updated:", counter.getValue());
});

// Update props by calling render again
root.render(Counter({ incrementBy: 2 }));

// Cleanup
root.unmount();
unsubscribe();
```

## React Integration

Use resources directly in React components with the `useResource` hook:

```typescript
import { useResource } from "@assistant-ui/tap/react";

function MyComponent() {
  const state = useResource(new Counter({ incrementBy: 1 }));
  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={state.increment}>Increment</button>
    </div>
  );
}
```

## Design Patterns

### Automatic Cleanup

Resources automatically clean up after themselves when unmounted:

```typescript
const WebSocketResource = resource(() => {
  const [messages, setMessages] = tapState<string[]>([]);

  tapEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };

    // Cleanup happens automatically when resource unmounts
    return () => ws.close();
  }, []);

  return messages;
});
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

## Use Cases

tap is used throughout assistant-ui for:

1. **State Management**: Application-wide state without Redux/Zustand
2. **Event Handling**: Managing event subscriptions and cleanup
3. **Resource Lifecycle**: Auto-cleanup of WebSockets, timers, subscriptions
4. **Composition**: Nested resource management (threads, messages, tools)
5. **Context Injection**: Passing values through resource boundaries without prop drilling
6. **API Wrapping**: Creating reactive API objects with `getState()` and `subscribe()`

### Example: Tools Management

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

- **Reuse React knowledge**: Developers already familiar with hooks can immediately work with tap
- **Framework flexibility**: Core logic can work outside React components
- **Automatic cleanup**: No memory leaks from forgotten unsubscribes
- **Composability**: Resources can nest and combine naturally
- **Type safety**: Full TypeScript inference for state and APIs
- **Zero dependencies**: Lightweight and portable

## Comparison with React Hooks

| React Hook    | Reactive Resource | Behavior  |
| ------------- | ----------------- | --------- |
| `useState`    | `tapState`        | Identical |
| `useEffect`   | `tapEffect`       | Identical |
| `useMemo`     | `tapMemo`         | Identical |
| `useCallback` | `tapCallback`     | Identical |
| `useRef`      | `tapRef`          | Identical |

## License

MIT
