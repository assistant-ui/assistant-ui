# @assistant-ui/tap

Zero-dependency reactive state management inspired by React hooks.

## Installation

```bash
npm install @assistant-ui/tap
```

## Overview

This library brings React's hooks mental model to state management outside of React components. It provides familiar APIs like `tapState` and `tapEffect` that work exactly like their React counterparts, but can be used anywhere.

## Core Concepts

### Resources

Resources are self-contained units of reactive state and logic. They follow the same rules as React hooks:

- Hooks must be called in the same order every render
- Hooks cannot be called conditionally
- Resources automatically handle cleanup and lifecycle

### Creating Resources

```typescript
import { createResource, tapState, tapEffect } from "@assistant-ui/tap";

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
const counter = createResource(new Counter({ incrementBy: 2 }));

// Subscribe to changes
const unsubscribe = counter.subscribe(() => {
  console.log("Counter value:", counter.getState().count);
});

// Use the resource
counter.getState().increment();
```

## `resource`

Creates a resource element factory. Resource elements are plain objects of the type `{ type: ResourceFn<R, P>, props: P, key?: string | number }`.

```typescript
const Counter = resource(({ incrementBy = 1 }: { incrementBy?: number }) => {
  const [count, setCount] = tapState(0);
});

// create a Counter element
const counterEl = new Counter({ incrementBy: 2 });

// create a Counter instance
const counter = createResource(counterEl);
counter.dispose();
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

Renders multiple resources with keys, similar to React's list rendering. All resources must have a unique `key` property.

```typescript
// Using with createResourceNodeConstructor
const TodoItem = resource((props: { text: string }) => {
  const [completed, setCompleted] = tapState(false);
  return { text: props.text, completed, setCompleted };
});

const MyTodos = resource(() => {
  const todos = [
    { id: "1", text: "Learn reactive-resources" },
    { id: "2", text: "Build something awesome" },
  ];

  const todoResources = tapResources(
    todos.map((todo) => new TodoItem({ text: todo.text }, { key: todo.id })),
  );

  return todoResources;
});
```

## Resource Management

### `createResource`

Create an instance of a resource. This renders the resource and mounts the tapEffect hooks.

```typescript
import { createResource } from "@assistant-ui/tap";

const handle = createResource(new Counter({ incrementBy: 1 }));

// Access current value
console.log(handle.getState().count);

// Subscribe to changes
const unsubscribe = handle.subscribe(() => {
  console.log("Counter updated:", handle.getState());
});

// Update props to the resource
handle.updateInput({ incrementBy: 2 });

// Cleanup
unsubscribe();
```

## Why Reactive Resources?

### Unified Mental Model

Use the same hooks pattern everywhere - no need to learn different state management concepts for component state vs application state.

### Lifecycle Management

Unlike traditional state management libraries, resources handle their own lifecycle:

```typescript
const WebSocketResource = () => {
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
};
```

### Framework Agnostic

Works with React or vanilla JavaScript. The core library has zero dependencies and doesn't require any specific framework.

### Type Safety

Full TypeScript support with proper type inference throughout.

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
