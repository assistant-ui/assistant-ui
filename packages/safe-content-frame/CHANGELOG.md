# safe-content-frame

## 0.0.29

### Patch Changes

- [#6604](https://github.com/assistant-ui/assistant-ui/pull/6604) [`6083062`](https://github.com/assistant-ui/assistant-ui/commit/6083062b425c77278728c5a89ef79e0d4a4e4e8a) - fix: tell a missing shim, a shim that failed to start, and a slow render apart ([@rupic-app](https://github.com/apps/rupic-app))

- [#6615](https://github.com/assistant-ui/assistant-ui/pull/6615) [`e7bcf83`](https://github.com/assistant-ui/assistant-ui/commit/e7bcf83c4c5d176ee3bafa8d9dd04b26b1fde772) - feat: name why a frame failed to load with a `code` on the rejection, narrowed by the new `isShimLoadError` guard ([@okisdev](https://github.com/okisdev))

## 0.0.28

### Patch Changes

- [#6305](https://github.com/assistant-ui/assistant-ui/pull/6305) [`e96d3de`](https://github.com/assistant-ui/assistant-ui/commit/e96d3dea9370159e04f82bf4eb39d6b1b1c4d21d) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.0.27

### Patch Changes

- [#5723](https://github.com/assistant-ui/assistant-ui/pull/5723) [`94dc3e5`](https://github.com/assistant-ui/assistant-ui/commit/94dc3e509fa2b4fae1a14c88ec34b910c8d95af8) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.0.26

### Patch Changes

- [#5539](https://github.com/assistant-ui/assistant-ui/pull/5539) [`71231d3`](https://github.com/assistant-ui/assistant-ui/commit/71231d3ee52ef094c5b04b4d040714f9a409ecab) - fix: surface iframe content load errors instead of reporting a timeout ([@Kinfe123](https://github.com/Kinfe123))

## 0.0.25

### Patch Changes

- [#5208](https://github.com/assistant-ui/assistant-ui/pull/5208) [`a0ddc86`](https://github.com/assistant-ui/assistant-ui/commit/a0ddc862b0c506bd791238ebf800868e4836820a) - Adopt `erasableSyntaxOnly`; public enums are now `as const` objects. ([@Yonom](https://github.com/Yonom))

## 0.0.24

### Patch Changes

- [#5096](https://github.com/assistant-ui/assistant-ui/pull/5096) [`7492368`](https://github.com/assistant-ui/assistant-ui/commit/7492368638500f23f4baf9c62d730b479a5f4978) - fix: clean up frame resources after disposal and load failures ([@Kinfe123](https://github.com/Kinfe123))

- [#5079](https://github.com/assistant-ui/assistant-ui/pull/5079) [`390e417`](https://github.com/assistant-ui/assistant-ui/commit/390e4177ca47f7ece839613ad0f076add9313328) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.23

### Patch Changes

- [#4746](https://github.com/assistant-ui/assistant-ui/pull/4746) [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4815](https://github.com/assistant-ui/assistant-ui/pull/4815) [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.0.22

### Patch Changes

- [#4608](https://github.com/assistant-ui/assistant-ui/pull/4608) [`a7b06f7`](https://github.com/assistant-ui/assistant-ui/commit/a7b06f76876078fc2fcbb92a86fa0e1530fde782) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

## 0.0.21

### Patch Changes

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.20

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.19

### Patch Changes

- Guard the iframe `onload` handler against firing twice. When the browser fires `load` for both the initial about:blank and the navigated shim URL, the second invocation tried to transfer an already-transferred `MessagePort`, throwing `"Failed to execute 'postMessage' on 'Window': Port at index 0 is already neutered."` and leaving the real shim without a working back-channel (breaking auto-resize and any other host↔widget messaging).

## 0.0.18

### Patch Changes

- [#3885](https://github.com/assistant-ui/assistant-ui/pull/3885) [`eddd892`](https://github.com/assistant-ui/assistant-ui/commit/eddd8927404cbe05470979cfa6d4b5f87c270daa) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.17

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.16

### Patch Changes

- c988db8: chore: update dependencies

## 0.0.15

### Patch Changes

- 376bb00: chore: update dependencies

## 0.0.14

### Patch Changes

- bdce66f: chore: update dependencies
- 209ae81: chore: remove aui-source export condition from package.json exports

## 0.0.13

### Patch Changes

- 52403c3: chore: update dependencies

## 0.0.12

### Patch Changes

- c71cb58: chore: update dependencies

## 0.0.11

### Patch Changes

- 349f3c7: chore: update deps

## 0.0.10

### Patch Changes

- 36ef3a2: chore: update dependencies

## 0.0.9

### Patch Changes

- a088518: chore: update dependencies

## 0.0.8

### Patch Changes

- d45b893: chore: update dependencies

## 0.0.7

### Patch Changes

- 605d825: chore: update dependencies

## 0.0.6

### Patch Changes

- 3719567: chore: update deps

## 0.0.5

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages

## 0.0.4

### Patch Changes

- e8ea57b: chore: update deps

## 0.0.3

### Patch Changes

- 01c31fe: chore: update dependencies
