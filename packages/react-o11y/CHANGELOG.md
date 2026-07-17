# @assistant-ui/react-o11y

## 0.0.26

### Patch Changes

- [#4746](https://github.com/assistant-ui/assistant-ui/pull/4746) [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4815](https://github.com/assistant-ui/assistant-ui/pull/4815) [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98), [`e02b21b`](https://github.com/assistant-ui/assistant-ui/commit/e02b21b23cc94f6eba692fbb285b5b27faea9ad0), [`7e28a72`](https://github.com/assistant-ui/assistant-ui/commit/7e28a726e67296b813c43859e45bfd9d1572794a), [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac)]:
  - @assistant-ui/tap@0.9.4
  - @assistant-ui/store@0.2.20

## 0.0.25

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#4535](https://github.com/assistant-ui/assistant-ui/pull/4535) [`d7c42fa`](https://github.com/assistant-ui/assistant-ui/commit/d7c42faf169c92bc6f343d865e06f5707fe1fab0) - feat: add headless span timeline primitives for rendering waterfall bars ([@samdickson22](https://github.com/samdickson22))

- Updated dependencies [[`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff)]:
  - @assistant-ui/store@0.2.19
  - @assistant-ui/tap@0.9.3

## 0.0.24

### Patch Changes

- Updated dependencies [[`8d3b0e8`](https://github.com/assistant-ui/assistant-ui/commit/8d3b0e8aade47116d9616d8dac2328e0bb73f296)]:
  - @assistant-ui/tap@0.9.2
  - @assistant-ui/store@0.2.18

## 0.0.23

### Patch Changes

- Updated dependencies [[`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668), [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda), [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda)]:
  - @assistant-ui/tap@0.9.1
  - @assistant-ui/store@0.2.18

## 0.0.22

### Patch Changes

- [#4385](https://github.com/assistant-ui/assistant-ui/pull/4385) [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff) - feat: precompile packages with React Compiler ([@Yonom](https://github.com/Yonom))
  - aui-build runs React Compiler over packages that depend on tap and remaps `react/compiler-runtime` to the tap shim subpath, so compiled hooks and components work both in React components and inside tap resource renders
  - `@assistant-ui/tap/react-shim` exports `useMemoCache` (tap inside a resource render, `React.__COMPILER_RUNTIME.c` otherwise, with a React 18 polyfill); new `@assistant-ui/tap/react-shim/compiler-runtime` subpath mirrors `react/compiler-runtime`'s `c` export
  - tap implements `useSyncExternalStore` and a no-op `useDebugValue`; `useSubscribable` now builds on `useSyncExternalStore` so its store reads stay visible to the compiler
  - `AssistantProviderBase` opts out via `"use no memo"` because the runtime receives options through an effect inside a re-rendered child element

- Updated dependencies [[`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff), [`9f13fdb`](https://github.com/assistant-ui/assistant-ui/commit/9f13fdb22d0bc1bf2ad001147b8acc0df4844302)]:
  - @assistant-ui/tap@0.8.1
  - @assistant-ui/store@0.2.17

## 0.0.21

### Patch Changes

- Updated dependencies [[`3e58253`](https://github.com/assistant-ui/assistant-ui/commit/3e5825369c7206f4df3532d5fabfbe5cf5e4fd40), [`12b016b`](https://github.com/assistant-ui/assistant-ui/commit/12b016bd14560c847dadae075edb57631ac9c516), [`3e58253`](https://github.com/assistant-ui/assistant-ui/commit/3e5825369c7206f4df3532d5fabfbe5cf5e4fd40), [`5a4f20e`](https://github.com/assistant-ui/assistant-ui/commit/5a4f20e75dcd93aeb70a4a5582a0a5a1f870b4f2)]:
  - @assistant-ui/store@0.2.16
  - @assistant-ui/tap@0.7.1

## 0.0.20

### Patch Changes

- [#4318](https://github.com/assistant-ui/assistant-ui/pull/4318) [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b) - refactor: adopt the extracted-hook convention for resources ([@Yonom](https://github.com/Yonom))

  A resource body is a hook, so resources are now authored as a `use`-prefixed hook
  wrapped with `resource()`:

  ```ts
  const useCounter = () => { ... };
  const Counter = resource(useCounter);
  ```

  `resource()` turns a hook into a Resource; `useResource(Counter(props))` turns it
  back into a hook call. Extracting the body to a `use`-prefixed hook lets React's
  stock rules-of-hooks and exhaustive-deps lint resource bodies directly. No
  public API or runtime behavior changes.

- Updated dependencies [[`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b)]:
  - @assistant-ui/tap@0.6.2
  - @assistant-ui/store@0.2.15

## 0.0.19

### Patch Changes

- Updated dependencies [[`5e1151e`](https://github.com/assistant-ui/assistant-ui/commit/5e1151e83ea3700edee9b1552f2e410b860b0afe)]:
  - @assistant-ui/tap@0.6.1
  - @assistant-ui/store@0.2.14

## 0.0.18

### Patch Changes

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc), [`01cf957`](https://github.com/assistant-ui/assistant-ui/commit/01cf957c209b1a58c69f5621565397de6d1eb794), [`01cf957`](https://github.com/assistant-ui/assistant-ui/commit/01cf957c209b1a58c69f5621565397de6d1eb794)]:
  - @assistant-ui/store@0.2.14
  - @assistant-ui/tap@0.6.0

## 0.0.17

### Patch Changes

- Updated dependencies [[`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3)]:
  - @assistant-ui/store@0.2.13
  - @assistant-ui/tap@0.5.14

## 0.0.16

### Patch Changes

- Updated dependencies [[`cabfc71`](https://github.com/assistant-ui/assistant-ui/commit/cabfc715e99f23a55dc1276a6028792d7ecad822)]:
  - @assistant-ui/tap@0.5.13
  - @assistant-ui/store@0.2.12

## 0.0.15

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0)]:
  - @assistant-ui/store@0.2.12
  - @assistant-ui/tap@0.5.12

## 0.0.14

### Patch Changes

- Updated dependencies [[`db721df`](https://github.com/assistant-ui/assistant-ui/commit/db721df32434296ac14eab27030628107975b71c), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33)]:
  - @assistant-ui/store@0.2.11
  - @assistant-ui/tap@0.5.11

## 0.0.13

### Patch Changes

- Updated dependencies [[`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94), [`5fdf17e`](https://github.com/assistant-ui/assistant-ui/commit/5fdf17e019c91b000c6f4cf9e3e56c89d764a435)]:
  - @assistant-ui/store@0.2.10
  - @assistant-ui/tap@0.5.11

## 0.0.12

### Patch Changes

- Updated dependencies [[`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e)]:
  - @assistant-ui/store@0.2.9
  - @assistant-ui/tap@0.5.10

## 0.0.11

### Patch Changes

- Updated dependencies [[`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`055dda5`](https://github.com/assistant-ui/assistant-ui/commit/055dda54b68031d0c9c760bf89a7c1036dd2174d), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063)]:
  - @assistant-ui/store@0.2.8
  - @assistant-ui/tap@0.5.9

## 0.0.10

### Patch Changes

- c988db8: chore: update dependencies
- Updated dependencies [c988db8]
  - @assistant-ui/store@0.2.7
  - @assistant-ui/tap@0.5.8

## 0.0.9

### Patch Changes

- Updated dependencies [376bb00]
  - @assistant-ui/tap@0.5.7
  - @assistant-ui/store@0.2.6

## 0.0.8

### Patch Changes

- 9103282: fix: resolve biome lint warnings (optional chaining, unused suppressions)
- 209ae81: chore: remove aui-source export condition from package.json exports
- Updated dependencies [bdce66f]
- Updated dependencies [209ae81]
- Updated dependencies [2dd0c9f]
  - @assistant-ui/store@0.2.6
  - @assistant-ui/tap@0.5.6

## 0.0.7

### Patch Changes

- Updated dependencies [52403c3]
  - @assistant-ui/store@0.2.5
  - @assistant-ui/tap@0.5.5

## 0.0.6

### Patch Changes

- Updated dependencies [28a987a]
- Updated dependencies [736344c]
- Updated dependencies [c71cb58]
  - @assistant-ui/store@0.2.4
  - @assistant-ui/tap@0.5.4

## 0.0.5

### Patch Changes

- 7ecc497: feat: children API for primitives with part.toolUI, part.dataRendererUI, and MessagePrimitive.Quote

## 0.0.4

### Patch Changes

- 349f3c7: chore: update deps
- Updated dependencies [349f3c7]
  - @assistant-ui/store@0.2.3
  - @assistant-ui/tap@0.5.3

## 0.0.3

### Patch Changes

- Updated dependencies [a845911]
  - @assistant-ui/store@0.2.2
  - @assistant-ui/tap@0.5.2

## 0.0.2

### Patch Changes

- 36ef3a2: chore: update dependencies
- Updated dependencies [36ef3a2]
- Updated dependencies [fc98475]
- Updated dependencies [a638f05]
  - @assistant-ui/store@0.2.1
  - @assistant-ui/tap@0.5.1
