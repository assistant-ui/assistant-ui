# Comprehensive Plan: Port assistant-ui from React to SolidJS

## Context

This plan describes a complete, irreversible migration of the entire assistant-ui monorepo from React to SolidJS. The goal is to replace every React dependency, component, hook, and pattern with idiomatic SolidJS equivalents. No shims, compatibility layers, or React remnants will remain. The architecture (layered runtime cores, tap reactive engine, store bridge, primitives) is preserved — only the framework binding changes.

### Scope Summary

| Layer | LOC | React Coupling | Action |
|-------|-----|----------------|--------|
| `@assistant-ui/tap` (core) | ~6,500 | 0% | Keep as-is |
| `@assistant-ui/tap` (react bridge) | 60 | 100% | Rewrite 1 file |
| `@assistant-ui/core` | ~12,500 | 0% | Keep as-is |
| `assistant-stream` | ~3,500 | 0% | Keep as-is |
| `@assistant-ui/store` | ~750 | 100% | Full rewrite |
| `@assistant-ui/react` | ~16,900 | 100% | Full rewrite → `@assistant-ui/solid` |
| `@assistant-ui/ui` | ~10,700 | 100% | Full rewrite |
| Integration packages (11) | ~11,200 | 100% | Full rewrite |
| `@assistant-ui/react-native` | ~2,500 | 100% | Delete |
| Apps (4) | varies | 100% | Rewrite (Next.js → SolidStart) |
| Examples (19) | varies | 100% | Rewrite (Next.js → SolidStart) |

### Key React→SolidJS Pattern Translation Reference

These translations apply throughout every phase:

| React Pattern | SolidJS Equivalent |
|---------------|-------------------|
| `useState` | `createSignal` |
| `useEffect` | `createEffect` + `onCleanup` |
| `useLayoutEffect` | `createRenderEffect` |
| `useMemo` | `createMemo` |
| `useCallback` | not needed (closures are stable) |
| `useRef` | `let ref` variable |
| `useReducer` | `createSignal` with updater fn |
| `useSyncExternalStore` | `from()` or manual signal bridge |
| `forwardRef` | not needed (ref is a normal prop) |
| `React.memo` | not needed (fine-grained reactivity) |
| `props destructuring` | **NEVER** destructure; use `splitProps`/`mergeProps` |
| `children` | `props.children` (may need `children()` helper) |
| `React.createContext` | `createContext` from `solid-js` |
| `useContext` | `useContext` from `solid-js` |
| `{condition && <X/>}` | `<Show when={condition}><X/></Show>` |
| `array.map(...)` | `<For each={array}>{(item) => ...}</For>` |
| `displayName` | remove entirely |
| `"use client"` | remove entirely |
| `@radix-ui/*` | `@kobalte/core` equivalents |
| `react-textarea-autosize` | custom auto-resize directive or solid equivalent |
| `lucide-react` | `lucide-solid` |
| `zustand` | `createStore` from `solid-js/store` or signals |
| `react-markdown` | `solid-markdown` |
| `useEffectEvent` | not needed (SolidJS closures capture latest) |
| `@radix-ui/react-compose-refs` | simple `mergeRefs` utility |
| `@radix-ui/react-slot` | custom polymorphic `<Dynamic>` component |

---

## Phase 0: Build Infrastructure & Toolchain

**Goal**: Configure the monorepo to compile and test SolidJS JSX before any code changes.

### 0.1 Install SolidJS core dependencies at workspace root
- `solid-js` as a dependency
- `babel-preset-solid` for JSX compilation
- `solid-testing-library` + `@solidjs/router` (for later phases)
- `vite-plugin-solid` for Vitest integration

### 0.2 Modify `aui-build` (`packages/x-buildutils/src/index.ts`)
The current build uses the TypeScript compiler directly (`ts.createProgram` + `program.emit`). SolidJS requires Babel with `babel-preset-solid` to transform JSX into SolidJS's `createEffect`/`insert`/`template` calls.

**Options** (in order of preference):
1. **Add a Babel post-pass** after TypeScript emit: tsc emits `.jsx` (preserving JSX), then Babel transforms JSX → SolidJS runtime calls. This is the standard SolidJS build approach.
2. **Switch to Vite/Rollup** with `vite-plugin-solid` for packages that contain JSX. Keep tsc for declaration files.

**Concrete changes to `packages/x-buildutils/src/index.ts`**:
- Set `parsedConfig.options.jsx = ts.JsxEmit.Preserve` so tsc outputs `.jsx` files
- After tsc emit, run Babel with `babel-preset-solid` over all `.jsx` output files
- Rename `.jsx` → `.js` after Babel transform
- Update the extension transformer to handle `.jsx` → `.js` rewriting

### 0.3 Update `tsconfig` base (`packages/x-buildutils/ts/base.json`)
- Set `"jsx": "preserve"` and `"jsxImportSource": "solid-js"`
- Add `"types": ["solid-js"]` to compiler options

### 0.4 Configure Vitest for SolidJS
- Create/update `vitest.config.ts` at root and per-package with `vite-plugin-solid`
- Replace `@testing-library/react` with `@solidjs/testing-library` in test setup files
- Update `packages/react/src/tests/setup.ts` (will become `packages/solid/src/tests/setup.ts`)

### 0.5 Update Biome config
- Remove `"use client"` from any enforced patterns
- Keep Tailwind class sorting rules (still relevant)
- Ensure `.tsx` files are treated as SolidJS JSX

### 0.6 Update `turbo.json`
- No structural changes needed — build dependency graph (`test` depends on `^build`) remains valid

**Verification**: `pnpm build` compiles the framework-agnostic packages (`tap` core, `core`, `assistant-stream`) without errors. The build tool correctly preserves JSX for later Babel transformation.

---

## Phase 1: Tap SolidJS Bridge

**Goal**: Create `packages/tap/src/solid/use-resource.ts` to replace `packages/tap/src/react/use-resource.ts`.

### What changes

**Delete**: `packages/tap/src/react/use-resource.ts` (60 lines)

**Create**: `packages/tap/src/solid/use-resource.ts`

The React version uses:
- `useMemo` → `createMemo` (but needs careful handling since SolidJS memos are lazy)
- `useReducer` for version tracking → `createSignal`
- `useLayoutEffect` for commit → `createRenderEffect`
- `useRef` for strict mode detection → not needed (SolidJS has no strict mode double-render)

**SolidJS implementation pattern**:
```typescript
import { createSignal, createMemo, createRenderEffect, onCleanup } from "solid-js";
import { createResourceFiberRoot } from "../core/helpers/root";
import { createResourceFiber, renderResourceFiber, commitResourceFiber, unmountResourceFiber } from "../core/ResourceFiber";
import { commitRoot, setRootVersion } from "../core/helpers/root";

export function useResource<E extends ResourceElement>(element: E): ExtractResourceReturnType<E> {
  const [version, setVersion] = createSignal(0);

  const root = createResourceFiberRoot((cb) => {
    setRootVersion(root, version());
    const changed = cb();
    if (changed) setVersion(v => v + 1);
  });

  const fiber = createMemo(() => {
    void element.key; // track key changes
    return createResourceFiber(element.type, root, undefined, null);
  });

  // Re-render when version changes (triggers on signal read)
  const result = createMemo(() => {
    version(); // subscribe to version changes
    setRootVersion(root, version());
    return renderResourceFiber(fiber(), element.props);
  });

  createRenderEffect(() => {
    commitRoot(root);
    commitResourceFiber(fiber(), result());
  });

  onCleanup(() => unmountResourceFiber(fiber()));

  return result().output;
}
```

### Update `packages/tap/package.json`
- Change `peerDependencies` from `react` to `solid-js`
- Update exports: `"./react"` → `"./solid"` (or keep both temporarily during migration, remove `./react` at end)

### Update `packages/tap/src/index.ts`
- Re-export from `./solid/use-resource` instead of `./react/use-resource`

**Verification**: Write a minimal test that creates a tap resource, renders it via `useResource`, and verifies state updates propagate. Run `pnpm --filter @assistant-ui/tap test`.

---

## Phase 2: Store Package Rewrite

**Goal**: Rewrite all 9 files in `packages/store/src/` from React to SolidJS.

### Files to rewrite

#### 2.1 `packages/store/src/utils/react-assistant-context.tsx` → `solid-assistant-context.tsx`

**React version uses**: `createContext`, `useContext`, React Context Provider component

**SolidJS equivalent**:
```typescript
import { createContext, useContext, ParentProps } from "solid-js";

const AssistantContext = createContext<AssistantClient>(DefaultAssistantClient);

export const useAssistantContextValue = (): AssistantClient => {
  return useContext(AssistantContext);
};

export const AuiProvider = (props: ParentProps<{ value: AssistantClient }>) => {
  return (
    <AssistantContext.Provider value={props.value}>
      {props.children}
    </AssistantContext.Provider>
  );
};
```

The `DefaultAssistantClient` and `createRootAssistantClient` proxy objects are framework-agnostic — keep as-is.

#### 2.2 `packages/store/src/useAui.ts`

**React version uses**: `useResource` from `@assistant-ui/tap/react`

**SolidJS changes**:
- Import `useResource` from `@assistant-ui/tap/solid`
- Replace `useAssistantContextValue()` (React context) with SolidJS `useContext`
- The `AssistantClientResource` tap resource definition is framework-agnostic — keep as-is
- The main `useAui` function signature stays the same

#### 2.3 `packages/store/src/useAuiState.ts` — **CRITICAL CHANGE**

**React version**: Uses `useSyncExternalStore` to subscribe and return `T`

**SolidJS version**: Uses `from()` or a manual signal bridge to return `Accessor<T>` (a getter function)

**IMPORTANT DESIGN DECISION**: In SolidJS, reactive values must be accessed via getter functions to maintain reactivity tracking. `useAuiState` must return `Accessor<T>` (i.e., `() => T`), not `T` directly.

```typescript
import { from, Accessor } from "solid-js";
import { useAui } from "./useAui";
import { getProxiedAssistantState } from "@assistant-ui/core/store/internal";

export const useAuiState = <T>(selector: (state: AssistantState) => T): Accessor<T> => {
  const aui = useAui();
  const proxiedState = getProxiedAssistantState(aui);

  return from<T>((set) => {
    set(selector(proxiedState));
    return aui.subscribe(() => {
      set(selector(proxiedState));
    });
  });
};
```

**Cascading impact**: Every consumer of `useAuiState` throughout the codebase must change from:
```typescript
// React: const value = useAuiState((s) => s.something);
// SolidJS: const value = useAuiState((s) => s.something); // value is now () => T
//          value()  // to read
```

This is the single highest-impact change in the entire migration. Every primitive component and hook that calls `useAuiState` must be updated to invoke the accessor.

#### 2.4 `packages/store/src/useAuiEvent.ts`

**React version**: Uses `useEffect` + `useEffectEvent`

**SolidJS version**:
```typescript
import { createEffect, onCleanup } from "solid-js";

export const useAuiEvent = <TEvent extends AssistantEventName>(
  selector: AssistantEventSelector<TEvent>,
  callback: AssistantEventCallback<TEvent>,
) => {
  const aui = useAui();
  const { scope, event } = normalizeEventSelector(selector);

  createEffect(() => {
    const unsub = aui.on({ scope, event }, callback);
    onCleanup(unsub);
  });
};
```

No `useEffectEvent` needed — SolidJS effects always capture the latest closure values.

#### 2.5 Update remaining store files
- `packages/store/src/index.ts` — update re-exports
- `packages/store/src/scope-registry.ts` — type-only, no changes needed
- `packages/store/src/scope-factory.ts` — type-only, no changes needed

#### 2.6 Update `packages/store/package.json`
- Replace `react` peer dependency with `solid-js`
- Replace `@assistant-ui/tap/react` import with `@assistant-ui/tap/solid`
- Remove `use-effect-event` dependency

**Verification**: Write unit tests for `useAui`, `useAuiState`, `useAuiEvent` using `@solidjs/testing-library`. Verify that state updates propagate through signals correctly. Run `pnpm --filter @assistant-ui/store test`.

---

## Phase 3: Context Providers & Utility Hooks

**Goal**: Rewrite all context providers and utility hooks in the main component package.

### 3.1 Context Providers (10 files)

Located in `packages/react/src/context/providers/` and `packages/react/src/context/react/`:

| File | React Pattern | SolidJS Translation |
|------|---------------|-------------------|
| `MessageByIndexProvider.tsx` | React Context + useAui | SolidJS Context + useAui |
| `PartByIndexProvider.tsx` | React Context | SolidJS Context |
| `TextMessagePartProvider.tsx` | React Context | SolidJS Context |
| `ChainOfThoughtByIndicesProvider.tsx` | React Context | SolidJS Context |
| `ThreadViewportProvider.tsx` | zustand store + React Context | `createStore` from solid-js/store |
| `SmoothContext.tsx` | zustand + React Context | `createStore` from solid-js/store |

**Key pattern for all providers** — never destructure props:
```typescript
// React (current):
export const SomeProvider: FC<PropsWithChildren<{ index: number }>> = ({ index, children }) => { ... }

// SolidJS:
export const SomeProvider = (props: ParentProps<{ index: number }>) => {
  // Access props.index, props.children — never destructure
  ...
}
```

#### ThreadViewportProvider — zustand removal
Currently uses `zustand` to create a store with `scrollToBottom`, `onScrollToBottom`, etc.

**SolidJS replacement**: Use `createStore` from `solid-js/store`:
```typescript
import { createStore } from "solid-js/store";

const [viewportState, setViewportState] = createStore({
  isAtBottom: true,
  turnAnchor: "bottom" as "top" | "bottom",
  // ... other fields
});
```

Expose via SolidJS context. All `useThreadViewport` calls become context reads.

#### SmoothContext — zustand removal
Same pattern as ThreadViewportProvider. Replace zustand store with `createStore`.

### 3.2 Utility Hooks

Located in `packages/react/src/utils/hooks/`:

| File | Purpose | Translation Notes |
|------|---------|------------------|
| `useManagedRef.ts` | Callback ref with cleanup | Custom directive or `createEffect` with ref |
| `useSizeHandle.ts` | ResizeObserver integration | `createEffect` + `onCleanup` with ResizeObserver |
| `useOnScrollToBottom.ts` | Scroll event handler | `createEffect` + `onCleanup` |
| `useOnResizeContent.ts` | Content resize observer | `createEffect` + `onCleanup` |

### 3.3 `createActionButton` utility (`packages/react/src/utils/createActionButton.tsx`)

Currently uses `forwardRef`, `@radix-ui/react-primitive`, `@radix-ui/primitive`.

**SolidJS rewrite**:
```typescript
export const createActionButton = <TProps,>(
  displayName: string,
  useActionButton: ActionButtonCallback<TProps>,
  forwardProps: (keyof NonNullable<TProps>)[] = [],
) => {
  return (allProps: PrimitiveButtonProps & TProps) => {
    const [forwarded, primitiveProps] = splitProps(allProps, forwardProps as string[]);
    const callback = useActionButton(forwarded as TProps);

    return (
      <button
        type="button"
        {...primitiveProps}
        ref={primitiveProps.ref}
        disabled={primitiveProps.disabled || !callback()}
        onClick={(e) => {
          primitiveProps.onClick?.(e);
          if (!e.defaultPrevented) callback()?.(e);
        }}
      />
    );
  };
};
```

### 3.4 Create local utilities to replace Radix helpers
- `mergeRefs`: Simple function that calls multiple ref callbacks
- `composeEventHandlers`: Simple function that chains event handlers (can copy from `@radix-ui/primitive` — it's ~10 lines)
- Polymorphic component support: Use SolidJS `<Dynamic>` component instead of Radix `<Slot>`

**Verification**: Unit test each utility in isolation. Verify providers render children correctly with `@solidjs/testing-library`.

---

## Phase 4: Primitive Components

**Goal**: Rewrite all 17 primitive component families (~113 files, ~6,400 LOC).

This is the largest single phase. Components follow a few recurring patterns.

### Pattern A: Simple wrapper components
**Examples**: `ThreadPrimitiveRoot`, `MessagePrimitiveRoot`, `ThreadListPrimitiveRoot`, `ThreadListItemPrimitiveRoot`

```typescript
// React (forwardRef + Radix Primitive.div):
export const ThreadPrimitiveRoot = forwardRef<Element, Props>((props, ref) => {
  return <Primitive.div {...props} ref={ref} />;
});

// SolidJS (plain div, ref as prop):
export const ThreadPrimitiveRoot = (props: Props) => {
  return <div {...props} />;
};
```

### Pattern B: Conditional rendering
**Examples**: `MessagePrimitiveIf`, `ThreadPrimitiveIf`, `ComposerPrimitiveIf`

```typescript
// React:
export const MessagePrimitiveIf: FC<Props> = ({ children, ...query }) => {
  const result = useMessageIf(query);
  return result ? <>{children}</> : null;
};

// SolidJS:
export const MessagePrimitiveIf = (props: ParentProps<Props>) => {
  const [local, query] = splitProps(props, ["children"]);
  const result = useMessageIf(query);
  return <Show when={result()}>{local.children}</Show>;
};
```

### Pattern C: List rendering
**Examples**: `ThreadPrimitiveMessages`, `MessagePrimitiveParts`, `ThreadListPrimitiveItems`

```typescript
// React: array.map() with memo
// SolidJS: <For> or <Index>
export const ThreadPrimitiveMessages = (props: Props) => {
  const messageCount = useAuiState((s) => s.thread.messages.length);
  return (
    <Index each={Array.from({ length: messageCount() })}>
      {(_, index) => (
        <MessageByIndexProvider index={index}>
          <Dynamic component={props.components?.Message ?? DefaultMessage} />
        </MessageByIndexProvider>
      )}
    </Index>
  );
};
```

### Pattern D: Action buttons
**Examples**: All `ActionBar*` buttons, `ComposerSend`, `BranchPickerNext/Previous`

These all use `createActionButton` — once that utility is ported (Phase 3), these are mechanical translations.

### Pattern E: Complex interactive components
**Examples**: `ComposerPrimitiveInput`, `ThreadPrimitiveViewport`, `AssistantModalPrimitiveRoot`

These require the most careful attention:

#### `ComposerPrimitiveInput` (265 lines) — most complex primitive

Key translations:
- `react-textarea-autosize` → custom auto-resize using a SolidJS directive or `createEffect` that measures scrollHeight
- `@radix-ui/react-use-escape-keydown` → custom `onKeyDown` handler
- `useComposedRefs` → `mergeRefs` utility
- `@radix-ui/react-slot` (asChild) → `<Dynamic>` component
- `forwardRef` → `ref` prop
- Controlled `value` + `onChange` → SolidJS controlled input pattern

#### `ThreadPrimitiveViewport` — scroll management
- Replace `useRef` with local `let ref` variables
- Replace `useCallback` scroll handlers with plain functions
- `useEffect` scroll observers → `createEffect` + `onCleanup`

#### `AssistantModalPrimitiveRoot` — dialog/popover
- Replace `@radix-ui/react-popover` with `@kobalte/core/popover`
- API mapping: `Popover.Root/Trigger/Content` → similar Kobalte API

### Primitive families to port (in dependency order)

1. **threadList/** — `ThreadListRoot`, `ThreadListNew`, `ThreadListItems` (3 files)
2. **threadListItem/** — `ThreadListItemRoot`, `ThreadListItemTitle`, `ThreadListItemDelete`, etc. (5 files)
3. **threadListItemMore/** — Dropdown menu component (needs Kobalte)
4. **thread/** — `ThreadRoot`, `ThreadViewport`, `ThreadMessages`, `ThreadScrollToBottom`, `ThreadViewportSlack`, `ThreadFollowUpSuggestions` (8 files)
5. **message/** — `MessageRoot`, `MessageContent`/`MessageParts`, `MessageIf`, `MessageAttachments` (7 files)
6. **messagePart/** — `MessagePartText`, `MessagePartImage`, `MessagePartInProgress`, `MessagePartAudio` (5 files)
7. **composer/** — `ComposerRoot`, `ComposerInput`, `ComposerSend`, `ComposerCancel`, `ComposerAttachments`, `ComposerAddAttachment`, `ComposerIf` (8 files)
8. **actionBar/** — `ActionBarRoot`, `ActionBarCopy`, `ActionBarReload`, `ActionBarEdit`, `ActionBarSpeechControl`, `ActionBarFeedback` (8 files)
9. **actionBarMore/** — Dropdown action bar (needs Kobalte)
10. **branchPicker/** — `BranchPickerRoot`, `BranchPickerNext`, `BranchPickerPrevious`, `BranchPickerCount` (5 files)
11. **attachment/** — `AttachmentRoot`, `AttachmentName`, `AttachmentRemove`, `AttachmentThumb` (5 files)
12. **suggestion/** — `SuggestionRoot` (1 file)
13. **reasoning/** — `ReasoningRoot`, `ReasoningContent`, `ReasoningParts` (4 files)
14. **chainOfThought/** — `ChainOfThoughtRoot`, `ChainOfThoughtParts`, `ChainOfThoughtAccordion` (needs Kobalte accordion) (4 files)
15. **error/** — `ErrorRoot`, `ErrorMessage`, `ErrorRetry` (3 files)
16. **selectionToolbar/** — Selection-based toolbar (2 files)
17. **assistantModal/** — Modal/popover container (needs Kobalte popover) (4 files)

### External dependency replacements for primitives

| Radix Package | Used In | Kobalte Replacement |
|--------------|---------|-------------------|
| `@radix-ui/react-primitive` | everywhere | plain HTML elements |
| `@radix-ui/react-slot` | ComposerInput (asChild) | `<Dynamic>` component |
| `@radix-ui/react-compose-refs` | MessageRoot, ComposerInput | local `mergeRefs` |
| `@radix-ui/primitive` (composeEventHandlers) | ComposerRoot, ComposerInput, action buttons | local `composeEventHandlers` |
| `@radix-ui/react-use-escape-keydown` | ComposerInput | inline keydown handler |
| `@radix-ui/react-popover` | AssistantModal | `@kobalte/core/popover` |
| `@radix-ui/react-tooltip` | (if used in primitives) | `@kobalte/core/tooltip` |

**Verification**: After each family is ported, write a render test verifying the component mounts and displays expected output. Run `pnpm --filter @assistant-ui/solid test` incrementally.

---

## Phase 5: Legacy Runtime Hooks & Provider

**Goal**: Rewrite all runtime creation hooks and the `AssistantRuntimeProvider`.

### Files to rewrite

#### 5.1 `AssistantRuntimeProvider.tsx`

```typescript
// SolidJS version:
import { ParentProps } from "solid-js";

export const AssistantRuntimeProvider = (props: ParentProps<{ runtime: AssistantRuntime; aui?: AssistantClient }>) => {
  const aui = useAui({ threads: RuntimeAdapter(props.runtime) }, { parent: props.aui ?? null });

  createEffect(() => {
    if (typeof process === "undefined" || process.env.NODE_ENV === "production") return;
    const unsub = DevToolsProviderApi.register(aui);
    onCleanup(() => unsub?.());
  });

  const RenderComponent = getRenderComponent(props.runtime);

  return (
    <AuiProvider value={aui}>
      <Show when={RenderComponent}>{(Comp) => <Dynamic component={Comp()} />}</Show>
      <ThreadPrimitiveViewportProvider>
        {props.children}
      </ThreadPrimitiveViewportProvider>
    </AuiProvider>
  );
};
```

No `memo` wrapper needed (SolidJS components don't re-render).

#### 5.2 `useLocalRuntime.ts`

```typescript
// React: useState + useEffect for lifecycle
// SolidJS: create once at module level, effects for lifecycle

export const useLocalRuntime = (adapter: ChatModelAdapter, options?) => {
  // Create runtime once (no signal needed — it's a stable reference)
  const runtime = new LocalRuntimeCore(options, initialMessages);

  createEffect(() => {
    const unsub = runtime.registerModelContextProvider(modelContext);
    onCleanup(unsub);
  });

  onCleanup(() => runtime.detach());

  return new AssistantRuntimeImpl(runtime);
};
```

#### 5.3 `useExternalStoreRuntime.ts`
Same pattern — replace `useState`/`useEffect` with signals and `createEffect`/`onCleanup`.

#### 5.4 `useRemoteThreadListRuntime.ts` + `RemoteThreadListHookInstanceManager.tsx`

The `RemoteThreadListHookInstanceManager` is the most complex runtime file — it dynamically renders components for each thread to execute hooks. In React, this uses `memo` + dynamic component rendering.

**SolidJS translation**:
- Replace `memo` with plain component (SolidJS has fine-grained updates)
- Replace `.map()` with `<For>` for dynamic thread list rendering
- Each thread instance component uses `createEffect` for lifecycle management

#### 5.5 `useAssistantTransportRuntime.ts`
Replace `useRef` + `useEffect` with local variables + `createEffect`/`onCleanup`.

#### 5.6 `RuntimeAdapter.ts`
This is mostly a configuration object factory — likely minimal React coupling. Verify and update imports.

#### 5.7 Runtime type definitions
Files in `packages/react/src/legacy-runtime/runtime/` — these are mostly TypeScript interfaces and classes. Verify they have no React imports, update any that do.

**Verification**: Create a minimal test that instantiates `useLocalRuntime` inside a SolidJS component, sends a message, and verifies the response renders.

---

## Phase 6: Model Context & Tool Registration

**Goal**: Rewrite tool registration hooks.

### Files to rewrite

#### 6.1 `useAssistantTool.ts`
```typescript
// React: useEffect for registration
// SolidJS:
export const useAssistantTool = (tool: AssistantToolConfig) => {
  const aui = useAui();

  createEffect(() => {
    const unsub1 = aui.tools().setToolUI(tool.toolName, tool.render);
    onCleanup(unsub1);
  });

  createEffect(() => {
    const context = { tools: { [tool.toolName]: {...tool} } };
    const unsub2 = aui.modelContext().register({ getModelContext: () => context });
    onCleanup(unsub2);
  });
};
```

#### 6.2 `makeAssistantTool.ts`
```typescript
// React: returns a component that renders null
// SolidJS: same pattern, component returns nothing
export const makeAssistantTool = (tool: AssistantToolConfig) => {
  const Tool = () => {
    useAssistantTool(tool);
    return null;
  };
  Tool.unstable_tool = tool;
  return Tool;
};
```

#### 6.3 `makeAssistantToolUI.ts`
Same pattern as above.

#### 6.4 DevTools hooks (`packages/react/src/devtools/`)
Replace `useEffect` with `createEffect`/`onCleanup`.

#### 6.5 Client components (`packages/react/src/client/`)
- `DataRenderers.tsx`, `ExternalThread.tsx`, `InMemoryThreadList.tsx`, `Tools.tsx`
- These are convenience wrapper components — straightforward React→SolidJS component translation.

#### 6.6 `AssistantFrame` and related
- Check for React-specific patterns, translate accordingly

**Verification**: Test tool registration by creating a tool, rendering it inside an `AssistantRuntimeProvider`, and verifying the tool appears in model context.

---

## Phase 7: Package Rename & Import Path Updates

**Goal**: Rename the main package from `@assistant-ui/react` to `@assistant-ui/solid` and update all import paths monorepo-wide.

### 7.1 Directory rename
```
packages/react/ → packages/solid/
```

### 7.2 Package.json update
- `"name": "@assistant-ui/react"` → `"name": "@assistant-ui/solid"`
- Replace all `react`/`react-dom` peer dependencies with `solid-js`
- Remove all Radix UI dependencies, add `@kobalte/core`
- Remove `react-textarea-autosize`, `zustand`, `use-effect-event`
- Add `solid-js` as peer dependency

### 7.3 Global import path update
Search and replace across entire monorepo:
- `@assistant-ui/react` → `@assistant-ui/solid`
- `from "react"` → `from "solid-js"` (in the solid package)
- `from "react-dom"` → removed or replaced with solid-js equivalents

### 7.4 Remove all `"use client"` directives
SolidJS doesn't use React Server Components. Remove from every file.

### 7.5 Update exports in `packages/solid/package.json`
Keep the same sub-path export structure:
```json
"exports": {
  ".": { "aui-source": "./src/index.ts", "types": "./dist/index.d.ts", "default": "./dist/index.js" },
  "./styles": { ... }
}
```

### 7.6 Update `packages/store/package.json` imports
- Change dependency from `@assistant-ui/react` to `@assistant-ui/solid` if applicable
- Most store code doesn't depend on the main package, but verify

**Verification**: `pnpm build` succeeds for all framework-agnostic packages + `tap` + `store` + `solid`. No remaining imports of `@assistant-ui/react`.

---

## Phase 8: Integration Packages

**Goal**: Rewrite all 11 integration packages.

### 8.1 `@assistant-ui/react-ai-sdk` → `@assistant-ui/solid-ai-sdk`

**Biggest challenge**: No `@ai-sdk/solid` exists. Must build a custom SolidJS `createChat` function on top of `@ai-sdk/ui-utils`.

The `@ai-sdk/ui-utils` package (framework-agnostic) provides:
- `callChatApi` / `processChatStream` — core streaming logic
- Message type definitions
- Tool handling utilities

**Implementation approach**:
1. Create `createChat()` function (SolidJS equivalent of `useChat`):
   ```typescript
   import { callChatApi } from "@ai-sdk/ui-utils";
   import { createSignal, createStore } from "solid-js/store";

   export function createChat(options: ChatOptions) {
     const [messages, setMessages] = createStore<UIMessage[]>([]);
     const [input, setInput] = createSignal("");
     const [isLoading, setIsLoading] = createSignal(false);

     const append = async (message: CreateMessage) => {
       setIsLoading(true);
       // Use callChatApi from @ai-sdk/ui-utils
       // Stream response, update messages store
       setIsLoading(false);
     };

     return { messages, input, setInput, isLoading, append, ... };
   }
   ```

2. Port `useAISDKRuntime` → `createAISDKRuntime` — wraps the chat state in an `ExternalStoreRuntimeCore`
3. Port `useChatRuntime` → `createChatRuntime` — combines transport + runtime
4. Port `AssistantChatTransport.ts` — likely framework-agnostic, minimal changes
5. Port utility files (`convertMessage.ts`, `sliceMessagesUntil.ts`, etc.) — mostly framework-agnostic

### 8.2 `@assistant-ui/react-langgraph` → `@assistant-ui/solid-langgraph`
- Replace `useExternalStoreRuntime` with SolidJS version
- Replace `useEffect`/`useState` with `createEffect`/`createSignal`
- ~2,476 LOC

### 8.3 `@assistant-ui/react-data-stream` → `@assistant-ui/solid-data-stream`
- Small package (335 LOC)
- Replace hook patterns with SolidJS equivalents

### 8.4 `@assistant-ui/react-ag-ui` → `@assistant-ui/solid-ag-ui`
- Replace React hooks with SolidJS primitives
- ~1,758 LOC

### 8.5 `@assistant-ui/react-a2a` → `@assistant-ui/solid-a2a`
- Similar to ag-ui — hook translation
- ~918 LOC

### 8.6 `@assistant-ui/react-hook-form` → `@assistant-ui/solid-modular-forms`
- Replace `react-hook-form` dependency with `@modular-forms/solid`
- Complete API redesign since form libraries differ significantly
- ~209 LOC (small)

### 8.7 `@assistant-ui/react-markdown` → `@assistant-ui/solid-markdown`
- Replace `react-markdown` with `solid-markdown`
- Replace `remark-gfm` plugin usage (should work with solid-markdown)
- ~514 LOC

### 8.8 `@assistant-ui/react-syntax-highlighter` → `@assistant-ui/solid-syntax-highlighter`
- Replace `react-syntax-highlighter` with direct Shiki or Prism integration
- Very small package (91 LOC)

### 8.9 `@assistant-ui/react-streamdown` → `@assistant-ui/solid-streamdown`
- Streaming markdown renderer
- May need custom SolidJS streaming markdown solution
- ~1,873 LOC

### 8.10 `@assistant-ui/react-devtools` → `@assistant-ui/solid-devtools`
- Replace React hooks with SolidJS equivalents
- ~925 LOC

### 8.11 `@assistant-ui/react-o11y` → `@assistant-ui/solid-o11y`
- Observability hooks
- Replace `useEffect` subscriptions with `createEffect`
- ~531 LOC

### Package naming
All packages rename from `react-*` to `solid-*`:
- Directory: `packages/react-ai-sdk/` → `packages/solid-ai-sdk/`
- npm name: `@assistant-ui/react-ai-sdk` → `@assistant-ui/solid-ai-sdk`

**Verification**: Each integration package builds successfully. Write at least one integration test per package that creates a runtime and renders a basic thread.

---

## Phase 9: UI Package (Styled Components)

**Goal**: Rewrite `@assistant-ui/ui` (80 files, ~10,700 LOC) from React+Radix to SolidJS+Kobalte.

### 9.1 Dependency replacements

| React Dependency | SolidJS Replacement |
|-----------------|-------------------|
| All `@radix-ui/react-*` (25 packages) | `@kobalte/core` equivalents |
| `lucide-react` | `lucide-solid` |
| `react-hook-form` | `@modular-forms/solid` |
| `react-day-picker` | Custom or `solid-datepicker` |
| `react-resizable-panels` | Custom SolidJS resizable panels |
| `react-shiki` | Direct Shiki integration |
| `react-syntax-highlighter` | Direct Prism/Shiki |
| `embla-carousel-react` | `embla-carousel` (vanilla) with SolidJS wrapper |
| `cmdk` | Custom or Kobalte combobox |
| `sonner` | `solid-sonner` or `@kobalte/core/toast` |
| `vaul` | Custom drawer or Kobalte dialog |
| `recharts` | `solid-chartjs` or custom |
| `zustand` | `createStore` from solid-js/store |
| `next-themes` | Custom theme provider |
| `input-otp` | Custom SolidJS OTP input |

### 9.2 Component translation pattern

Each shadcn-style component follows the same pattern:
```typescript
// React:
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, ...props }, ref) => {
  return <button className={cn(buttonVariants({ variant }), className)} ref={ref} {...props} />;
});

// SolidJS:
const Button = (props: ButtonProps) => {
  const [local, others] = splitProps(props, ["class", "variant", "ref"]);
  return <button class={cn(buttonVariants({ variant: local.variant }), local.class)} ref={local.ref} {...others} />;
};
```

### 9.3 Kobalte component mapping

| Radix Component | Kobalte Equivalent |
|----------------|-------------------|
| `Dialog` | `@kobalte/core/dialog` |
| `Popover` | `@kobalte/core/popover` |
| `Tooltip` | `@kobalte/core/tooltip` |
| `DropdownMenu` | `@kobalte/core/dropdown-menu` |
| `Select` | `@kobalte/core/select` |
| `Accordion` | `@kobalte/core/accordion` |
| `Tabs` | `@kobalte/core/tabs` |
| `Checkbox` | `@kobalte/core/checkbox` |
| `Switch` | `@kobalte/core/switch` |
| `RadioGroup` | `@kobalte/core/radio-group` |
| `Slider` | `@kobalte/core/slider` |
| `Progress` | `@kobalte/core/progress` |
| `Separator` | `@kobalte/core/separator` |
| `ContextMenu` | `@kobalte/core/context-menu` |
| `AlertDialog` | `@kobalte/core/alert-dialog` |
| `Collapsible` | `@kobalte/core/collapsible` |
| `HoverCard` | `@kobalte/core/hover-card` |
| `Toggle` | `@kobalte/core/toggle-button` |
| `NavigationMenu` | `@kobalte/core/navigation-menu` |
| `ScrollArea` | Custom or CSS overflow |
| `Label` | Plain `<label>` |
| `Avatar` | `@kobalte/core/image` |

### 9.4 CSS/Tailwind
- `class-variance-authority`, `clsx`, `tailwind-merge` — all framework-agnostic, keep as-is
- Change `className` → `class` throughout
- Tailwind class sorting biome rule still applies

### 9.5 Package rename
- `packages/ui/package.json`: name stays `@assistant-ui/ui` (it's the styled layer)
- Update internal dependency from `@assistant-ui/react` → `@assistant-ui/solid`

**Verification**: Visual inspection — render key components (Thread, Composer, ActionBar) in a test harness. Verify Tailwind classes render correctly.

---

## Phase 10: Delete React Native Package

**Goal**: Remove `@assistant-ui/react-native` entirely.

### Actions
1. Delete `packages/react-native/` directory (67 files, 2,471 LOC)
2. Remove from `pnpm-workspace.yaml`
3. Remove from `turbo.json` if explicitly listed
4. Remove any cross-references from other packages
5. Remove from changeset config if listed

**Verification**: `pnpm install` succeeds without the package. No remaining imports reference it.

---

## Phase 11: Apps

**Goal**: Migrate all 4 apps from Next.js to SolidStart.

### 11.1 Docs app (`apps/docs/`)
- Currently: Next.js + Fumadocs
- **Target**: SolidStart + custom docs framework or `solid-docs` equivalent
- This is a significant rewrite — Fumadocs is deeply React-coupled
- MDX content may need conversion to SolidJS MDX (`solid-mdx`)
- Routing: Next.js App Router → SolidStart file-based routing

### 11.2 shadcn Registry (`apps/shadcn-registry/`)
- Update registry templates to generate SolidJS component code instead of React
- Update the registry schema/config

### 11.3 DevTools Extension (`apps/devtools-extension/`)
- Chrome extension popup/panel — convert React components to SolidJS
- Chrome extension APIs are framework-agnostic

### 11.4 DevTools Frame (`apps/devtools-frame/`)
- Currently Next.js
- Convert to SolidStart or plain Vite + SolidJS (simpler for an iframe)

### Shared app changes
- Remove all `next.config.js` files
- Create `app.config.ts` (SolidStart config) for each app
- Replace `next/link`, `next/router`, `next/image` with SolidStart equivalents
- Replace `next/font` with direct font loading

**Verification**: Each app builds and starts locally. Docs site renders pages correctly. DevTools extension loads in Chrome.

---

## Phase 12: Examples

**Goal**: Migrate all 19 examples from Next.js to SolidStart.

### Examples to convert
Each example follows the same pattern: Next.js app with a page that renders assistant-ui components.

| Example | Special Dependencies | Notes |
|---------|---------------------|-------|
| `waterfall` | — | Basic example |
| `with-ag-ui` | AG-UI SDK | Uses solid-ag-ui |
| `with-ai-sdk-v6` | AI SDK v6 | Uses solid-ai-sdk |
| `with-assistant-transport` | — | Transport layer |
| `with-chain-of-thought` | — | CoT display |
| `with-cloud` | assistant-cloud | Cloud integration |
| `with-cloud-standalone` | assistant-cloud | Standalone cloud |
| `with-custom-thread-list` | — | Custom thread list |
| `with-elevenlabs-scribe` | ElevenLabs SDK | Voice integration |
| `with-expo` | **DELETE** | No SolidJS Expo equivalent |
| `with-external-store` | — | External store pattern |
| `with-ffmpeg` | @ffmpeg/ffmpeg | File processing |
| `with-langgraph` | LangGraph SDK | Uses solid-langgraph |
| `with-parent-id-grouping` | — | Message grouping |
| `with-react-hook-form` | → `with-modular-forms` | Form integration |
| `with-react-router` | → `with-solid-router` | Uses SolidStart routing |
| `with-store` | — | Store pattern |
| `with-tanstack` | TanStack Query | `@tanstack/solid-query` |
| `with-tap-runtime` | — | Tap runtime |

### Per-example conversion pattern
1. `next.config.js` → `app.config.ts` (SolidStart)
2. `app/page.tsx` → `src/routes/index.tsx` (SolidStart routing)
3. `app/layout.tsx` → `src/routes/__layout.tsx`
4. `app/api/` routes → SolidStart API routes (`src/routes/api/`)
5. Update all imports from `@assistant-ui/react` → `@assistant-ui/solid`
6. Translate React component patterns to SolidJS

### Delete Expo example
`examples/with-expo/` — delete entirely (no SolidJS Expo runtime).

**Verification**: Each example builds with `pnpm build`. At least 3 representative examples run correctly in dev mode.

---

## Phase 13: Final Cleanup & Verification

**Goal**: Ensure zero React code remains anywhere in the monorepo.

### 13.1 Exhaustive search for React remnants
```bash
# Search for any remaining React imports
grep -r "from ['\"]react['\"]" packages/ apps/ examples/
grep -r "from ['\"]react-dom['\"]" packages/ apps/ examples/
grep -r "@radix-ui/react" packages/ apps/ examples/
grep -r "react-textarea-autosize" packages/ apps/ examples/
grep -r "zustand" packages/ apps/ examples/
grep -r "use client" packages/ apps/ examples/
grep -r "forwardRef" packages/ apps/ examples/
grep -r "displayName" packages/ apps/ examples/
grep -r "useSyncExternalStore" packages/ apps/ examples/
```

### 13.2 Dependency audit
- Check every `package.json` for React-related dependencies
- Ensure no React types in any `tsconfig.json`
- Verify `pnpm-lock.yaml` has no React packages

### 13.3 Build verification
```bash
pnpm install
pnpm build          # All packages build
pnpm test           # All tests pass
pnpm lint           # Biome passes
```

### 13.4 Update root `package.json` and workspace config
- Remove any React-related scripts
- Update workspace patterns if package directories changed

### 13.5 Update `CLAUDE.md`
- Replace all React references with SolidJS
- Update build commands if changed
- Update architecture overview

### 13.6 Update changeset configuration
- Update package names in `.changeset/config.json`

### 13.7 Remove tap React bridge
- Delete `packages/tap/src/react/` directory entirely
- Remove `"./react"` export from tap's `package.json`
- Ensure only `"./solid"` export exists

---

## Execution Order Summary

```
Phase 0:  Build Infrastructure         ← Foundation (must be first)
Phase 1:  Tap SolidJS Bridge           ← 1 file, enables everything else
Phase 2:  Store Package Rewrite        ← 9 files, critical API surface
Phase 3:  Context Providers & Utils    ← ~15 files, enables primitives
Phase 4:  Primitive Components         ← ~113 files, largest phase
Phase 5:  Runtime Hooks & Provider     ← ~10 files, runtime lifecycle
Phase 6:  Model Context & Tools        ← ~10 files, tool system
Phase 7:  Package Rename               ← Global find-replace
Phase 8:  Integration Packages         ← 11 packages
Phase 9:  UI Package                   ← 80 files, styled layer
Phase 10: Delete React Native          ← Simple deletion
Phase 11: Apps                         ← 4 apps, Next.js → SolidStart
Phase 12: Examples                     ← 19 examples
Phase 13: Final Cleanup                ← Verification sweep
```

Phases 0-7 must be sequential (each depends on the previous).
Phases 8, 9, 10 can be parallelized after Phase 7.
Phases 11, 12 can be parallelized after Phases 8-9.
Phase 13 must be last.

---

## Risk Areas & Mitigations

### 1. `useAuiState` return type change (Phase 2)
**Risk**: Every component consuming state must change from `value` to `value()`. Missing an accessor call will cause subtle bugs (reading the function itself, not the value).
**Mitigation**: TypeScript will catch most cases since `Accessor<T>` is `() => T`, and using it where `T` is expected will be a type error. Run type-check after Phase 2 to identify all call sites.

### 2. Props destructuring (everywhere)
**Risk**: SolidJS breaks reactivity if props are destructured. This is the #1 SolidJS migration pitfall.
**Mitigation**: Use `splitProps` and `mergeProps` consistently. Biome/ESLint plugin for SolidJS can enforce this.

### 3. AI SDK integration (Phase 8)
**Risk**: Building `createChat` from `@ai-sdk/ui-utils` is non-trivial — `useChat` in `@ai-sdk/react` is ~1,000 lines.
**Mitigation**: Start with a minimal implementation covering core features (send message, stream response, message list). Add features incrementally.

### 4. Kobalte API differences (Phases 4, 9)
**Risk**: Kobalte's API differs from Radix in subtle ways (prop names, event handling, composition patterns).
**Mitigation**: Reference Kobalte docs for each component. Test accessibility behavior.

### 5. Docs app Fumadocs dependency (Phase 11)
**Risk**: Fumadocs is React-only. No SolidJS equivalent exists.
**Mitigation**: May need to build custom docs infrastructure on SolidStart, or use a different docs framework. This is the most uncertain part of the migration.

### 6. SolidJS controlled inputs (Phase 4)
**Risk**: Controlled inputs in SolidJS work differently from React — setting `value` directly doesn't trigger `onInput`.
**Mitigation**: Use SolidJS's input control patterns. The `ComposerInput` rewrite requires careful testing with IME, paste, and keyboard events.
