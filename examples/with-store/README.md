# @assistant-ui/store Example App

This is a Next.js application demonstrating the `@assistant-ui/store` package.

## Features Demonstrated

- **Client Registry**: Module augmentation for type-safe client definitions
- **tapClientList**: Managing lists with index and key lookup
- **tapAssistantEmit**: Emitting and subscribing to scoped events
- **Derived**: Creating derived client scopes from parent resources
- **Provider Pattern**: Scoped access to list items via FooProvider
- **Component Composition**: Render props pattern with components prop

## Getting Started

```bash
# Install dependencies (from monorepo root)
pnpm install

# Run the development server
cd examples/store-example
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the example.

## Project Structure

- `lib/store/foo-scope.ts` - Type definitions via module augmentation:
  - Client registry definitions (foo, fooList)
  - State, methods, meta, and events types
- `lib/store/foo-store.tsx` - Store implementation with:
  - Resource implementations (FooItemResource, FooListResource)
  - Provider component (FooProvider)
  - FooList mapping component
- `lib/example-app.tsx` - Example app with styled components:
  - Foo component with update/delete actions
  - EventLog component demonstrating event subscriptions
  - ExampleApp with layout and styling
- `app/page.tsx` - Main page that renders the ExampleApp

## Key Concepts

### Client Registry

```typescript
declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    foo: {
      state: { id: string; bar: string };
      methods: {
        getState: () => FooState;
        updateBar: (newBar: string) => void;
        remove: () => void;
      };
      meta: {
        source: "fooList";
        query: { index: number } | { key: string };
      };
      events: {
        "foo.updated": { id: string; newValue: string };
        "foo.removed": { id: string };
      };
    };
  }
}
```

### Resource Implementation

```typescript
const FooListResource = resource(
  ({ initialValues }): ClientOutput<"fooList"> => {
    const emit = tapAssistantEmit();

    const foos = tapClientList({
      initialValues: initialValues ? [/* ... */] : [],
      getKey: (foo) => foo.id,
      resource: FooItemResource,
    });

    return {
      state: { foos: foos.state },
      methods: {
        getState: () => state,
        foo: foos.get,
        addFoo: () => { /* ... */ },
      },
    };
  },
);
```

### Provider Pattern with Derived

```typescript
const FooProvider = ({ index, children }) => {
  const aui = useAui({
    foo: Derived({
      source: "fooList",
      query: { index },
      get: (aui) => aui.fooList().foo({ index }),
    }),
  });
  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
```

### Event Subscriptions

```typescript
// Subscribe to specific events within a scope
useAuiEvent("foo.updated", (payload) => {
  console.log(`Updated to: ${payload.newValue}`);
});

// Subscribe to all events using wildcard
useAuiEvent("*", (data) => {
  console.log(data.event, data.payload);
});
```

## Learn More

- [@assistant-ui/store Documentation](../store/README.md)
- [Next.js Documentation](https://nextjs.org/docs)
