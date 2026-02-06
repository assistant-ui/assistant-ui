# Plan: Fork chain-of-thought with simpler layout architecture

## Goal

Create `chain-of-thought-v2.tsx` alongside the existing component. Same public API, simpler layout internals.

## File

- **New**: `packages/ui/src/components/assistant-ui/chain-of-thought-v2.tsx`
- **Modify**: `apps/docs/app/dev/chain-of-thought/ui-demo.client.tsx` — point at v2

## Layout simplifications (the point of this fork)

### 1. Timeline connector: `border-left` instead of connector divs
**Before**: 2 absolute `<div>`s per step (`connector-above`, `connector-below`), hidden on first/last via CSS selectors.
**After**: Single `border-left` on the `<ul>`. Icon positioned with `absolute -left-2.5` + `bg-background` to "break" the line.

### 2. Stagger animation: inline style instead of cloneElement
**Before**: `Children.toArray` → `cloneElement` injects `--step-index` CSS var.
**After**: `style={{ "--step-index": i }}` directly in the `.map()` callback. No cloneElement.

### 3. Nested group expansion: Radix Collapsible instead of CSS grid trick
**Before**: `grid-template-rows: 0fr → 1fr` + `hasOpened` ref + separate open/close keyframe coordination.
**After**: Wrap group children in `<Collapsible>` + `<CollapsibleContent>` with the same `animate-collapsible-down/up` keyframes the outer disclosure already uses. No grid, no hasOpened ref.

### 4. Auto-scroll: simplified hook
**Before**: 75-line `useAutoScroll` with `isUserScrollingRef`, `requestAnimationFrame` guards, programmatic scroll detection.
**After**: ~30-line hook. Track `isScrolledUp` via a single scroll listener. Auto-scroll with `scrollTo`. Skip the rAF dance — a simple boolean flag suffices.

### 5. Cursor animation: CSS-only
**Before**: 3-state machine (`cursorMounted` + `cursorVisible`) with `requestAnimationFrame` + `setTimeout`.
**After**: Single `<span>` with `transition-opacity`, toggled by the `showCursor` boolean prop. Mount/unmount handles entrance; CSS transition handles exit if we keep `cursorMounted` as one boolean with a timeout (much simpler).

### 6. Step indicator: flatten
**Before**: `StepIndicatorWrapper` component with conditional border, shadow, pulse, bg matching for 4 status × 2 modes (bordered/borderless). Separate `IconRenderer` component.
**After**: Inline the icon rendering into the step. One `<span>` with status-based classes. No separate wrapper component.

## What stays the same

All of these are business logic, not layout — they port over unchanged:

- **All exported types** (`TraceNode`, `TraceStep`, `TraceGroup`, `StepType`, `StepStatus`, etc.)
- **Utility functions** (`collectTraceStats`, `traceHasRunning`, `summarizeTraceStats`, etc.)
- **Message parts integration** (`groupMessagePartsByParentId`, `ChainOfThoughtTraceParts`, `ChainOfThoughtTracePartsGroup`, `traceFromMessageParts`, `traceFromThreadMessage`)
- **Disclosure state management** (`useTraceDisclosureState`, `useTraceDuration`)
- **CVA variants** (`chainOfThoughtVariants`, `stepVariants` — though stepVariants simplifies)
- **Compound component pattern** (same `ChainOfThought.Root`, `.Trigger`, `.Trace`, etc.)
- **All `data-slot` attributes** (required for tests and external CSS targeting)
- **`ChainOfThought` and `ChainOfThoughtGroup`** implementations (reasoning part renderers)

## Test contract (must pass)

From `chain-of-thought.test.tsx`, these behaviors are tested:

1. Steps have `data-slot="chain-of-thought-step"` with `--step-index` CSS var ✓ (inline style)
2. Timeline has `data-slot="chain-of-thought-timeline"` ✓
3. Groups have `data-slot="chain-of-thought-trace-group-summary"` button ✓
4. Group summary click expands to show children ✓ (Collapsible approach)
5. `scrollable={false}` prevents `max-h-64` and `overflow-y-auto` ✓
6. Trigger has `data-slot="chain-of-thought-trigger"` with `aria-expanded` ✓
7. TraceDisclosure auto-opens when streaming, auto-closes when complete ✓ (same hooks)
8. TraceDisclosure shows summary label ("Completed 1 step") ✓ (same logic)
9. Group expansion locked (disabled) while streaming ✓ (same `allowGroupExpand` prop)

## Verification

1. Run tests: `pnpm --filter @assistant-ui/ui test` (the test file imports from `./chain-of-thought` — we'll temporarily point it at v2 to verify, then revert)
2. Visual check: Update the dev demo to import from v2, run `pnpm docs:dev`, visit `/dev/chain-of-thought`
3. Compare streaming behavior side-by-side with the prototype at `/dev/timeline-prototype`
