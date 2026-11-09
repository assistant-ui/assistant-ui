# @assistant-ui/docs-theme

## 0.0.3

### Patch Changes

- [#10296](https://github.com/assistant-ui/assistant-ui/pull/10296) [`f451b59`](https://github.com/assistant-ui/assistant-ui/commit/f451b59786ffdf55578dc030009a1de455c82d97) - Expose responsive site header, sidebar state, table of contents and pager controls. Hidden mobile navigation is inert, closing site navigation restores focus, and pager links include destination labels. Allow main landmark props for skip-link targets. Heading observers run only when the table of contents is visible. ([@Kinfe123](https://github.com/Kinfe123))

- [#10296](https://github.com/assistant-ui/assistant-ui/pull/10296) [`f451b59`](https://github.com/assistant-ui/assistant-ui/commit/f451b59786ffdf55578dc030009a1de455c82d97) - Add composable documentation layout, page typography, footer navigation and site stylesheet matching assistant-ui’s docs. Existing Farming Labs integration exports remain available. ([@Kinfe123](https://github.com/Kinfe123))

- [#10296](https://github.com/assistant-ui/assistant-ui/pull/10296) [`f451b59`](https://github.com/assistant-ui/assistant-ui/commit/f451b59786ffdf55578dc030009a1de455c82d97) - Add animated documentation sidebar sections with nested active-page navigation, platform visibility and application-owned banner/footer slots. The active ancestor path is computed once per tree and pathname change. ([@Kinfe123](https://github.com/Kinfe123))

- [#10296](https://github.com/assistant-ui/assistant-ui/pull/10296) [`f451b59`](https://github.com/assistant-ui/assistant-ui/commit/f451b59786ffdf55578dc030009a1de455c82d97) - perf: use the focused Farming Labs configuration entry to avoid loading server modules when configuring the documentation theme. Align the theme with Farming Labs Docs and Theme 0.2.137, which also avoid raw Markdown parser startup for MDX tree helpers and defer the built-in command-search dialog until first use. Align Fumadocs UI with the framework at 16.17.8 to preserve shared contexts. ([@Kinfe123](https://github.com/Kinfe123))

- [#10307](https://github.com/assistant-ui/assistant-ui/pull/10307) [`dcb9a07`](https://github.com/assistant-ui/assistant-ui/commit/dcb9a076afc79feffee45c668e46ff0ae46a1d53) - Reduce the documentation sidebar's animation bundle while preserving section transitions and navigation behavior. ([@Kinfe123](https://github.com/Kinfe123))

## 0.0.2

### Patch Changes

- [#10100](https://github.com/assistant-ui/assistant-ui/pull/10100) [`7d6cf6a`](https://github.com/assistant-ui/assistant-ui/commit/7d6cf6a923b5381cd5ee64847a2269f4b1b962a5) - Make the shared documentation theme available as a public npm package and document its registry installation with the supported Farming Labs peers. ([@Kinfe123](https://github.com/Kinfe123))

- [#10128](https://github.com/assistant-ui/assistant-ui/pull/10128) [`8e4a469`](https://github.com/assistant-ui/assistant-ui/commit/8e4a46935e30207121b192885fcdaef31c437b41) - chore: update dependencies ([@Yonom](https://github.com/Yonom))
