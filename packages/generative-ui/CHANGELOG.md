# @assistant-ui/generative-ui

## 0.0.6

### Patch Changes

- Updated dependencies [[`6966821`](https://github.com/assistant-ui/assistant-ui/commit/69668210c9476323380067307284509f707b507a), [`e99250f`](https://github.com/assistant-ui/assistant-ui/commit/e99250fb58a4d31431e27dd5c6820ca3a813034a), [`54e2e9b`](https://github.com/assistant-ui/assistant-ui/commit/54e2e9b9611f32b669e5e874a515671175645307), [`be30245`](https://github.com/assistant-ui/assistant-ui/commit/be302451ba4243f14d612fe7530c63dfe9275f6d)]:
  - assistant-stream@0.3.53
  - generative-frame@0.0.7

## 0.0.5

### Patch Changes

- [#9539](https://github.com/assistant-ui/assistant-ui/pull/9539) [`40b797d`](https://github.com/assistant-ui/assistant-ui/commit/40b797d9c2155e67b16261340f3d2be6b7d10e9a) - chore(generative-ui): declare the actions the shipped Vue test helper's catalogs bind, so their handlers run ([@okisdev](https://github.com/okisdev))

- [#9655](https://github.com/assistant-ui/assistant-ui/pull/9655) [`846e007`](https://github.com/assistant-ui/assistant-ui/commit/846e0079be756eaacc3b357cc0352e9c7ef383c9) - fix(generative-ui): name a React Native list row made only of a Table from its cells, and export `useListViewItemText` from the React Native `@assistant-ui/generative-ui/spec` build so a custom component's text names the row too ([@okisdev](https://github.com/okisdev))

- [#9654](https://github.com/assistant-ui/assistant-ui/pull/9654) [`43a34f2`](https://github.com/assistant-ui/assistant-ui/commit/43a34f2ee9700b1c7c6c9bc996177c6d8795a69b) - fix(generative-ui): name a React Native list row in tree order when its text mounts late, such as a sibling that a `visible` condition shows again or a Timeline time that clears and returns ([@okisdev](https://github.com/okisdev))

- [#9651](https://github.com/assistant-ui/assistant-ui/pull/9651) [`f2c2b5e`](https://github.com/assistant-ui/assistant-ui/commit/f2c2b5e4955f811f9eb6cd0a2fd0c63a6dfc6b92) - fix: Badges stay readable inside a tinted Card on React Native: default and info Badges use an opaque theme pair there, and tone text in Badges and Fact chips mixes 55% tone with the ink instead of 60%, which keeps it above 4.5:1 on a dark tint. ([@okisdev](https://github.com/okisdev))

- [#9543](https://github.com/assistant-ui/assistant-ui/pull/9543) [`b569bbd`](https://github.com/assistant-ui/assistant-ui/commit/b569bbd3c353b205acba6ef1ea17cb89575c76cf) - feat: `specToUISpec` from the new React-free `@assistant-ui/generative-ui/spec/tree` converts a generative-frame spec into the tree the Slack and Teams converters and `generativeUIToJSX` take, so a spec mode answer can go to Slack and Teams. event bindings become `$action`, bound controls get a `name`, and an action param that reads a bound control's state becomes a `$field` reference to it. ([@okisdev](https://github.com/okisdev))

- [#9656](https://github.com/assistant-ui/assistant-ui/pull/9656) [`fd9e6a0`](https://github.com/assistant-ui/assistant-ui/commit/fd9e6a055f7d1842546acf0d7d6747188dfea7c7) - fix(generative-ui): keep a streamed child's state when its `_key` arrives after its `_type`, in the `present` and `prompt_user` tools and A2UI surfaces ([@okisdev](https://github.com/okisdev))
- Updated dependencies [[`bb61b74`](https://github.com/assistant-ui/assistant-ui/commit/bb61b743f002b42626afac3d05b278d54904f87f), [`e09563a`](https://github.com/assistant-ui/assistant-ui/commit/e09563a7fb7877b496478342d143c1c2820ee69e), [`b88d62d`](https://github.com/assistant-ui/assistant-ui/commit/b88d62d6d944efff99134508696ef51c922dc2ff), [`22d2688`](https://github.com/assistant-ui/assistant-ui/commit/22d268852dbf23fed3aa30a7d59c5930d5a0d360), [`18f03fe`](https://github.com/assistant-ui/assistant-ui/commit/18f03fec45d406b0285ccc4165f6db143ba87c7d), [`b569bbd`](https://github.com/assistant-ui/assistant-ui/commit/b569bbd3c353b205acba6ef1ea17cb89575c76cf), [`93e4166`](https://github.com/assistant-ui/assistant-ui/commit/93e41666fca7c81e0a2d3269be4273d52e056a4f), [`01225b9`](https://github.com/assistant-ui/assistant-ui/commit/01225b99661556557ca4d79f2d9c43c5db3588e5), [`1371e4f`](https://github.com/assistant-ui/assistant-ui/commit/1371e4f22f2bd018b6fb74c177595f63f7ae9f57), [`40b797d`](https://github.com/assistant-ui/assistant-ui/commit/40b797d9c2155e67b16261340f3d2be6b7d10e9a), [`5fb68df`](https://github.com/assistant-ui/assistant-ui/commit/5fb68dfa355d97e33059a47cbc3e68e258814a58), [`1109afa`](https://github.com/assistant-ui/assistant-ui/commit/1109afabb2f9465ea93f152fb344fbd9da3ac125), [`dfa78f1`](https://github.com/assistant-ui/assistant-ui/commit/dfa78f1f0c8bbc7e6ba6b44983273b06a37ccde4), [`f9e5643`](https://github.com/assistant-ui/assistant-ui/commit/f9e56437a067df208216d9dd57cf421c5f2a5f21), [`60cdf31`](https://github.com/assistant-ui/assistant-ui/commit/60cdf317a1da31983fc5bf69adbfa28eb63860a8), [`d768285`](https://github.com/assistant-ui/assistant-ui/commit/d768285690d79c0235ba78871376b520e6601ffc), [`8a3c0d3`](https://github.com/assistant-ui/assistant-ui/commit/8a3c0d371fafe0ec442b8039ba2d3e607738d363), [`d62f1bc`](https://github.com/assistant-ui/assistant-ui/commit/d62f1bcb05a5f633e42003b39673bb27d9f4f3b7), [`f2ff864`](https://github.com/assistant-ui/assistant-ui/commit/f2ff864c8d0c27f5dc0a51529180b8d4aecc440d), [`d247e90`](https://github.com/assistant-ui/assistant-ui/commit/d247e90914847bd7e50af3acc309c835c97d53f3), [`c67c117`](https://github.com/assistant-ui/assistant-ui/commit/c67c11792a896adc64c90b14f29e63e3274562f3), [`2ecb249`](https://github.com/assistant-ui/assistant-ui/commit/2ecb2494ed04fbd73b8af8bea7e42ce64c4313af), [`4984e19`](https://github.com/assistant-ui/assistant-ui/commit/4984e19bb66341c3d06d12ff3e95552b5060ace6), [`8dfb9d5`](https://github.com/assistant-ui/assistant-ui/commit/8dfb9d54221f340fbaf6774224a38c55f670d7e3), [`087a4af`](https://github.com/assistant-ui/assistant-ui/commit/087a4af22e6a47b693f741c846afe5ec29b511a9), [`00a590f`](https://github.com/assistant-ui/assistant-ui/commit/00a590fb2cea45128f44cb13b5c7b9286b09cf91), [`d7ba4e6`](https://github.com/assistant-ui/assistant-ui/commit/d7ba4e673622c3afbf064dc9c33583af81258548), [`b30bd7d`](https://github.com/assistant-ui/assistant-ui/commit/b30bd7d904e02720ba9653a0262b257fa8506336), [`6e03eee`](https://github.com/assistant-ui/assistant-ui/commit/6e03eee28097258712f3b58d71dec4e96858ceeb), [`c0e47c5`](https://github.com/assistant-ui/assistant-ui/commit/c0e47c53a25f1307a398e1afb4b1ab80556e0ab9), [`5402b93`](https://github.com/assistant-ui/assistant-ui/commit/5402b93a1e991d0a3e44e253d7bd67880931c835), [`60c7dc0`](https://github.com/assistant-ui/assistant-ui/commit/60c7dc0ac73d95e3855c4e6205e58ba1db49be15), [`d068bea`](https://github.com/assistant-ui/assistant-ui/commit/d068bea422365fe93d4a2fbb4ba2295eab75fbff), [`1e1da15`](https://github.com/assistant-ui/assistant-ui/commit/1e1da15c4376b24dede07755d24958b58a965a3b), [`7b341a2`](https://github.com/assistant-ui/assistant-ui/commit/7b341a2aaa7e0e66b23a18f2249017af65075f0f), [`b05c885`](https://github.com/assistant-ui/assistant-ui/commit/b05c8858495566319bbf7521652f41f73bb2a5ad), [`7358d7f`](https://github.com/assistant-ui/assistant-ui/commit/7358d7f2a072410b6dc990b0f0df31d6ecc0207d), [`5bccbf4`](https://github.com/assistant-ui/assistant-ui/commit/5bccbf4b6e173548a9eec630bc9b41cea5cdd7ce), [`4522748`](https://github.com/assistant-ui/assistant-ui/commit/45227481692aaca8c93a537cf635e5fc018bba97)]:
  - generative-frame@0.0.6
  - assistant-stream@0.3.52

## 0.0.4

### Patch Changes

- [#9441](https://github.com/assistant-ui/assistant-ui/pull/9441) [`d0c7f28`](https://github.com/assistant-ui/assistant-ui/commit/d0c7f28127dc602fc84bd55fea566fd971d7c327) - feat: render a card as a panel on react native, keep a pixel-sized image at its size in a row, and tell the model a card is a module, with key figures in a row and image urls taken from tool results ([@okisdev](https://github.com/okisdev))

- [#9385](https://github.com/assistant-ui/assistant-ui/pull/9385) [`c08f1fc`](https://github.com/assistant-ui/assistant-ui/commit/c08f1fc107a111309c38aa9b1008e649fcc94f4a) - feat: add `Diagram` and `Map` to the vocabulary, which render their Mermaid source and a list of linked places until a host draws them ([@okisdev](https://github.com/okisdev))

- [#9374](https://github.com/assistant-ui/assistant-ui/pull/9374) [`463644d`](https://github.com/assistant-ui/assistant-ui/commit/463644df51915717842c32c3f671d4921eca9566) - feat: add `Tabs`, `Steps`, `Timeline`, and `Citation` to the vocabulary, and a `progress` checklist mode to `CheckboxGroup` ([@okisdev](https://github.com/okisdev))

- [#9349](https://github.com/assistant-ui/assistant-ui/pull/9349) [`7945f55`](https://github.com/assistant-ui/assistant-ui/commit/7945f5580cc549cfdd667e8944b9ff4ab41c1948) - fix(generative-ui): remount a node renderer when its type changes ([@rupic-app](https://github.com/apps/rupic-app))

- [#9378](https://github.com/assistant-ui/assistant-ui/pull/9378) [`890b9c8`](https://github.com/assistant-ui/assistant-ui/commit/890b9c88e44040b84cb1f48641cff1111cdcd46b) - fix(generative-ui): keep nested controls in pressable native list rows reachable with VoiceOver and TalkBack ([@okisdev](https://github.com/okisdev))

- [#9341](https://github.com/assistant-ui/assistant-ui/pull/9341) [`3227ffc`](https://github.com/assistant-ui/assistant-ui/commit/3227ffcdd901c5a06ee4c8f437f32642f49e87c7) - Improve native Fact and Badge text contrast across themes. ([@rupic-app](https://github.com/apps/rupic-app))

- [#9405](https://github.com/assistant-ui/assistant-ui/pull/9405) [`1abdaaa`](https://github.com/assistant-ui/assistant-ui/commit/1abdaaaa9f57f0ff8dba51ab7153b70d3a206339) - fix: accept numeric text in tabs, steps, timeline, and citations, and leave an empty citation source out of slack messages ([@okisdev](https://github.com/okisdev))

- [#9380](https://github.com/assistant-ui/assistant-ui/pull/9380) [`1f4e878`](https://github.com/assistant-ui/assistant-ui/commit/1f4e8785df34d231bdb8bb13a689165adc2c9727) - fix(generative-ui): escape model text before it reaches slack mrkdwn, so `<!channel>`, `<@user>` and `<url|label>` in model output render as plain text; caps count the escaped length and `fromSlackBlocks` decodes the entities ([@rupic-app](https://github.com/apps/rupic-app))

- [#9354](https://github.com/assistant-ui/assistant-ui/pull/9354) [`8fd311d`](https://github.com/assistant-ui/assistant-ui/commit/8fd311d3b1e73d95add5d8a75ce0496470cadc2f) - fix(generative-ui): allow numeric text props in generative UI and convert them to text in Slack and Teams output. A numeric 0 now renders in Alert, Card, and Select text, native Checkbox and Switch labels are announced, and the Teams converter now ignores built-in property names such as `constructor` in `Text.size` and `Alert.tone`. ([@rupic-app](https://github.com/apps/rupic-app))
- Updated dependencies [[`5113baa`](https://github.com/assistant-ui/assistant-ui/commit/5113baa64eb50e2b7be167323161bb173a19c610), [`05462a5`](https://github.com/assistant-ui/assistant-ui/commit/05462a5b9d10955f4520619f192e2378a81bfcb5), [`c5c4fdd`](https://github.com/assistant-ui/assistant-ui/commit/c5c4fddfb57aafc7ad3043d11fe1bb3cd773656b), [`7bff761`](https://github.com/assistant-ui/assistant-ui/commit/7bff761a8d2837f05ce41ca54ef8c471af03be6c), [`d30dae6`](https://github.com/assistant-ui/assistant-ui/commit/d30dae602477a50ace87710e27b06c3faf2a6e59), [`986d7cf`](https://github.com/assistant-ui/assistant-ui/commit/986d7cffa2e9cde3c262e5798de62e4b6618479c), [`1de1657`](https://github.com/assistant-ui/assistant-ui/commit/1de16572935587752628401d7928ba7bf9932010)]:
  - generative-frame@0.0.5
  - assistant-stream@0.3.51

## 0.0.3

### Patch Changes

- [#9271](https://github.com/assistant-ui/assistant-ui/pull/9271) [`e47f4df`](https://github.com/assistant-ui/assistant-ui/commit/e47f4df79c3edd76244435cb137a145ef62b682a) - fix: submit an `asForm` card through its own action in the Slack and Teams converters when its confirm footer has none ([@okisdev](https://github.com/okisdev))

- [#9301](https://github.com/assistant-ui/assistant-ui/pull/9301) [`5c61b44`](https://github.com/assistant-ui/assistant-ui/commit/5c61b4458f9dbe9adea802b73beb0035b577c771) - fix: keep a library component named `__proto__` in `toSpecCatalog`, render an `Icon` with an unknown `size` at the medium size, and page a `Carousel` where `Element.scrollBy` is missing ([@okisdev](https://github.com/okisdev))

- [#9344](https://github.com/assistant-ui/assistant-ui/pull/9344) [`11aa9e0`](https://github.com/assistant-ui/assistant-ui/commit/11aa9e077123169b357acf4ab8ee60a61a21b715) - fix(generative-ui): give a React or Vue ListViewItem row action its own button instead of wrapping nested controls in `role="button"` ([@okisdev](https://github.com/okisdev))

- [#9332](https://github.com/assistant-ui/assistant-ui/pull/9332) [`1636929`](https://github.com/assistant-ui/assistant-ui/commit/16369291970085cec4083bd9b17274338d9bb17a) - fix(generative-ui): declare the number values Text, Caption, Fact and Badge already render, and keep them in the Slack and Teams converters ([@okisdev](https://github.com/okisdev))

- [#9314](https://github.com/assistant-ui/assistant-ui/pull/9314) [`b5fd740`](https://github.com/assistant-ui/assistant-ui/commit/b5fd740e6ade360b072dd74869091b0226114719) - feat: draw the spec vocabulary with React Native components, where `@assistant-ui/generative-ui/spec` resolves to a React Native build through the `react-native` condition with `react-native` as an optional peer, and export `defaultGenerativeUILibrary` from `@assistant-ui/generative-ui/spec` ([@okisdev](https://github.com/okisdev))

- [#9272](https://github.com/assistant-ui/assistant-ui/pull/9272) [`d203be7`](https://github.com/assistant-ui/assistant-ui/commit/d203be764dce4942fbb299f7ede6342eb3df432c) - feat: let a library entry declare its spec mode `events` and `slots`, and give spec components `$slots` and a `$bindings` setter for each prop bound to state ([@okisdev](https://github.com/okisdev))

- [#9297](https://github.com/assistant-ui/assistant-ui/pull/9297) [`22bbf64`](https://github.com/assistant-ui/assistant-ui/commit/22bbf64d1955367ea607cb563ffabdf465608cae) - refactor: keep each vocabulary component's description and schema, the spec catalog shapes, and the render helpers in React-free modules, so renderers for other frameworks can share them ([@okisdev](https://github.com/okisdev))

- [#9329](https://github.com/assistant-ui/assistant-ui/pull/9329) [`8fcde98`](https://github.com/assistant-ui/assistant-ui/commit/8fcde9898c26b68b1329286f47c061d8216c769c) - chore(generative-ui): compare the shipped Vue test helper's markup without React 18's empty input value ([@okisdev](https://github.com/okisdev))

- [#9301](https://github.com/assistant-ui/assistant-ui/pull/9301) [`5c61b44`](https://github.com/assistant-ui/assistant-ui/commit/5c61b4458f9dbe9adea802b73beb0035b577c771) - feat: add `@assistant-ui/generative-ui/vue`, the vocabulary as Vue components for generative-frame's Vue spec renderer, with `vue` as an optional peer ([@okisdev](https://github.com/okisdev))

- [#9273](https://github.com/assistant-ui/assistant-ui/pull/9273) [`8e566e3`](https://github.com/assistant-ui/assistant-ui/commit/8e566e332a9035406f9d82f52b2abfea3828cacc) - fix: keep a `present` call editable on React 18 instead of locking it as an answered prompt ([@okisdev](https://github.com/okisdev))
- Updated dependencies [[`1a76908`](https://github.com/assistant-ui/assistant-ui/commit/1a76908402c56b9783f2a6b3eeff8081b94f3d78), [`afb9ad2`](https://github.com/assistant-ui/assistant-ui/commit/afb9ad2d42e4178a51eadf1ef15ad9f25be9df57), [`8b49f28`](https://github.com/assistant-ui/assistant-ui/commit/8b49f28640bcb97f10f3e5db6334e1bac4906c43), [`2b1e1f5`](https://github.com/assistant-ui/assistant-ui/commit/2b1e1f5f95cb4cca9a2d8001e1e3b1ac68e46a0f), [`409b896`](https://github.com/assistant-ui/assistant-ui/commit/409b896bcc11d5b0420cd3bc83b5463046a43558), [`984674e`](https://github.com/assistant-ui/assistant-ui/commit/984674e2e0ab454c166712900e2d225cc8bc1803), [`1881261`](https://github.com/assistant-ui/assistant-ui/commit/1881261fd5d6605cbd1256af4f7c3547d9075d48), [`a151d03`](https://github.com/assistant-ui/assistant-ui/commit/a151d031ca07b9441dcccbc9ad2b3f05970a648b)]:
  - generative-frame@0.0.4
  - assistant-stream@0.3.50

## 0.0.2

### Patch Changes

- [#9183](https://github.com/assistant-ui/assistant-ui/pull/9183) [`7e40981`](https://github.com/assistant-ui/assistant-ui/commit/7e409818675f324881bcf3d0538cc33394858c7f) - Avoid development warnings for property collisions within the shipped generative UI vocabulary. ([@rupic-app](https://github.com/apps/rupic-app))

- [#9236](https://github.com/assistant-ui/assistant-ui/pull/9236) [`19130f0`](https://github.com/assistant-ui/assistant-ui/commit/19130f0217423e082bc89cd750e0113542b0c11f) - feat(generative-ui): add the `./spec` entry with `toSpecCatalog`, which builds generative-frame spec mode's catalog and React components from a generative UI library; it needs `generative-frame` installed ([@okisdev](https://github.com/okisdev))

- [#9180](https://github.com/assistant-ui/assistant-ui/pull/9180) [`4ec2945`](https://github.com/assistant-ui/assistant-ui/commit/4ec2945e53f67f01b35dc0395df1f91c0b9f5cf4) - fix(generative-ui): prefix console warnings with the package's own name instead of `@assistant-ui/react-generative-ui` ([@okisdev](https://github.com/okisdev))

- [#9231](https://github.com/assistant-ui/assistant-ui/pull/9231) [`d61fd6b`](https://github.com/assistant-ui/assistant-ui/commit/d61fd6b8c8bf7b25f18c5dff4d528cde884f5239) - fix(generative-ui): name the `present` schema's reserved keys `_type`, `_key`, and `_action` so Anthropic models accept the tool. Models are told the root node needs `_type` too, a complete root without a type renders the `children` it wraps, trees in either spelling render, and development builds warn about prop names Anthropic rejects. ([@okisdev](https://github.com/okisdev))

- [#9216](https://github.com/assistant-ui/assistant-ui/pull/9216) [`a8a2f91`](https://github.com/assistant-ui/assistant-ui/commit/a8a2f91f3281b58a9061df1254a905028872c431) - fix(generative-ui): offer every distinct schema of a shared present prop and drop a value for it that only another component's schema accepts ([@rupic-app](https://github.com/apps/rupic-app))

- [#9242](https://github.com/assistant-ui/assistant-ui/pull/9242) [`8443db3`](https://github.com/assistant-ui/assistant-ui/commit/8443db34577d16bdbe5a468467a36c7c41ca87a4) - fix(generative-ui): submit an `asForm` card through its own `_action` when its `confirm` footer has none ([@rupic-app](https://github.com/apps/rupic-app))
- Updated dependencies [[`52e6257`](https://github.com/assistant-ui/assistant-ui/commit/52e625796b7f1cfe20f23a854c471d761c4d95e6)]:
  - generative-frame@0.0.3

## 0.0.1

### Patch Changes

- [#8446](https://github.com/assistant-ui/assistant-ui/pull/8446) [`d8a9b1b`](https://github.com/assistant-ui/assistant-ui/commit/d8a9b1b1a56ce5b6b7d2aded92f0911c342101ec) - fix: read current input values for A2UI action bindings nested in objects and arrays. ([@Kinfe123](https://github.com/Kinfe123))

- [#8937](https://github.com/assistant-ui/assistant-ui/pull/8937) [`92f2ed9`](https://github.com/assistant-ui/assistant-ui/commit/92f2ed9d1b9a66b223128a0e39b50b6e4cd53477) - fix: resolve nested A2UI action paths without losing empty property names ([@Kinfe123](https://github.com/Kinfe123))

- [#8876](https://github.com/assistant-ui/assistant-ui/pull/8876) [`287b768`](https://github.com/assistant-ui/assistant-ui/commit/287b7689572522cd24c159b22d30a0e4f736e031) - build the A2UI `present` tool call in one place: `surfaceToPresentToolCall` in `@assistant-ui/generative-ui/a2ui`, used by the AG-UI and A2A adapters ([@okisdev](https://github.com/okisdev))

- [#8916](https://github.com/assistant-ui/assistant-ui/pull/8916) [`b8b3e74`](https://github.com/assistant-ui/assistant-ui/commit/b8b3e7417165a790549f6e470f449540db99b7f1) - decode A2UI JSON pointers through one shared decoder with explicit absolute and scope-relative entry points ([@okisdev](https://github.com/okisdev))

- [#8437](https://github.com/assistant-ui/assistant-ui/pull/8437) [`48b31a9`](https://github.com/assistant-ui/assistant-ui/commit/48b31a9dea59260a26d8296b3ba79e0c7faa9a55) - fix: enable Slack single-line input action events on Enter outside forms when the input declares an action, and decode passive single-line inputs from `fromSlackBlocks` without an `$action`. ([@Kinfe123](https://github.com/Kinfe123))

- [#9082](https://github.com/assistant-ui/assistant-ui/pull/9082) [`ae487aa`](https://github.com/assistant-ui/assistant-ui/commit/ae487aa5c66951faa60ef4f32b3e36e2c0a2ef20) - feat: mark every experimental API `@deprecated Experimental since <date>`, so editors strike it through as experimental rather than scheduled for removal; `@typescript-eslint/no-deprecated` reports these APIs too ([@okisdev](https://github.com/okisdev))

- [#9087](https://github.com/assistant-ui/assistant-ui/pull/9087) [`650942c`](https://github.com/assistant-ui/assistant-ui/commit/650942ce6da486a07dc2ab1a0f14c2a7ecc1526f) - feat: export `resolveFieldReferences` and `hasFieldReference`, so a custom component that dispatches its own `$action` can resolve `{ "$field": name }` references against its own values. `resolveFieldReferences` now keeps a reference nested deeper than 64 levels as is, matching `hasFieldReference`. ([@okisdev](https://github.com/okisdev))

- [#9127](https://github.com/assistant-ui/assistant-ui/pull/9127) [`55af03b`](https://github.com/assistant-ui/assistant-ui/commit/55af03b6e12ff70c2d046f10539636f852655fa5) - refactor(generative-ui): keep the generic vocabulary independent of A2UI internals ([@okisdev](https://github.com/okisdev))

- [#9155](https://github.com/assistant-ui/assistant-ui/pull/9155) [`7ff9ec2`](https://github.com/assistant-ui/assistant-ui/commit/7ff9ec2ec5b50de5c5f39eb4bfe087b65d0c1aea) - fix(generative-ui): ignore Safari's IME confirmation Enter in vocabulary inputs ([@okisdev](https://github.com/okisdev))

- [#9071](https://github.com/assistant-ui/assistant-ui/pull/9071) [`7a1342e`](https://github.com/assistant-ui/assistant-ui/commit/7a1342edd7849fda809161752182cc9da7c67983) - feat: initial release. the framework-neutral home of generative UI, previously published as `@assistant-ui/react-generative-ui`. the root entry is the React-free UI tree (formerly `./ir`), `./react` holds the React renderer and tools (formerly the root entry), and `./a2ui`, `./slack`, and `./teams` keep their names. ([@okisdev](https://github.com/okisdev))
- Updated dependencies [[`606bc2d`](https://github.com/assistant-ui/assistant-ui/commit/606bc2d5027ed16b1108bdee6d0908a34ff0d4cd), [`c5a635a`](https://github.com/assistant-ui/assistant-ui/commit/c5a635a92f5d8335888714e245b09641cbeae0bd), [`2252059`](https://github.com/assistant-ui/assistant-ui/commit/2252059cee96c0af37934c0e16867f2de56b327c), [`2abd1e0`](https://github.com/assistant-ui/assistant-ui/commit/2abd1e03ce2a328f16422e866b97d2ce395aa129), [`2ed2043`](https://github.com/assistant-ui/assistant-ui/commit/2ed20432b5b1a13a7a8671eddc86f4d8ebfd0f68), [`ae487aa`](https://github.com/assistant-ui/assistant-ui/commit/ae487aa5c66951faa60ef4f32b3e36e2c0a2ef20), [`01ac83d`](https://github.com/assistant-ui/assistant-ui/commit/01ac83dff50e16959ebf16556db43464e7a82ea4), [`8c32dea`](https://github.com/assistant-ui/assistant-ui/commit/8c32deae521d9e518146a04fea3a03f8d0c7f349), [`0a3ca24`](https://github.com/assistant-ui/assistant-ui/commit/0a3ca2482e72e4d1c35805222df44e81ba6b55c5), [`ee517fb`](https://github.com/assistant-ui/assistant-ui/commit/ee517fbcef3e9b37f4653ef50825e519f4faee4c), [`081a239`](https://github.com/assistant-ui/assistant-ui/commit/081a23960a018742e6b48a0742728518a49050a5), [`542d871`](https://github.com/assistant-ui/assistant-ui/commit/542d8710c360676d6ba6d96bac5474386a46e6a2), [`e79cdd4`](https://github.com/assistant-ui/assistant-ui/commit/e79cdd4490ebd3909d5ce90ab08b156e05f9f722), [`41344cb`](https://github.com/assistant-ui/assistant-ui/commit/41344cba68efe187ec81c02006d50fc6bc833abb), [`e8620c1`](https://github.com/assistant-ui/assistant-ui/commit/e8620c1e8af8d8de20e9fa9919e64995559d9450), [`3b7b337`](https://github.com/assistant-ui/assistant-ui/commit/3b7b3379441cc883dbf15e6caa71adfdbd498472)]:
  - assistant-stream@0.3.49
