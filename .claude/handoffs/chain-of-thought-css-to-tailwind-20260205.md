# Bootstrap: Migrate chain-of-thought CSS to Tailwind

> Generated: 2026-02-05
> Project: /Users/petepetrash/Code/aui/assistant-ui
> Branch: pkp/chain-of-thought-parts-grouped

## Context

We're building a `ChainOfThought` component in `packages/ui/` — a composable, Radix-style primitive for displaying AI reasoning and agent execution traces. It's a collapsible disclosure with timeline/step rendering and nested trace tree support.

In the previous session we audited the component (originally ~3000 LOC) and simplified it: extracted inline CSS to a `.css` file, deleted a fake typewriter effect, removed a crossfade animation, killed dead code paths, and consolidated status mappers. The TSX went from 2991 → 2575 lines.

**Now the goal is: migrate `chain-of-thought.css` (209 lines) into Tailwind classes on the components that use them, and delete the CSS file entirely.** The rest of the codebase is Tailwind-based — this CSS file is an outlier.

## Current State

- Clean working tree, latest commit: `9048576d`
- `chain-of-thought.tsx` (2574 lines) — the component, already uses Tailwind extensively
- `chain-of-thought.css` (209 lines) — extracted CSS for windowing animations, needs to be migrated to Tailwind or inline styles
- `chain-of-thought.test.tsx` (760 lines) — tests, has pre-existing type errors (test data not typed with `as const`), unrelated to our work
- `chain-of-thought-demo.tsx` in `apps/docs/` — demo, only imports 5 things from the component

## Key Files

- `packages/ui/src/components/assistant-ui/chain-of-thought.tsx` — the component
- `packages/ui/src/components/assistant-ui/chain-of-thought.css` — CSS to migrate/delete
- `packages/ui/src/components/assistant-ui/chain-of-thought.test.tsx` — tests
- `.claude/plans/chain-of-thought-primitive.md` — original planning doc

## What the CSS File Contains

The CSS handles three concerns:

1. **Keyframe animations** (~40 lines): `aui-connector-fade`, `aui-icon-enter`, `aui-content-enter`, `aui-window-enter`. These are used via inline `style={{ animation: ... }}` in the TSX.

2. **Windowing layout** (~130 lines): Complex selectors for `[data-windowed="true"]` that constrain step heights, apply mask gradients, and handle transform-based scrolling via CSS custom properties (`--aui-window-row`, `--aui-window-shift`, etc.).

3. **Reduced motion** (~10 lines): `@media (prefers-reduced-motion: reduce)` overrides.

### Migration strategy considerations

- **Keyframes**: The TSX already references these by name in inline `style` props (e.g., `animation: \`aui-icon-enter ${ANIMATION_DURATION}ms...\``). Tailwind's `animate-` utilities require defining keyframes in `tailwind.config`. Alternatively, these could use Tailwind's `animate-in`/`animate-out` utilities that are already used elsewhere in the component.
- **Windowing selectors**: These use `[data-windowed="true"]` attribute selectors with complex nesting (`:has()`, `::before`, `::after`). Some may need to stay as data-attribute-driven styles. Consider whether these can be expressed as Tailwind arbitrary variants like `data-[windowed=true]:`.
- **The windowing CSS is the hardest part** — it uses `:has()` selectors and pseudo-elements that don't map cleanly to Tailwind classes. Consider whether the windowing approach itself could be simplified.

## Decisions Made

- Component lives in `packages/ui/` (shadcn-style, opinionated layer). Primitives are in `packages/react/`.
- The component uses `cva` for variant styling, `cn()` for class merging, `data-slot` attributes for CSS targeting.
- Biome is the linter (enforces Tailwind class sorting via `useSortedClasses`).
- Pre-existing test type errors are NOT our problem (test data uses `kind: "step"` without `as const`).

## Gotchas

- The inline `style` props that reference keyframe names by string (e.g., `animation: \`aui-icon-enter...\``) will need to change if keyframes are renamed or moved to Tailwind config.
- The windowing uses CSS custom properties set in JSX (`--aui-window-row`, `--aui-window-shift`, etc.) and consumed by CSS selectors. This pattern works with Tailwind arbitrary values.
- `WINDOW_TRANSITION_MS` constant was removed from TSX (was 450ms), now hardcoded in the CSS. If migrating to Tailwind, use `duration-[450ms]` or similar.
- The `SPRING_EASING` and `EASE_OUT_EXPO` constants are still in the TSX and used by inline styles.

## Next Steps

1. **Read `chain-of-thought.css`** and categorize each rule by migration difficulty
2. **Migrate keyframe animations** — either define in Tailwind config or replace with existing `animate-in`/`animate-out` utilities
3. **Migrate windowing styles** — use Tailwind's `data-[]` arbitrary variants where possible, consider simplifying the windowing approach
4. **Migrate pseudo-elements** (`::before`/`::after`) — these may need `before:` and `after:` Tailwind variants
5. **Migrate `:has()` selectors** — Tailwind has `has-[]` variant support
6. **Delete `chain-of-thought.css`** and the import
7. **Run type-check**: `npx tsc --noEmit --project packages/ui/tsconfig.json` (ignore test file errors)
8. **Visually verify** the component still works in the docs dev server (`pnpm docs:dev`, navigate to `/dev/chain-of-thought`)

## Resume Instructions

```bash
cd /Users/petepetrash/Code/aui/assistant-ui
# Read the CSS file to understand what needs migrating:
# packages/ui/src/components/assistant-ui/chain-of-thought.css
# Read the component to see how CSS classes/keyframes are referenced:
# packages/ui/src/components/assistant-ui/chain-of-thought.tsx
```

The goal is to delete `chain-of-thought.css` entirely by migrating all its rules into Tailwind classes on the TSX components. Simplify the windowing approach if possible.
