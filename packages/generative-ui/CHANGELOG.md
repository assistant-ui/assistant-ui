# @assistant-ui/generative-ui

## 0.0.3

### Patch Changes

- Updated dependencies [[`afb9ad2`](https://github.com/assistant-ui/assistant-ui/commit/afb9ad2d42e4178a51eadf1ef15ad9f25be9df57)]:
  - generative-frame@0.0.4

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
