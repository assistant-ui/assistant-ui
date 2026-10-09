# `contenders`

Compare several working versions of a piece of UI inline, inside the real page, while a human or a coding agent decides which one to keep. Production builds refuse to render the comparison, so you can't ship it by accident.

```tsx
import { Variant, Variants } from "contenders";

<Variants id="features" label="Feature list" default="cards">
  <Variant id="grid" label="Three-column grid">
    <FeatureGrid />
  </Variant>
  <Variant id="cards" label="Field cards">
    <FeatureCards />
  </Variant>
</Variants>;
```

Open the page. The rendered variant gets a dashed "under construction" outline, and a small switcher in the bottom-right corner lists every group on the page. Pick a variant, or open `?variant=features:grid` directly.

## Why

When you're choosing between designs, the real page is the best place to judge them, with real data, real neighbours, and real breakpoints. The usual alternatives each miss something:

- **Copying the component and commenting things out** leaves no shareable link, and nothing stops a half-decided state from shipping.
- **Storybook-style workshops** render components on their own, away from the page, and nothing forces you to make a decision.
- **Feature-flag toolbars** are built to ship several variants to users. This package does the opposite.

`contenders` gives you typed React components, addressable state (URL + `data-*` hooks), and a production build that refuses to render the comparison.

## Install

```bash
npm install contenders
```

Peer dependency: `react` 18 or 19. There are no other runtime dependencies, and you don't need a CSS import.

## API

### `<Variants>`

| Prop                | Type      | Default     | Description                                                                                       |
| ------------------- | --------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `id`                | `string`  | required    | Page-unique group id. Must not contain `:` or `,`.                                                |
| `label`             | `string`  | `id`        | Name shown in the switcher.                                                                       |
| `default`           | `string`  | first child | Variant rendered on the server, and whenever nothing else selects one.                            |
| `persist`           | `boolean` | `true`      | Remember the choice per tab in `sessionStorage`.                                                  |
| `allowInProduction` | `boolean` | `false`     | Render instead of throwing in a production build (see [Production guard](#production-guard)).     |
| `outline`           | `boolean` | `true`      | Draw the dashed outline around this group's rendered variant (see [Outline](#outline)).            |

Children must all be `<Variant>` elements.

### `<Variant>`

| Prop    | Type     | Default  | Description                                                                  |
| ------- | -------- | -------- | ---------------------------------------------------------------------------- |
| `id`    | `string` | required | Unique within the group. Must not be `all` or contain `:` or `,`.            |
| `label` | `string` | `id`     | Name shown in the switcher and show-all captions.                            |

### Which variant renders

The first match wins:

1. The URL: `?variant=<group>:<id>`
2. The choice saved for that group in `sessionStorage` (unless `persist={false}`)
3. `default`
4. The first `<Variant>`

Only the active variant is mounted. The others are unmounted, not hidden, so inactive variants can't leak duplicate DOM ids, fire analytics, autoplay media, or hold focus. This is a deliberate difference from tools that toggle visibility with CSS.

### URL parameters

| Parameter                                           | Effect                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `?variant=hero:split`                               | Select `split` in group `hero`.                                    |
| `?variant=hero:split&variant=nav:compact`           | Select in several groups (`?variant=hero:split,nav:compact` also works). |
| `?variant=hero:all`                                 | Show every variant of `hero`, stacked.                             |
| `?variants=all`                                     | Show every variant of every group.                                 |
| `?variants=noui`                                    | Hide the switcher but keep the outlines.                           |
| `?variants=clean`                                   | Hide the switcher **and** the outlines, for clean screenshots. Combine as `?variants=all,clean`. |

When you change something in the switcher, the URL is updated with `history.replaceState` (no navigation, other params and the hash are kept), so the address bar always reproduces what you see. Back/forward (`popstate`) re-reads the URL.

### Show-all mode

Every variant renders in order, each preceded by a small monospace caption: `group · id · label`. It's useful for side-by-side review and for capturing every option in a single screenshot.

### Outline

Every rendered variant gets a dashed, muted-amber outline, with a small tab pinned to its top-left corner. The tab reads `<group label> · <variant label> · <index>/<count>`, for example `Feature list · Field cards · 2/3`. This makes it obvious which parts of the page are still undecided. In show-all mode, each stacked variant gets its own outline and tab.

The outline doesn't change the layout you're judging:

- It's drawn in a separate overlay: a `position: fixed`, `pointer-events: none` layer in its own shadow root appended to `document.body`.
- Nothing is added to the content and no styles are changed on it. The only wrappers are the `display: contents` elements described under [DOM hooks](#dom-hooks).
- The box is measured from the union of the variant's rendered boxes, looking through nested `display: contents` elements. It updates with `ResizeObserver`, `MutationObserver`, scroll, and resize.
- Grid and flex children keep their placement.
- The dashes are static, so there's no motion to reduce.
- Only the tab accepts clicks. Clicking it focuses the group in the switcher, expanding the switcher if it's collapsed. The tab is skipped in the page's tab order (`tabindex="-1"`). Keyboard users reach the same controls through the switcher.

There are three ways to turn the outline off. The `data-variant*` attributes stay either way.

- `outline={false}` on a `<Variants>` turns it off for that group.
- The **Outline** toggle in the switcher turns it off for every group on the page. The choice is remembered per tab in `sessionStorage`.
- `?variants=clean` hides outlines and the switcher, for screenshots.

The outline renders wherever `<Variants>` renders. A production build only renders it under the escape hatch, where it stays on, because previews are exactly where reviewers need to see what's undecided.

### The switcher

The switcher mounts once per page, as soon as a `<Variants>` mounts, and goes away when the last one unmounts. It renders into a shadow root attached to `document.body`, so the page's CSS can't restyle it and its CSS can't leak into the layout you're judging. It's monochrome, uses the system font stack, follows `prefers-color-scheme`, and only animates when `prefers-reduced-motion` allows it.

- Each group is a labelled `role="group"` with a segmented control of `aria-pressed` buttons, plus an **All** toggle.
- Keyboard: focus a group (or any button in it) and press <kbd>←</kbd>/<kbd>→</kbd> to cycle variants, or <kbd>A</kbd> to toggle show-all.
- **Show all** in the header toggles `?variants=all`; **Outline** toggles the outlines; the **–** button collapses the panel (remembered per tab).

### DOM hooks

```html
<div data-variant-group="features" data-variant-mode="single">
  <div data-variant="cards" data-variant-label="Field cards">…</div>
</div>
```

`data-variant-mode` is `single` or `all`. In show-all mode, captions carry `data-variant-caption`. The wrapper elements use `display: contents`, so they don't change layout. As a result they have no box of their own: to screenshot a single variant, target its children (`[data-variant="cards"] > *`) or the full page.

### Development warnings

In development, these problems log a `console.error` and the page keeps rendering:

- two mounted groups share an id
- a group has two variants with the same id
- `default` matches no variant
- a child is not a `<Variant>`
- a `<Variant>` is rendered outside `<Variants>`
- an id is reserved or contains `:`/`,`
- the URL or storage selects a variant that doesn't exist

## SSR and hydration

`<Variants>` never touches `window` while rendering. The server, and the first client render during hydration, always render `default` (or the first variant). After mount, the URL and `sessionStorage` are read and the group switches if they select something else. That can cause a brief flash of the default variant on a full page load. This is intentional: reading the URL during render would make the server and client HTML disagree and break hydration. The package doesn't need `useSearchParams` or any framework router.

### Next.js App Router

The components are marked `"use client"`, so you can import them straight into Server Components:

```tsx
// app/page.tsx (a Server Component)
import { Variant, Variants } from "contenders";

export default function Page() {
  return (
    <Variants id="hero" default="split">
      <Variant id="centered">
        <CenteredHero />
      </Variant>
      <Variant id="split">
        <SplitHero />
      </Variant>
    </Variants>
  );
}
```

Variant children can be Server Components. Each one is passed through as already-rendered content. In an RSC payload, `<Variant>` arrives as a lazy client reference; `<Variants>` resolves it, and if the reference isn't loaded yet it trusts any lazy child that has a string `id`.

## Production guard

When `process.env.NODE_ENV === "production"`, rendering `<Variants>` throws:

```text
[contenders] <Variants id="hero"> rendered in a production build. Pick one variant, replace the <Variants> block with that <Variant>'s children, and remove the wrapper. …
```

The guard runs at render time, so where it fires depends on when the page renders. Verified with Next.js 16.4 (App Router, Turbopack):

- **Statically prerendered pages** (the Next.js default for pages without dynamic APIs) throw while `next build` prerenders them, so **the build fails** with `Error occurred prerendering page`. This also happens when the `<Variants>` sits inside a `<Suspense>` boundary.
- **Dynamic pages** (request-time rendering, such as `cookies()`, `headers()`, `searchParams`, or `dynamic = "force-dynamic"`) aren't rendered during the build, so **the build succeeds**. They throw when a request renders them, which sends that request to your error boundary or a 500.
- **Client-only rendering** (`next/dynamic` with `ssr: false`, Vite SPAs, content mounted after an interaction) throws in the browser.

In other words, the guard only fires for pages that actually render. To catch leftovers on dynamic or client-only pages before deploy, add a smoke test that requests them in CI, or grep the source for `<Variants` in a pre-commit hook.

### Escape hatch for preview deployments

To keep variants on a preview deployment while still guarding production:

- Set `CONTENDERS_ALLOW_IN_PRODUCTION=1` for server rendering, and `NEXT_PUBLIC_CONTENDERS_ALLOW_IN_PRODUCTION=1` for Next.js client bundles (Next only inlines `NEXT_PUBLIC_*` variables into the browser). Accepted values are `1`, `true`, and `yes`.
- Or pass the prop explicitly, using whatever signal your host gives you:

  ```tsx
  <Variants id="hero" allowInProduction={process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"}>
  ```

  In Vite, use `allowInProduction={import.meta.env.VITE_PREVIEW === "1"}`.

Only set these on preview environments. If they leak into your production configuration, the guard is off.

## Resolving a choice

Resolving is an ordinary source edit: replace the whole `<Variants>…</Variants>` block with the chosen `<Variant>`'s children. Then delete the losing components (and their imports) if nothing else uses them, and remove the `contenders` import.

```tsx
// before
<Variants id="features" default="cards">
  <Variant id="grid"><FeatureGrid /></Variant>
  <Variant id="cards"><FeatureCards /></Variant>
</Variants>

// after picking "cards"
<FeatureCards />
```

If the block sat in an expression position (`return (...)`, `cond && ...`) and the chosen variant has several children, wrap them in a fragment.

## Workflow for coding agents

1. **Add variants.** Implement each option as a real, working component and wrap them in one `<Variants id="…">` with a descriptive `label` for each `<Variant>`. Use short, stable, URL-safe ids.
2. **Share links and screenshots.** For each option, give the human a link (`/pricing?variant=plans:compact`, `/pricing?variant=plans:table`) and a screenshot. Add `variants=clean` to hide the outline and switcher in screenshots, or use `?variant=plans:all` / `?variants=all` to put every option in a single capture. To capture one option on its own, target `[data-variant="compact"] > *` (or `[data-variant-group="plans"] > [data-variant] > *` for the whole group).
3. **Let the human pick.** They can click through the switcher on the live page or reply with an id.
4. **Resolve.** Replace the `<Variants>` block with the chosen `<Variant>`'s children, delete the losing components if they're now unused, and drop the import.
5. **Verify.** Run the production build. A leftover `<Variants>` on a statically rendered page fails it, and `grep -rn "<Variants" src` should come back empty.

## Comparison with prior art

- **[unship](https://github.com/mbenhard/unship)** marks variants with attributes, provides a dev picker, and ships a cleanup CLI. It is framework-light and its cleanup tooling goes further than this package. Its variants stay in the DOM and are hidden, and there's no production build guard. `contenders` uses typed components, unmounts inactive variants, and refuses to render in production builds.
- **Storybook and other workshops** are great for building components on their own and documenting states. They don't show the variant in its real page context, and nothing pushes you to pick one. The two complement each other.
- **Feature-flag toolbars** (LaunchDarkly, Statsig, Vercel Toolbar flags) exist to ship several variants to real users and measure them. `contenders` is for the decision before shipping and is designed to disappear afterwards.

## Limitations

- The production guard only fires for code that renders (see above). It doesn't detect unused imports or variants that never render.
- Group ids must be unique among the groups mounted at the same time, and can't contain `:` or `,`.
- The default variant shows briefly on a full page load before the URL or storage choice applies.
- The `display: contents` wrappers have no box of their own, so element screenshots must target their children.
- The outline overlay sits above the page. It isn't clipped by `overflow` containers, so a variant scrolled out of view inside a scroll container can still show its outline at the container's edge.
- Children must be literal `<Variant>` elements. Components that return `<Variant>`, or fragments that contain them, aren't recognised.
- The switcher needs a DOM. In React Native, or any environment without `document`, variants still resolve from `default`, but there's no switcher and no URL state.

## License

MIT
