# `contenders`

Compare several working versions of a piece of UI inline, inside the real page, while a human or a coding agent decides which one to keep. Production builds refuse to render the comparison, so you can't ship it by accident.

```tsx
import { Variant, Variants } from "contenders";

<Variants id="pricing-features" label="Feature list" default="cards">
  <Variant id="grid" label="Three-column grid">
    <FeatureGrid />
  </Variant>
  <Variant id="cards" label="Field cards">
    <FeatureCards />
  </Variant>
</Variants>;
```

Open the page and you'll see three things:

- The rendered variant gets a thin, dashed "under construction" outline.
- A sidebar on the right lists every group on the page.
- Every variant can be compared side by side on a canvas.

To pick a variant, use the sidebar or open `?variant=pricing-features:grid` directly.

## Why

When you're choosing between designs, the real page is the best place to judge them, with real data, real neighbours, and real breakpoints. The usual alternatives each miss something:

- **Copying the component and commenting things out** leaves no shareable link, and nothing stops a half-decided state from shipping.
- **Storybook-style workshops** render components on their own, away from the page, and nothing forces you to make a decision.
- **Feature-flag toolbars** are built to ship several variants to users. This package does the opposite.

`contenders` gives you typed React components, addressable state (URL + `data-*` hooks), a one-line hand-off to a coding agent, and a production build that refuses to render the comparison.

## Install

```bash
npm install contenders
```

Peer dependencies: `react` and `react-dom` 18 or 19. There are no other runtime dependencies, and you don't need a CSS import.

## API

### `<Variants>`

| Prop                | Type      | Default     | Description                                                                                   |
| ------------------- | --------- | ----------- | --------------------------------------------------------------------------------------------- |
| `id`                | `string`  | required    | Group id. Keep it unique across the app, for example `pricing-features`. No `:`, `,` or spaces. |
| `label`             | `string`  | `id`        | Name shown in the sidebar, outline and canvas.                                                |
| `default`           | `string`  | first child | Variant rendered on the server, and whenever nothing else selects one.                        |
| `persist`           | `boolean` | `true`      | Remember the choice per tab in `sessionStorage`.                                              |
| `allowInProduction` | `boolean` | `false`     | Render instead of throwing in a production build (see [Production guard](#production-guard)). |
| `outline`           | `boolean` | `true`      | Always draw the dashed outline. `false` shows it only on hover (see [Outline](#outline)).     |

Children must all be `<Variant>` elements.

### `<Variant>`

| Prop    | Type     | Default  | Description                                           |
| ------- | -------- | -------- | ----------------------------------------------------- |
| `id`    | `string` | required | Unique within the group. No `:`, `,` or spaces.       |
| `label` | `string` | `id`     | Name shown in the sidebar, outline and canvas.        |

### `configureVariants(config)`

```ts
import { configureVariants, formatVariantsPrompt } from "contenders";

configureVariants({
  // What the Copy buttons put on the clipboard. Defaults to formatVariantsPrompt.
  prompt: (selection) => `${formatVariantsPrompt(selection)} # from ${selection.pathname}`,
  // Shortcut that focuses the sidebar. Defaults to Alt+V; false turns it off.
  shortcut: { code: "KeyK", ctrl: true },
});
```

Each call replaces the previous configuration. The `selection` passed to `prompt` has these fields:

- `scope`: `"page"` or `"group"`.
- `pathname`.
- `url`: the full URL with the selected `?variant=` params.
- `groups`: one entry per mounted group, parents first, each with `id`, `label`, `kept`, `removed` and `parent`.

### Which variant renders

The first match wins:

1. The URL: `?variant=<group>:<id>`
2. The choice saved for that group in `sessionStorage` (unless `persist={false}`)
3. `default`
4. The first `<Variant>`

Only the active variant is mounted. The others are unmounted, not hidden, so inactive variants can't leak duplicate DOM ids, fire analytics, autoplay media, or hold focus. This is a deliberate difference from tools that toggle visibility with CSS.

### No wrapper, no layout impact

`<Variants>` renders the active variant's children directly. There is no wrapper element, no marker node and no `display: contents` box. A variant rendered through `<Variants>` produces exactly the DOM its children would produce on their own, so selectors keep working:

- `> *`, `:first-child`, `:nth-child`, `+`, `~` and `:has()`
- flex and grid item counts
- `<table>`, `<ul>` and `<select>` content models

The package locates the variant's top-level DOM nodes through React's internal tree. A tiny class component reads `_reactInternals`, which works in React 18 and 19.

### URL parameters

| Parameter                                 | Effect                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `?variant=hero:split`                     | Select `split` in group `hero`.                                                |
| `?variant=hero:split&variant=nav:compact` | Select in several groups (`?variant=hero:split,nav:compact` also works).       |
| `?variants=canvas`                        | Open the [canvas](#canvas).                                                    |
| `?variants=noui`                          | Hide the sidebar but keep the outlines.                                        |
| `?variants=clean`                         | Hide the sidebar, outlines and hover labels, for clean screenshots.            |

Flags combine, for example `?variants=canvas,clean`. When you change something in the sidebar or canvas, the URL is updated with `history.replaceState`. This doesn't navigate, keeps other params and the hash, and leaves the address bar reproducing what you see. Back/forward (`popstate`) re-reads the URL.

### Nested groups

A `<Variants>` inside a `<Variant>` is nested. Each `<Variant>` provides a React context naming itself, and a nested group registers with that `parent`.

- **Sidebar:** the nested group appears indented under its parent group, with a thin guide line. It only appears while its parent variant is selected, because it's unmounted otherwise.
- **Outlines:** the parent's outline stays dashed and steps outward. The nested group's outline is dotted, and sits inside it.
- **Canvas:** the nested group gets its own sub-row, indented under its parent's row. Inside the parent's cards, it renders its current selection.
- **URL and storage:** a nested group's selection persists on its own. Switching the parent away and back restores it. A `?variant=` param for a nested group whose parent variant isn't showing is ignored.

### Outline

Every rendered variant gets a thin, dashed outline with square corners, plus a small tab at its top-left corner. The tab reads `<group label> · <variant label> · <index>/<count>`, for example `Feature list · Field cards · 2/3`.

The outline frames what the variant actually paints:

- **Elements that draw a box** (a background, border or shadow, or a button, image or form control) contribute their border boxes.
- **Text** contributes its line boxes.
- **Transparent wrappers** contribute their contents. So a short footnote in a full-width paragraph gets a frame around the text, not the whole column.

The stroke sits 3px outside that box, in a separate overlay, so it never changes the content's layout.

All outlines are laid out together in one overlay, in a single pass per animation frame:

- **Nested groups** step outward 4px per nesting level, so both frames stay visible.
- **Adjacent siblings** have their touching sides pulled toward their own content, half the gap each and at least 2px apart, so strokes never cross.
- **Tabs** are placed greedily in reading order. Each one sits above its frame and slides right past other tabs, moving inside only when there's no room above.
- **Updates:** layout reruns on resize, scroll, `ResizeObserver` and `MutationObserver`, and only writes to the DOM when a measured rectangle changes. Switching variants keeps the overlay in place, so it doesn't flash.

**Hover mapping** works both ways:

- Hovering a region on the page shows its tab and highlights its group in the sidebar.
- Hovering or focusing a group in the sidebar highlights its outline on the page, even in hover-only mode.
- If that region is scrolled out of view, the sidebar row shows an `↑ Off-screen` or `↓ Off-screen` hint. Clicking the hint scrolls to it, smoothly unless `prefers-reduced-motion` is set.

Hover is detected with an animation-frame-throttled hit test on `pointermove`, so the overlay never intercepts the pointer.

Outlines have three settings:

- `outline={false}` on a `<Variants>` makes that group hover-only.
- The **Outline** toggle in the sidebar makes every group hover-only. The choice is remembered per tab.
- `?variants=clean` removes outlines, hover labels and the sidebar.

### Sidebar

The sidebar is a 300px panel docked to the right, at full height. It never covers the page. While it's open, it pushes the page aside with `html { margin-right: var(--contenders-sidebar-width) }`, and removes the margin again when it collapses or unmounts.

The margin narrows the page's content area, but **viewport media queries still see the full window width**. Container queries do respond to the narrower width. Elements with `position: fixed` (and `sticky` elements pinned to the viewport edge) are laid out against the viewport, so they'd sit under the sidebar. To keep them clear, use the variable, which is unset whenever the sidebar isn't pushing the page:

```css
.site-header {
  position: fixed;
  inset-inline: 0 var(--contenders-sidebar-width, 0px);
}
```

The sidebar's behaviour:

- **Collapse:** it collapses to a small tab at the right edge, which pushes nothing. The collapsed state is remembered per tab.
- **Narrow screens:** below 768px wide, it becomes a bottom sheet over the page instead of pushing it.
- **Clean screenshots:** `?variants=clean` and `?variants=noui` show no sidebar and add no margin.
- **Isolation:** it renders into a shadow root, so the page's CSS can't restyle it.
- **Theme:** it follows `prefers-color-scheme`, uses neutral grays with a single amber accent for the status dot, and animates only when `prefers-reduced-motion` allows.

**Stable while switching.** The control you just clicked or moved to with the keyboard stays at the same screen position, even when nested groups appear or disappear around it:

- Rows are reconciled by group id rather than rebuilt, so focus and hover survive.
- Rows below the control animate in and out. They fade while their height runs from 0 to its natural size over 160ms, using `grid-template-rows`.
- Rows above the control change instantly, and the list's scroll position is corrected by the same amount in the same frame. The correction keeps running every frame while earlier animations finish.
- When the list can't scroll far enough, a temporary offset holds the position until you next scroll.
- With `prefers-reduced-motion`, rows change instantly but the control still stays put.

What it contains:

- **Groups:** one section per group, with nested groups indented. Each group is a radio group with one segment per variant. The selected segment uses full-strength text, medium weight, and a faint sliding background. Every label reserves the medium weight's width, so selecting never changes a segment's size.
- **Header:** buttons for the **Canvas** and **Outline** toggles, and to collapse the sidebar.
- **Copy:** a **Copy prompt** button in the footer and a copy icon on each group. See [Hand off to a coding agent](#hand-off-to-a-coding-agent).

### Keyboard

The list of variants is a single tab stop, following the roving-tabindex [radio group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/). Selection follows focus.

| Key                                   | Action                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------- |
| <kbd>←</kbd> / <kbd>→</kbd>           | Select the previous or next variant in the group (wraps).                  |
| <kbd>Home</kbd> / <kbd>End</kbd>      | Select the group's first or last variant.                                  |
| <kbd>↑</kbd> / <kbd>↓</kbd>           | Move to the previous or next group, including nested groups in tree order, without changing any selection. |
| <kbd>Alt</kbd>+<kbd>V</kbd>           | From anywhere on the page, focus the list, expanding the sidebar if it's collapsed. |
| <kbd>Esc</kbd>                        | Return focus to where it was before <kbd>Alt</kbd>+<kbd>V</kbd>.           |

The shortcut is matched on `KeyboardEvent.code`, so it works on every keyboard layout, including macOS, where <kbd>Alt</kbd>+<kbd>V</kbd> types `√`. It's ignored while focus is in an input, textarea, select or contenteditable element. Change or disable it with `configureVariants({ shortcut })`. The footer shows the current shortcut, and the panel exposes it as `aria-keyshortcuts`. Focus rings are a 1.5px neutral outline, as quiet as the selection style.

### Canvas

The **Canvas** button, or `?variants=canvas`, compares every variant side by side in the area beside the sidebar.

**Layout:** there's one row per mounted group, in page order, and one card per variant in declaration order. Each card has a header with the variant label, its id, and a **Current** marker on the selected variant.

**Matching the page:** each card renders its variant the way the page would:

- **Width:** the variant is laid out at its container's content-box width on the page. That's the parent element's width minus padding, not the width of the variant currently showing, so a short link doesn't wrap.
- **Formatting context:** if the container is a flex container, its display and its alignment and gap properties are copied. Grid containers are laid out as a block of the same width, because computed grid tracks are sized for whichever variant is currently on the page.
- **Inherited styles:** the parent's inherited text styles are copied: font, size, weight, line height, letter spacing, color, alignment, text transform, white space, word break, direction and color scheme. So are all of its CSS custom properties.
- **Ancestor selectors:** the content is wrapped in `display: contents` elements carrying the classes of every page ancestor, as a best effort for selectors such as `.prose a`.
- **Scale:** the content is scaled down uniformly with CSS `zoom` to a common column width, inside 16px of padding. `zoom` scales the layout box as well as the paint, so rows never need measuring.

**Selecting:** click a card (or press <kbd>Enter</kbd>) to select it and keep the canvas open. Double-click a card, or use its **Use this** button, to select it and go back to the page.

**Navigating:**

- Pan by dragging the background or scrolling.
- Zoom with <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+wheel, a trackpad pinch, the − / + / fit buttons, or <kbd>-</kbd>, <kbd>+</kbd> and <kbd>0</kbd>.
- Arrow keys move between cards.
- <kbd>Esc</kbd> closes the canvas and restores focus.

**Clean mode:** with `?variants=canvas,clean`, the toolbar and card chrome are hidden except for the labels, for comparison screenshots.

**Side effects:** while the canvas is open, every variant mounts, once per card. The active one also stays mounted on the page underneath, so effects, analytics and media in inactive variants run while the canvas is open. All of them unmount when it closes.

### DOM hooks

After mount, the variant's own top-level elements get `data-variant-group`, `data-variant` and `data-variant-label`. The server HTML doesn't include them, because they're added on the client. When a nested group renders the same top-level element as its parent, that element keeps the inner group's attributes.

Because these are the real elements, `[data-variant="cards"]` can be used directly as a Playwright locator or for an element screenshot.

### Development warnings

In development, these problems log a `console.error` and the page keeps rendering:

- two mounted groups share an id
- a group has two variants with the same id
- `default` matches no variant
- a child is not a `<Variant>`
- a `<Variant>` is rendered outside `<Variants>`
- an id contains `:`, `,` or whitespace
- the URL or storage selects a variant that doesn't exist

## Hand off to a coding agent

The **Copy prompt** button in the sidebar footer (and in the canvas toolbar) copies one line covering every mounted group, parents first:

```text
/variants choose pricing-features:cards pricing-card-style:outlined pricing-cta:link
```

The copy icon on a group copies just that group, for example `/variants choose pricing-cta:link`. The pairs use the same `group:variant` syntax as the `?variant=` URL. Only groups that are mounted right now are listed, so nested groups under losing variants never appear.

Paste the line into Claude Code. The `variants` skill then resolves each group:

1. It finds the `<Variants id="…">` block by id.
2. It checks that the chosen variant exists.
3. It replaces the block with that variant's children.
4. It deletes the losers and anything only they used.
5. It checks that nothing is left over.

The skill finds each block by id alone, which is why group ids should be unique across the app.

## SSR and hydration

`<Variants>` never touches `window` while rendering. The server, and the first client render during hydration, always render `default` (or the first variant) with no extra markup. After mount, the URL and `sessionStorage` are read, and the group switches if they select something else. That can cause a brief flash of the default variant on a full page load. This is intentional: reading the URL during render would make the server and client HTML disagree and break hydration. The package doesn't need `useSearchParams` or any framework router.

### Next.js App Router

The components are marked `"use client"`, so you can import them straight into Server Components. Variant children can be Server Components; each one is passed through as already-rendered content. In an RSC payload, `<Variant>` arrives as a lazy client reference. `<Variants>` resolves it, and if the reference isn't loaded yet, it trusts any lazy child that has a string `id`.

## Production guard

When `process.env.NODE_ENV === "production"`, rendering `<Variants>` throws:

```text
[contenders] <Variants id="hero"> rendered in a production build. Pick one variant, replace the <Variants> block with that <Variant>'s children, and remove the wrapper. …
```

The guard runs at render time, so where it fires depends on when the page renders. Verified with Next.js 16.4 (App Router, Turbopack):

- **Statically prerendered pages** fail `next build` with `Error occurred prerendering page`, even inside `<Suspense>`.
- **Dynamic pages** (`cookies()`, `headers()`, `searchParams`, `dynamic = "force-dynamic"`) build fine and throw at request time, which gives a 500 or your error boundary.
- **Client-only rendering** (`next/dynamic` with `ssr: false`, Vite SPAs) throws in the browser.

To catch leftovers on dynamic or client-only pages before deploy, add a smoke test that requests them in CI, or search the source for `<Variants`.

### Escape hatch for preview deployments

Set `CONTENDERS_ALLOW_IN_PRODUCTION=1` for server rendering, and `NEXT_PUBLIC_CONTENDERS_ALLOW_IN_PRODUCTION=1` for Next.js client bundles. Accepted values are `1`, `true` and `yes`. Alternatively, pass `allowInProduction`, for example `allowInProduction={process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"}`. Only set these on preview environments.

## Resolving a choice by hand

Replace the whole `<Variants>…</Variants>` block with the chosen `<Variant>`'s children. Then delete the losing components (and their imports) if nothing else uses them, and remove the `contenders` import. If the block sat in an expression position and the chosen variant has several children, wrap them in a fragment.

## Comparison with prior art

- **[unship](https://github.com/mbenhard/unship)** marks variants with attributes, provides a dev picker, and ships a cleanup CLI. Its cleanup tooling goes further than this package. `contenders` uses typed components, unmounts inactive variants, and refuses to render in production builds.
- **Storybook and other workshops** are great for building components on their own. They don't show the variant in its real page context, and nothing pushes you to pick one.
- **Feature-flag toolbars** exist to ship several variants to real users. `contenders` is for the decision before shipping and is designed to disappear afterwards.

## Limitations

- The production guard only fires for code that renders.
- Locating a variant's DOM nodes relies on React's internal fiber fields (`_reactInternals`, `child`, `sibling`, `stateNode`), which are stable across React 18 and 19 but aren't public API.
- Viewport media queries don't see the sidebar's push (see [Sidebar](#sidebar)).
- The default variant shows briefly on a full page load before the URL or storage choice applies.
- The outline overlay isn't clipped by `overflow` containers.
- Children must be literal `<Variant>` elements. Components that return `<Variant>`, and fragments that contain them, aren't recognised.
- The sidebar needs a DOM. Without `document`, variants still resolve from `default`, but there's no sidebar or URL state.

## License

MIT
