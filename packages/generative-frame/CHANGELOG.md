# generative-frame

## 0.0.6

### Patch Changes

- [#9644](https://github.com/assistant-ui/assistant-ui/pull/9644) [`bb61b74`](https://github.com/assistant-ui/assistant-ui/commit/bb61b743f002b42626afac3d05b278d54904f87f) - fix: a `repeat` over the `/` pointer, the empty-string state key, now gives its items `//0`, `//1`, and so on, so `$bindItem` writes there instead of to numeric keys of the whole state. ([@okisdev](https://github.com/okisdev))

- [#9562](https://github.com/assistant-ui/assistant-ui/pull/9562) [`22d2688`](https://github.com/assistant-ui/assistant-ui/commit/22d268852dbf23fed3aa30a7d59c5930d5a0d360) - fix: `readThemeTokens` follows the page's `--font-sans`, or the body's computed font family when the page declares none, with the default system sans-serif stack, and a `--font-mono` the page declares with the default monospace stack, so on a page whose font stack names only web fonts with no generic fallback, such as a `next/font` family, a widget renders in a system face of the same kind instead of the browser's serif default; a stack that ends in a generic family keeps it. ([@okisdev](https://github.com/okisdev))

- [#9647](https://github.com/assistant-ui/assistant-ui/pull/9647) [`18f03fe`](https://github.com/assistant-ui/assistant-ui/commit/18f03fec45d406b0285ccc4165f6db143ba87c7d) - fix: a spec state write through an array records that array's path, so replaying it after the model state drops the array, through `seed` or restored interactions, recreates the array instead of collapsing appends into a `-` object key. ([@okisdev](https://github.com/okisdev))

- [#9543](https://github.com/assistant-ui/assistant-ui/pull/9543) [`b569bbd`](https://github.com/assistant-ui/assistant-ui/commit/b569bbd3c353b205acba6ef1ea17cb89575c76cf) - feat: `resolveSpec(spec, { state })` resolves a spec into the element tree the renderer draws for one state, with conditions, `repeat`, and expressions applied and action params resolved, for targets that cannot run a renderer. ([@okisdev](https://github.com/okisdev))

- [#9645](https://github.com/assistant-ui/assistant-ui/pull/9645) [`93e4166`](https://github.com/assistant-ui/assistant-ui/commit/93e41666fca7c81e0a2d3269be4273d52e056a4f) - fix: the assistant-ui spec toolkits fail a `sendMessage` that a `watch` dispatches or whose `text` is empty, as `copyText` does, so an action list stops there instead of confirming a message that was never sent. ([@okisdev](https://github.com/okisdev))

- [#9252](https://github.com/assistant-ui/assistant-ui/pull/9252) [`1371e4f`](https://github.com/assistant-ui/assistant-ui/commit/1371e4f22f2bd018b6fb74c177595f63f7ae9f57) - Handle sparse MCP Apps message content without scanning array holes. ([@rupic-app](https://github.com/apps/rupic-app))

- [#9539](https://github.com/assistant-ui/assistant-ui/pull/9539) [`40b797d`](https://github.com/assistant-ui/assistant-ui/commit/40b797d9c2155e67b16261340f3d2be6b7d10e9a) - fix: an action list in a spec stops at the first action that fails, so a `setState` that confirms a host action runs only when that action succeeded. The failure is still reported to `onError`. ([@okisdev](https://github.com/okisdev))

- [#9659](https://github.com/assistant-ui/assistant-ui/pull/9659) [`5fb68df`](https://github.com/assistant-ui/assistant-ui/commit/5fb68dfa355d97e33059a47cbc3e68e258814a58) - feat(generative-frame): mount earlier tool results under `/tools` in backend execution with the spec toolkit's `toolResults` option, once the server adds the exported `SPEC_TOOL_RESULTS_RULE` to its `render_spec` and spec guidance ([@okisdev](https://github.com/okisdev))

- [#9548](https://github.com/assistant-ui/assistant-ui/pull/9548) [`1109afa`](https://github.com/assistant-ui/assistant-ui/commit/1109afabb2f9465ea93f152fb344fbd9da3ac125) - fix: a `render_spec` call that patches an earlier spec with the same title now renders on that spec when it mounts before its title has streamed in. The base follows the title, and the stream starts over when the title brings a new one. ([@okisdev](https://github.com/okisdev))

- [#9638](https://github.com/assistant-ui/assistant-ui/pull/9638) [`dfa78f1`](https://github.com/assistant-ui/assistant-ui/commit/dfa78f1f0c8bbc7e6ba6b44983273b06a37ccde4) - fix: replace two-way bound array items without inserting duplicates, preserving replacements across state reseeding and saved interactions in React, React Native, and Vue. ([@okisdev](https://github.com/okisdev))

- [#9507](https://github.com/assistant-ui/assistant-ui/pull/9507) [`f9e5643`](https://github.com/assistant-ui/assistant-ui/commit/f9e56437a067df208216d9dd57cf421c5f2a5f21) - feat: the spec guidance now teaches how to compose an answer (the takeaway first, a `Card` for each module, key figures side by side, and a `Map`, `Timeline`, `Steps`, `Table`, or `Image` where the content calls for one), naming only the components a catalog has and only uses their slots and events allow, and no longer caps a spec at about 30 elements. `render_spec`'s description carries these rules and the app's `customRules`, and `createSpecTools` takes `customRules`, so the rules hold even when a model never loads the `spec` module. ([@okisdev](https://github.com/okisdev))

- [#9540](https://github.com/assistant-ui/assistant-ui/pull/9540) [`60cdf31`](https://github.com/assistant-ui/assistant-ui/commit/60cdf317a1da31983fc5bf69adbfa28eb63860a8) - feat: specs gain the built-in action `copyText` (`{ text }`), validated in every catalog, documented when `catalog.prompt({ hostApi: { clipboard: true } })` says the host handles it, and reserved in `defineCatalog`. The assistant-ui spec toolkits for the web and for Vue write it to the clipboard with `navigator.clipboard.writeText`, only from an event a component emits, never from `watch`, and a copy that does not happen fails, so an action after it in the list, such as a confirmation, does not run. The React Native build leaves it out of the guidance unless an app passes `handlers.copyText` and `specPrompt.hostApi.clipboard`. ([@okisdev](https://github.com/okisdev))

- [#9611](https://github.com/assistant-ui/assistant-ui/pull/9611) [`d768285`](https://github.com/assistant-ui/assistant-ui/commit/d768285690d79c0235ba78871376b520e6601ffc) - fix: an element whose component threw renders again once the element changes, in the React and Vue spec renderers, so a value it rejected while the spec was still streaming, such as an `Image` `src` bound to a state path cut short at `/tools`, no longer leaves its placeholder after the path completes. ([@okisdev](https://github.com/okisdev))

- [#9560](https://github.com/assistant-ui/assistant-ui/pull/9560) [`8a3c0d3`](https://github.com/assistant-ui/assistant-ui/commit/8a3c0d371fafe0ec442b8039ba2d3e607738d363) - fix: `validateSpec` accepts an empty `children` or slot list on a component without that slot, since it adds nothing, so a repair that empties the list fixes the error instead of repeating it. ([@okisdev](https://github.com/okisdev))

- [#9472](https://github.com/assistant-ui/assistant-ui/pull/9472) [`d62f1bc`](https://github.com/assistant-ui/assistant-ui/commit/d62f1bcb05a5f633e42003b39673bb27d9f4f3b7) - fix: preserve inline spec prose when a CRLF newline is split across stream chunks. ([@Kinfe123](https://github.com/Kinfe123))

- [#9471](https://github.com/assistant-ui/assistant-ui/pull/9471) [`f2ff864`](https://github.com/assistant-ui/assistant-ui/commit/f2ff864c8d0c27f5dc0a51529180b8d4aecc440d) - fix: report malformed spec document patches without discarding the last valid spec or crashing repair feedback. ([@Kinfe123](https://github.com/Kinfe123))

- [#9658](https://github.com/assistant-ui/assistant-ui/pull/9658) [`d247e90`](https://github.com/assistant-ui/assistant-ui/commit/d247e90914847bd7e50af3acc309c835c97d53f3) - fix(generative-frame): warn with `missing-tool-result` from `render_spec` when a spec shows a `/tools` path the stored tool results do not have, so a model that read the value from output the thread does not store writes it into the spec instead of showing a blank ([@okisdev](https://github.com/okisdev))

- [#9571](https://github.com/assistant-ui/assistant-ui/pull/9571) [`c67c117`](https://github.com/assistant-ui/assistant-ui/commit/c67c11792a896adc64c90b14f29e63e3274562f3) - fix: a `render_spec` call whose `spec` argument streams in with a `root` before its `elements` no longer crashes the renderer, in the assistant-ui spec toolkits for the web, React Native, and Vue, which now give such a spec an empty `elements` object until its elements arrive, and a later patches call with the same title builds on it. ([@okisdev](https://github.com/okisdev))

- [#9619](https://github.com/assistant-ui/assistant-ui/pull/9619) [`2ecb249`](https://github.com/assistant-ui/assistant-ui/commit/2ecb2494ed04fbd73b8af8bea7e42ce64c4313af) - fix: a prop the catalog declares as a string, number, or boolean no longer receives a resolved object or array, in the React and Vue spec renderers, so a state path cut short at `/tools` while the spec streams no longer crashes a Vue mount; the element waits as pending while the spec streams and shows the invalid-props placeholder afterward. ([@okisdev](https://github.com/okisdev))

- [#9648](https://github.com/assistant-ui/assistant-ui/pull/9648) [`4984e19`](https://github.com/assistant-ui/assistant-ui/commit/4984e19bb66341c3d06d12ff3e95552b5060ace6) - fix: clear removed model state while retaining user writes in spec renderers and toolkit calls. ([@okisdev](https://github.com/okisdev))

- [#9643](https://github.com/assistant-ui/assistant-ui/pull/9643) [`8dfb9d5`](https://github.com/assistant-ui/assistant-ui/commit/8dfb9d54221f340fbaf6774224a38c55f670d7e3) - fix: `defineCatalog` rejects a host action named `setState`, as it does the other built-in action names, instead of letting the built-in shadow it in validation and guidance while a handler replaced it at runtime. ([@okisdev](https://github.com/okisdev))

- [#9637](https://github.com/assistant-ui/assistant-ui/pull/9637) [`087a4af`](https://github.com/assistant-ui/assistant-ui/commit/087a4af22e6a47b693f741c846afe5ec29b511a9) - fix: preserve root JSON Pointers in two-way state bindings across React, Vue, and React Native. ([@okisdev](https://github.com/okisdev))

- [#9469](https://github.com/assistant-ui/assistant-ui/pull/9469) [`00a590f`](https://github.com/assistant-ui/assistant-ui/commit/00a590fb2cea45128f44cb13b5c7b9286b09cf91) - fix: preserve spec child state and focus when siblings are inserted, removed, or reordered. ([@Kinfe123](https://github.com/Kinfe123))

- [#9641](https://github.com/assistant-ui/assistant-ui/pull/9641) [`d7ba4e6`](https://github.com/assistant-ui/assistant-ui/commit/d7ba4e673622c3afbf064dc9c33583af81258548) - fix: `useSpecStream`'s `reset` now restarts a followed `source` from the current `initial` in React and Vue, so a `render_spec` call whose title completes after its patches renders them onto the earlier spec with that title at once. ([@okisdev](https://github.com/okisdev))

- [#9629](https://github.com/assistant-ui/assistant-ui/pull/9629) [`b30bd7d`](https://github.com/assistant-ui/assistant-ui/commit/b30bd7d904e02720ba9653a0262b257fa8506336) - feat: while a spec streams, elements that have not arrived take no space and one pending placeholder, three dots that pulse in turn, follows the spec instead of a gray bar for every missing element, and the `render_spec` container carries `data-gf-streaming` so styles can ease elements in as they arrive. ([@okisdev](https://github.com/okisdev))

- [#9633](https://github.com/assistant-ui/assistant-ui/pull/9633) [`6e03eee`](https://github.com/assistant-ui/assistant-ui/commit/6e03eee28097258712f3b58d71dec4e96858ceeb) - fix: while a spec streams, an element whose props are invalid keeps its last valid render, or takes no space before it has one, and an unknown type or a component that throws takes no space; each placeholder shows only if the problem remains once streaming ends, so a value cut short by the stream no longer flashes an error box. ([@okisdev](https://github.com/okisdev))

- [#9558](https://github.com/assistant-ui/assistant-ui/pull/9558) [`c0e47c5`](https://github.com/assistant-ui/assistant-ui/commit/c0e47c53a25f1307a398e1afb4b1ab80556e0ab9) - fix: within one message, a `render_spec` call that a later call with the same title patches renders nothing and stops sharing its choices with the model, and model context subscribers hear when it stops, so a spec the model repairs shows once instead of once per call, in the assistant-ui spec toolkits for the web, React Native, and Vue. A later call counts once its whole top-level title has arrived, regardless of JSON escaping, so a title still streaming or a nested `title` prop never hides an earlier spec by matching it for a moment. ([@okisdev](https://github.com/okisdev))

- [#9545](https://github.com/assistant-ui/assistant-ui/pull/9545) [`5402b93`](https://github.com/assistant-ui/assistant-ui/commit/5402b93a1e991d0a3e44e253d7bd67880931c835) - feat: `createSpecToolkit` from the new `generative-frame/spec/assistant-ui/vue` entry renders `render_spec` calls in an `@assistant-ui/vue` thread with Vue components, deriving the same thread state as the React toolkit: earlier calls with the same title, earlier tool results under `/tools` in frontend execution, saved state, and what a UI shares with the model. `@assistant-ui/vue` and `@assistant-ui/core` are optional peers of that entry. ([@okisdev](https://github.com/okisdev))

- [#9564](https://github.com/assistant-ui/assistant-ui/pull/9564) [`60c7dc0`](https://github.com/assistant-ui/assistant-ui/commit/60c7dc0ac73d95e3855c4e6205e58ba1db49be15) - feat: `validateSpec` reports `unfilled-placeholder` for a plain string that holds a `${/path}`, `${$item…}`, or `${$index}` placeholder, or that is only an expression key such as `"$calc"`, since both render as written, and the spec guidance says that only `$template` and `$calc` fill placeholders and that an expression can sit at any depth inside a prop, so a model that writes `"${/guests} × 450 g"` or a `"$calc"` table cell fixes it in the repair round. ([@okisdev](https://github.com/okisdev))

- [#9646](https://github.com/assistant-ui/assistant-ui/pull/9646) [`d068bea`](https://github.com/assistant-ui/assistant-ui/commit/d068bea422365fe93d4a2fbb4ba2295eab75fbff) - fix: `validateSpec` reports a `state` that is not an object with the new `invalid-state` issue code, so `render_spec` asks the model to fix a complete spec whose state is a string, an array, or null. ([@okisdev](https://github.com/okisdev))

- [#9636](https://github.com/assistant-ui/assistant-ui/pull/9636) [`1e1da15`](https://github.com/assistant-ui/assistant-ui/commit/1e1da15c4376b24dede07755d24958b58a965a3b) - fix: hide spec elements while their visibility condition has an unrecognized object shape, including nested negation, logical groups, and conditional branches. ([@okisdev](https://github.com/okisdev))

- [#9635](https://github.com/assistant-ui/assistant-ui/pull/9635) [`7b341a2`](https://github.com/assistant-ui/assistant-ui/commit/7b341a2aaa7e0e66b23a18f2249017af65075f0f) - fix: track replacement, added, and removed spec watches without missing their next state change or changing React effect dependency counts. ([@okisdev](https://github.com/okisdev))

- [#9660](https://github.com/assistant-ui/assistant-ui/pull/9660) [`b05c885`](https://github.com/assistant-ui/assistant-ui/commit/b05c8858495566319bbf7521652f41f73bb2a5ad) - feat(generative-frame): let a widget ask the host to copy text with `genframe.copyText(text)` or `navigator.clipboard.writeText(text)`, which reaches the new `onCopyText` handler; without one, copying fails in the widget ([@okisdev](https://github.com/okisdev))

- [#9566](https://github.com/assistant-ui/assistant-ui/pull/9566) [`7358d7f`](https://github.com/assistant-ui/assistant-ui/commit/7358d7f2a072410b6dc990b0f0df31d6ecc0207d) - fix: `read_me`'s description and the widget instructions ask for it before the first `show_widget` call instead of the first widget, `render_spec`'s description points at the spec guidance in the system prompt and at the `spec` module of `read_me` only when the system prompt has none, the widget guidance's module index asks only for modules the instructions do not already include, with `preload` the instructions name the preloaded modules and tell the model not to load them again, and with `render_spec` they say that a spec answer needs none of the built-in widget modules, so a model with the spec guidance preloaded skips the redundant `read_me` round trip before `render_spec`. ([@okisdev](https://github.com/okisdev))

- [#9657](https://github.com/assistant-ui/assistant-ui/pull/9657) [`5bccbf4`](https://github.com/assistant-ui/assistant-ui/commit/5bccbf4b6e173548a9eec630bc9b41cea5cdd7ce) - fix(generative-frame): remove a replacement frame that a newer `replace()` supersedes or the widget disposes while it renders, so it cannot keep reaching host handlers ([@okisdev](https://github.com/okisdev))

- [#9618](https://github.com/assistant-ui/assistant-ui/pull/9618) [`4522748`](https://github.com/assistant-ui/assistant-ui/commit/45227481692aaca8c93a537cf635e5fc018bba97) - fix: within one message, a widget that a later `show_widget` with the same title replaces, or that a later complete `edit_widget` changes, no longer stays on screen next to its replacement, while an edit that is still streaming or fails leaves the widget in place; earlier messages keep their own widgets, and a superseded call's pending render report resolves at once. ([@okisdev](https://github.com/okisdev))
- Updated dependencies [[`1485b02`](https://github.com/assistant-ui/assistant-ui/commit/1485b02d7e1ceb19d97ee17d09dcdf3299c574ed)]:
  - @assistant-ui/vue@0.0.4

## 0.0.5

### Patch Changes

- [#9427](https://github.com/assistant-ui/assistant-ui/pull/9427) [`5113baa`](https://github.com/assistant-ui/assistant-ui/commit/5113baa64eb50e2b7be167323161bb173a19c610) - feat: with `render_spec` among the tools, `buildWidgetInstructions` and `useWidgetInstructions` tell the model when to answer in markdown, with a spec, or with a widget ([@okisdev](https://github.com/okisdev))

- [#9524](https://github.com/assistant-ui/assistant-ui/pull/9524) [`c5c4fdd`](https://github.com/assistant-ui/assistant-ui/commit/c5c4fddfb57aafc7ad3043d11fe1bb3cd773656b) - feat: a rendered UI can tell the model what the user chose. Specs gain the built-in actions `sendMessage` and `updateModelContext` (validated in every catalog, documented when `catalog.prompt({ hostApi })` says the host handles them, and reserved in `defineCatalog`), widget guidance documents `genframe.updateModelContext` behind `hostApi.modelContext`, and the assistant-ui toolkits handle both: what a UI shares goes into the system prompt of later requests, marked as data and capped at 4,000 characters, and is saved with the call's state so it survives a reload. `sendMessage` runs only from a user's event, never from `watch`, which action handlers can now tell apart through `kind` on their second argument. ([@okisdev](https://github.com/okisdev))

- [#9501](https://github.com/assistant-ui/assistant-ui/pull/9501) [`d30dae6`](https://github.com/assistant-ui/assistant-ui/commit/d30dae602477a50ace87710e27b06c3faf2a6e59) - feat: add `$calc` formulas to spec expressions, so a spec can compute totals, quantities that follow an input, and formatted values from its state. Formulas are parsed by a bounded interpreter (no `eval`), give `null` instead of throwing, and `validateSpec` reports one that does not parse as `invalid-formula`. The spec guidance and the format rules now describe them, and a pointer into an array reads only the array's own items. ([@okisdev](https://github.com/okisdev))

- [#9455](https://github.com/assistant-ui/assistant-ui/pull/9455) [`986d7cf`](https://github.com/assistant-ui/assistant-ui/commit/986d7cffa2e9cde3c262e5798de62e4b6618479c) - Require explicit `fontStyleOrigins` and `fontOrigins` options for external font providers such as Google Fonts. An empty CDN allowlist now blocks external stylesheets and font files unless their resource origins are configured. ([@Yonom](https://github.com/Yonom))

- [#9318](https://github.com/assistant-ui/assistant-ui/pull/9318) [`1de1657`](https://github.com/assistant-ui/assistant-ui/commit/1de16572935587752628401d7928ba7bf9932010) - feat: keep a widget's `genframe.setState` value across reloads in the assistant-ui toolkit, and seed a frame's state with `initialState` ([@okisdev](https://github.com/okisdev))

## 0.0.4

### Patch Changes

- [#9253](https://github.com/assistant-ui/assistant-ui/pull/9253) [`1a76908`](https://github.com/assistant-ui/assistant-ui/commit/1a76908402c56b9783f2a6b3eeff8081b94f3d78) - fix(generative-frame): pass an MCP Apps widget's `ui/initialize` params to a new `onInitialized` handler, including the display modes it declares ([@rupic-app](https://github.com/apps/rupic-app))

- [#9268](https://github.com/assistant-ui/assistant-ui/pull/9268) [`afb9ad2`](https://github.com/assistant-ui/assistant-ui/commit/afb9ad2d42e4178a51eadf1ef15ad9f25be9df57) - feat: add `unsafeShimDomain` to load the shim from a self-hosted domain, and `opaqueOrigin` in generative-frame to render widgets in a `null`-origin sandbox without a shim ([@Yonom](https://github.com/Yonom))

- [#9310](https://github.com/assistant-ui/assistant-ui/pull/9310) [`2b1e1f5`](https://github.com/assistant-ui/assistant-ui/commit/2b1e1f5f95cb4cca9a2d8001e1e3b1ac68e46a0f) - feat: render spec mode on React Native, where `generative-frame/spec/react` and `generative-frame/spec/assistant-ui` resolve to React Native builds through the `react-native` condition, with `react-native` and `@assistant-ui/react-native` as optional peers ([@okisdev](https://github.com/okisdev))

- [#9286](https://github.com/assistant-ui/assistant-ui/pull/9286) [`409b896`](https://github.com/assistant-ui/assistant-ui/commit/409b896bcc11d5b0420cd3bc83b5463046a43558) - fix: validate a patch-only `render_spec` call after a reload against the spec rendered from the thread ([@okisdev](https://github.com/okisdev))

- [#9296](https://github.com/assistant-ui/assistant-ui/pull/9296) [`984674e`](https://github.com/assistant-ui/assistant-ui/commit/984674e2e0ab454c166712900e2d225cc8bc1803) - feat: keep what the user changes in a rendered spec across reloads in the assistant-ui toolkit, on the web and on React Native, and let a spec state store list and restore its writes ([@okisdev](https://github.com/okisdev))

- [#9287](https://github.com/assistant-ui/assistant-ui/pull/9287) [`1881261`](https://github.com/assistant-ui/assistant-ui/commit/1881261fd5d6605cbd1256af4f7c3547d9075d48) - feat: let assistant-ui specs read earlier tool results from state expressions ([@okisdev](https://github.com/okisdev))

- [#9288](https://github.com/assistant-ui/assistant-ui/pull/9288) [`a151d03`](https://github.com/assistant-ui/assistant-ui/commit/a151d031ca07b9441dcccbc9ad2b3f05970a648b) - feat: add `generative-frame/spec/vue`, a Vue renderer for spec mode, with `vue` as an optional peer ([@okisdev](https://github.com/okisdev))
- Updated dependencies [[`afb9ad2`](https://github.com/assistant-ui/assistant-ui/commit/afb9ad2d42e4178a51eadf1ef15ad9f25be9df57)]:
  - safe-content-frame@0.0.34

## 0.0.3

### Patch Changes

- [#9223](https://github.com/assistant-ui/assistant-ui/pull/9223) [`52e6257`](https://github.com/assistant-ui/assistant-ui/commit/52e625796b7f1cfe20f23a854c471d761c4d95e6) - fix(generative-frame): accept Standard Schema optional result members with undefined ([@rupic-app](https://github.com/apps/rupic-app))

## 0.0.2

### Patch Changes

- [#9103](https://github.com/assistant-ui/assistant-ui/pull/9103) [`6dd864b`](https://github.com/assistant-ui/assistant-ui/commit/6dd864b23bcc9290abcc68eb6b097ab99495d136) - feat: stream model-generated HTML and SVG widgets into Safe Content Frames with an MCP Apps-compatible host bridge, theme tokens, diagnostics, in-frame screenshots, per-id persistent storage, provider-agnostic widget tools, prompt guidance, and a repair loop; React bindings and an assistant-ui toolkit; and a declarative spec mode in separate entry points (`generative-frame/spec`, `/spec/react`, `/spec/tools`, `/spec/assistant-ui`) that never bundles the frame ([@Yonom](https://github.com/Yonom))
