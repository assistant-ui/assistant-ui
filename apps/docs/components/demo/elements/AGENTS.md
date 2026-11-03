# Element demos and states

Live demos and state fixtures for the `/elements` catalog; `apps/docs/AGENTS.md` and `content/design.md` still apply.

## Rules

- Give every catalog element a `states/<slug>.tsx` that exports `states` through `defineStates`, and register it in `states/index.ts`, because `states/states.test.tsx` fails on a slug without one.
- Start the list with `{ key: "default", label: "Default" }` and no `Component`; the detail page shows the live demo for it.
- Before writing fixtures, walk the element's edge cases and add each one its props or data can actually reach: loading or pending, streaming, empty, error, disabled, requires approval, denied or cancelled, success, partial data, and long or overflowing content. Skip a state the element cannot express rather than faking it, and never change the element to add one.
- Render a fixture from the element's real props with realistic data (real commands, paths, names, numbers). A fixture is static: no timers, no story phases, and no-op handlers.
- Give each non-default state a kebab-case `key` (it is the `?state=` value, so keep it stable), a sentence-case `label` of one or two words, and a `note` of one plain sentence naming the edge case; the note becomes the figure caption.
- Wrap a runtime-bound (`.aui.tsx`) fixture in the same runtime provider its demo uses, seeded with the messages or parts that put it in that state.
- Generative elements get their states from `states/generative.tsx`; add a template-specific state there only when a template has one the shared set misses.
- Run `pnpm vitest run components/demo/elements/states` after adding or changing states; it renders every fixture.
