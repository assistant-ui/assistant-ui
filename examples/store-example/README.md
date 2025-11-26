# @assistant-ui/store Example App

This is a Next.js application demonstrating the `@assistant-ui/store` package.

## Features Demonstrated

- **Scope Definition**: Module augmentation for type-safe scopes
- **tapApi**: Wrapping API objects for stability and reactivity
- **tapLookupResources**: Managing lists with index and ID lookup
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

- `lib/store/foo-store.tsx` - Clean store implementation with:
  - Scope definitions (foo, fooList) via module augmentation
  - Resource implementations (FooItemResource, FooListResource)
  - Provider component (FooProvider)
  - Minimal FooList mapping component
- `lib/example-app.tsx` - Example app with styled components:
  - Styled Foo component
  - ExampleApp with layout and styling
- `app/page.tsx` - Main page that renders the ExampleApp

## Key Concepts

### Scope Definition

```typescript
declare module "@assistant-ui/store" {
  namespace AssistantStore {
    interface Scopes {
      foo: {
        value: {
          getState: () => { id: string; bar: string };
          updateBar: (newBar: string) => void;
        };
        source: "fooList";
        query: { index: number } | { id: string };
      };
    }
  }
}
```

### Resource Implementation

```typescript
const FooListResource = resource(() => {
  const items = [
    /* ... */
  ];
  const foos = tapLookupResources(
    items.map((item) => FooItemResource(item, { key: item.id })),
  );

  return tapApi({
    getState: () => ({ foos: foos.state }),
    foo: foos.api,
  });
});
```

### Provider Pattern

```typescript
const FooProvider = ({ index, children }) => {
  const parentAui = useAssistantClient();
  const aui = useAssistantClient({
    foo: resource(() => parentAui.fooList().foo({ index }))(),
  });
  return <AssistantClientProvider client={aui}>{children}</AssistantClientProvider>;
};
```

## Learn More

- [@assistant-ui/store Documentation](../store/README.md)
- [Next.js Documentation](https://nextjs.org/docs)
