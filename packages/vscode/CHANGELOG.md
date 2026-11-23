# @assistant-ui/vscode

## 0.0.2

### Patch Changes

- [#10704](https://github.com/assistant-ui/assistant-ui/pull/10704) [`03c0650`](https://github.com/assistant-ui/assistant-ui/commit/03c06506107f55a7bc11bed616a2fed06af8a8ba) - Adapters that install `@assistant-ui/core` declare `@assistant-ui/store` and `@assistant-ui/tap` as peers, so strict installers such as Yarn PnP resolve the single copy the app provides. `@assistant-ui/react-ag-ui` also forwards the `zod` peer that `@ag-ui/client` declares. ([@okisdev](https://github.com/okisdev))
- Updated dependencies [[`74199f8`](https://github.com/assistant-ui/assistant-ui/commit/74199f892e29cc9377eb13b515de64a0ccadaf08), [`01d3fd7`](https://github.com/assistant-ui/assistant-ui/commit/01d3fd7519f6b4e16043285c7f03658fd7e4e685), [`974347f`](https://github.com/assistant-ui/assistant-ui/commit/974347f28c8e37e7dbde8ed526ce0363fe346cb6), [`ac873e5`](https://github.com/assistant-ui/assistant-ui/commit/ac873e5d3aded57180cbb8f2ec17fa109db6e4cd), [`9906ce6`](https://github.com/assistant-ui/assistant-ui/commit/9906ce658c309e57b138c5232f2fb1b09cdb55f8), [`3c1497d`](https://github.com/assistant-ui/assistant-ui/commit/3c1497d5ed2b4821a8f2007cc0aa8361e58b24d6), [`50efa27`](https://github.com/assistant-ui/assistant-ui/commit/50efa27e67989bd3104805047e8a444fe2a18e32), [`c66dab9`](https://github.com/assistant-ui/assistant-ui/commit/c66dab996f43619fb8ed6e4e6e673726f0e70da3), [`aea6e31`](https://github.com/assistant-ui/assistant-ui/commit/aea6e313402681acd45cc23bdadcfe7d37cd2e03), [`ed4e645`](https://github.com/assistant-ui/assistant-ui/commit/ed4e64513d5e34a38488b5e77a390a7c5878b0b1)]:
  - @assistant-ui/core@0.3.38

## 0.0.1

### Patch Changes

- [#10329](https://github.com/assistant-ui/assistant-ui/pull/10329) [`ec8321b`](https://github.com/assistant-ui/assistant-ui/commit/ec8321b0f16aa40d03ee51195bace46e43075a27) - Publish `@assistant-ui/vscode` to npm. It runs assistant-ui in a VS Code extension webview: `vscodeFetch` tunnels `fetch` to route handlers in the extension host, and the package also opens links in the browser, stores threads in a Memento, writes the webview HTML with a nonce-based Content Security Policy, and maps the components' theme tokens to VS Code's. `assistant-ui create -t vscode` scaffolds an extension that uses it. ([@bnb](https://github.com/bnb))
