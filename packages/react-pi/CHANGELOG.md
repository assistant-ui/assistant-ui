# @assistant-ui/react-pi

## 0.0.8

### Patch Changes

- [#5030](https://github.com/assistant-ui/assistant-ui/pull/5030) [`3970ef9`](https://github.com/assistant-ui/assistant-ui/commit/3970ef93766e9164eff24968c1a2703fbf7fa6dc) - feat: map Pi settled and appended session events without snapshot refreshes ([@Kinfe123](https://github.com/Kinfe123))

- [#5056](https://github.com/assistant-ui/assistant-ui/pull/5056) [`b479898`](https://github.com/assistant-ui/assistant-ui/commit/b479898881317d0565bf9b7ab3d268d950e1c8c3) - fix: validate JSON payloads returned by the Pi HTTP client ([@Kinfe123](https://github.com/Kinfe123))

- [#5105](https://github.com/assistant-ui/assistant-ui/pull/5105) [`ba80ddb`](https://github.com/assistant-ui/assistant-ui/commit/ba80ddbd4a61c1c98ae1527671c200e65b15a989) - fix: migrate the react-pi node host to the pi 0.80.8+ ModelRuntime API and raise the pi-coding-agent peer floor to >=0.80.8, so the ./node entry links again on pi 0.80.8+ (which removed AuthStorage and replaced ModelRegistry.create) ([@rupic-app](https://github.com/apps/rupic-app))

- [#5010](https://github.com/assistant-ui/assistant-ui/pull/5010) [`a120cc2`](https://github.com/assistant-ui/assistant-ui/commit/a120cc22ce43818a9dac39b00cec38af4762a415) - fix: validate event stream response content types ([@Kinfe123](https://github.com/Kinfe123))

- [#5023](https://github.com/assistant-ui/assistant-ui/pull/5023) [`0efc434`](https://github.com/assistant-ui/assistant-ui/commit/0efc4340085e4c3e44c3fb1323dcd9b47e924586) - fix: widen the pi-coding-agent peer to >=0.78.0 <0.80.8, covering 0.79.x and 0.80.x up to the release that removed the AuthStorage API the node host still uses ([@ShobhitPatra](https://github.com/ShobhitPatra))

- Updated dependencies [[`79034bb`](https://github.com/assistant-ui/assistant-ui/commit/79034bbfe8da82c3739969bf7b4cc744910d203a), [`b17d392`](https://github.com/assistant-ui/assistant-ui/commit/b17d3929d785cb418615d18b739fb9e3b7b53728), [`20643e2`](https://github.com/assistant-ui/assistant-ui/commit/20643e299a3d9eeb73d73dca72d4b70220f4dc0b), [`33924df`](https://github.com/assistant-ui/assistant-ui/commit/33924df40ad3463f4e589617876d2496f48936ec), [`19cfdcd`](https://github.com/assistant-ui/assistant-ui/commit/19cfdcdfdc6778a3ed3f607f694787fe1ef54612), [`ca80153`](https://github.com/assistant-ui/assistant-ui/commit/ca801537e02bbab09532d0f505992778d282dddb), [`f2f5e83`](https://github.com/assistant-ui/assistant-ui/commit/f2f5e8361fa5cee5c67ede5b5dac239416aa32ac), [`666aaab`](https://github.com/assistant-ui/assistant-ui/commit/666aaab6ac3a64ec0f58c3ae958186a9880d8764), [`c1b1750`](https://github.com/assistant-ui/assistant-ui/commit/c1b175040e49ecb82b43d2713536aef7a1f2300e), [`61518b9`](https://github.com/assistant-ui/assistant-ui/commit/61518b99c11c49f439fc9411187b1cb148777b79), [`1eb7275`](https://github.com/assistant-ui/assistant-ui/commit/1eb72757257d1919b2c198c8700deb79ff280253)]:
  - @assistant-ui/core@0.2.22

## 0.0.7

### Patch Changes

- [#4746](https://github.com/assistant-ui/assistant-ui/pull/4746) [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4939](https://github.com/assistant-ui/assistant-ui/pull/4939) [`7635294`](https://github.com/assistant-ui/assistant-ui/commit/7635294b2abe55c26ae41384b7c5ecb5df31342e) - fix: parse all standard SSE line endings ([@Kinfe123](https://github.com/Kinfe123))

- [#4887](https://github.com/assistant-ui/assistant-ui/pull/4887) [`d03e5cf`](https://github.com/assistant-ui/assistant-ui/commit/d03e5cf0e6efada832503fedc565a1fb8f14676a) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4887](https://github.com/assistant-ui/assistant-ui/pull/4887) [`d03e5cf`](https://github.com/assistant-ui/assistant-ui/commit/d03e5cf0e6efada832503fedc565a1fb8f14676a) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4815](https://github.com/assistant-ui/assistant-ui/pull/4815) [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`2aca5e0`](https://github.com/assistant-ui/assistant-ui/commit/2aca5e09337b5b867562e6280b8cc6d49763e845), [`908af6d`](https://github.com/assistant-ui/assistant-ui/commit/908af6d6104b355c3097fcf77367bed1bf5541b8), [`1b46551`](https://github.com/assistant-ui/assistant-ui/commit/1b465515f38be1d7d4e844ab5d95c90537745d15), [`7865f67`](https://github.com/assistant-ui/assistant-ui/commit/7865f6730d0a98e43bc27d5a0482bc43f2678de5), [`438ecd3`](https://github.com/assistant-ui/assistant-ui/commit/438ecd350d5f14e5c5d329d6f4c0689b491c0845), [`5a34e8c`](https://github.com/assistant-ui/assistant-ui/commit/5a34e8c2721b02e7a115d085bc09a447e0d3caa9), [`5dbbac4`](https://github.com/assistant-ui/assistant-ui/commit/5dbbac4f49b6269c1017f11c9bf6da2909fa6c96), [`d3bd0ed`](https://github.com/assistant-ui/assistant-ui/commit/d3bd0ede457f50043ff59f8987f59b16c675ef01), [`84e8ddf`](https://github.com/assistant-ui/assistant-ui/commit/84e8ddf548d808d74d84b6be5a8ed28642baad3d), [`8282269`](https://github.com/assistant-ui/assistant-ui/commit/8282269f0864bc43c999cd209fbbee035ee53641), [`03ffe44`](https://github.com/assistant-ui/assistant-ui/commit/03ffe44808f4898a2862e608db7258682cf12383), [`77c7b26`](https://github.com/assistant-ui/assistant-ui/commit/77c7b269795c7aad03ce83e7e574425c3e0f26c8), [`026a7ae`](https://github.com/assistant-ui/assistant-ui/commit/026a7aeabc8134d3ecb26127225ebf0070267261), [`160b0af`](https://github.com/assistant-ui/assistant-ui/commit/160b0afa773b13a5e0f462cf05b7661baa1627f5), [`c814c9c`](https://github.com/assistant-ui/assistant-ui/commit/c814c9cf562a66ab3864ca0472d667902ebc131b), [`6be3b67`](https://github.com/assistant-ui/assistant-ui/commit/6be3b6781b3ddd178208bc9de15326ab35d496d4), [`c590a21`](https://github.com/assistant-ui/assistant-ui/commit/c590a21a63405f5a52a6d372e003afca06cf4a1e), [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98), [`a84cf6d`](https://github.com/assistant-ui/assistant-ui/commit/a84cf6ddc37ba7a7ea7244eb73e5d40a00ea5e24), [`9f99c46`](https://github.com/assistant-ui/assistant-ui/commit/9f99c46ca1ca724081466f97c7e17eda316e8fb3), [`e3aba86`](https://github.com/assistant-ui/assistant-ui/commit/e3aba86b7a788261d25921e4a58cebbe7a59fb44), [`25f9eb2`](https://github.com/assistant-ui/assistant-ui/commit/25f9eb2caacade2e5522f92e3221ee8173da0608), [`d03e5cf`](https://github.com/assistant-ui/assistant-ui/commit/d03e5cf0e6efada832503fedc565a1fb8f14676a), [`ef81c86`](https://github.com/assistant-ui/assistant-ui/commit/ef81c869a3292175a32f0d924e911564a07d439b), [`5ade3a5`](https://github.com/assistant-ui/assistant-ui/commit/5ade3a500498b59a4449f46d443ced8a1e3136be), [`1f284ac`](https://github.com/assistant-ui/assistant-ui/commit/1f284ac2f4e20b0daebfdb6829a44ba0a56033b3), [`65ba32a`](https://github.com/assistant-ui/assistant-ui/commit/65ba32a956661804203450cfb9a2b0285450da9d), [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac)]:
  - @assistant-ui/core@0.2.21
  - @assistant-ui/store@0.2.20

## 0.0.6

### Patch Changes

- [#4608](https://github.com/assistant-ui/assistant-ui/pull/4608) [`a7b06f7`](https://github.com/assistant-ui/assistant-ui/commit/a7b06f76876078fc2fcbb92a86fa0e1530fde782) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.0.5

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#4515](https://github.com/assistant-ui/assistant-ui/pull/4515) [`f5e94b7`](https://github.com/assistant-ui/assistant-ui/commit/f5e94b767ab23fdae4739fbf73cf4d75c6ce4778) - feat: forward `onThreadIdChange` through the adapter entry hooks (`useLangGraphRuntime`, `useStreamRuntime`, `useChatRuntime`, `useAdkRuntime`, `useOpenCodeRuntime`, `usePiRuntime`). the option already existed on `useRemoteThreadListRuntime` but every wrapper dropped it, so routing/persistence built on the settled remote thread id never fired from these hooks. only the settled remote id is emitted; the transient `__LOCALID_*` placeholder is never surfaced. ([@okisdev](https://github.com/okisdev))

- [#4474](https://github.com/assistant-ui/assistant-ui/pull/4474) [`58db391`](https://github.com/assistant-ui/assistant-ui/commit/58db391fa34d6c9c813876d5fa6b0ed118bc37b8) - refactor: adopt the shared createRuntimeExtras helper and split the accessor hooks and runtime types into hooks.ts and runtimeTypes.ts, with no public API or behavior change ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`ddc40b7`](https://github.com/assistant-ui/assistant-ui/commit/ddc40b7791563057749ecf1121e15d19574479ff), [`ea52de0`](https://github.com/assistant-ui/assistant-ui/commit/ea52de06368853b7af7ac6755b157ec5305a8494), [`29c6fdb`](https://github.com/assistant-ui/assistant-ui/commit/29c6fdbc8ede04fb2647b0a47184003ee3c2f090), [`d0987a3`](https://github.com/assistant-ui/assistant-ui/commit/d0987a32540880e5058ee529fd52a3efb4298706), [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff), [`0c51b90`](https://github.com/assistant-ui/assistant-ui/commit/0c51b905d22418b93532636b1028c080ecc819e0), [`3a8f685`](https://github.com/assistant-ui/assistant-ui/commit/3a8f685e23a3e7ad76ac41e3ce6fff05714e04d3), [`ec6adf4`](https://github.com/assistant-ui/assistant-ui/commit/ec6adf4adc91fe12c7de47fc93adcc347ece8245), [`4acd4c0`](https://github.com/assistant-ui/assistant-ui/commit/4acd4c0f608da1c62bf23a666bc0fec870a27dca)]:
  - @assistant-ui/core@0.2.19
  - @assistant-ui/store@0.2.19

## 0.0.4

### Patch Changes

- [#4422](https://github.com/assistant-ui/assistant-ui/pull/4422) [`e100f90`](https://github.com/assistant-ui/assistant-ui/commit/e100f906489f27d5193b6c8be80a6f87c5667850) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.3

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.2

### Patch Changes

- [#4368](https://github.com/assistant-ui/assistant-ui/pull/4368) [`7cadd89`](https://github.com/assistant-ui/assistant-ui/commit/7cadd89576ea47523bd495276838d57ab33a1f1d) - feat: initial `@assistant-ui/react-pi` MVP — a Pi coding-agent runtime adapter ([@AVGVSTVS96](https://github.com/AVGVSTVS96))
  - `usePiRuntime` + selector hooks (`usePiRuntimeExtras`, `usePiSession`,
    `usePiThreadState`, `usePiHostUiRequests`): thread list, streaming
    text/reasoning/tool output, mid-run steer/follow-up via Pi's native queue
    (mirrored as composer queue items with `clearQueue` restore-to-composer
    support), per-thread model/thinking controls, context usage, and Pi's
    blocking host-UI (approval) surface projected as native
    approvals/interrupts.
  - Browser-safe core: JSON-safe `PiClient` contract (`types`), pure
    snapshot-authoritative reducer (`reducePiThreadState`), pure transcript
    projection, and `PiThreadController` with optimistic echo, frame-coalesced
    stream notifications, and structural sharing of projected messages.
  - `createPiHttpClient` + SSE event source (`createSseDecoder` /
    `openPiEventStream`): the browser transport with snapshot-first reconnect.
  - `@assistant-ui/react-pi/node`: `createPiNodeClient` / `PiThreadSupervisor`,
    the process-singleton node host driving the Pi SDK — live `AgentSession`s for
    execution, read-only session-file snapshots for cold reads, and the
    `ExtensionUIContext` bridge for host-UI requests.

  See `examples/with-pi` for a complete Next.js wiring.
