# @assistant-ui/react-ag-ui

## 0.0.27

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`c7a274e`](https://github.com/assistant-ui/assistant-ui/commit/c7a274e968f8e081ded4c29cc37986392f04130e), [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836), [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a), [`974d15e`](https://github.com/assistant-ui/assistant-ui/commit/974d15e34675cc5a611f0297904f5cb2c1b3da8c), [`4b19d42`](https://github.com/assistant-ui/assistant-ui/commit/4b19d42970cb98cee6ea69e2c26dc22763091568), [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063), [`20f8404`](https://github.com/assistant-ui/assistant-ui/commit/20f8404b70098e4b7cbc8df5bbb47985ac81b52c), [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd)]:
  - @assistant-ui/core@0.1.15
  - assistant-stream@0.3.12

## 0.0.26

### Patch Changes

- 43fb4f7: fix(react-ag-ui): preserve user message attachments when converting to AG-UI format
  - `toAgUiMessages()` previously called `extractText()` for user messages, silently dropping image and file attachments
  - User messages with attachments now emit AG-UI `InputContent[]`: images map to the `image` variant with a `data` or `url` source, files map to the `binary` variant preserving `filename`
  - Falls back to plain string `content` when no binary parts are present, preserving backward compatibility

- c988db8: chore: update dependencies
- Updated dependencies [f20b9ca]
- Updated dependencies [c988db8]
  - @assistant-ui/core@0.1.14
  - assistant-stream@0.3.11

## 0.0.25

### Patch Changes

- 376bb00: chore: update dependencies
- Updated dependencies [42bc640]
- Updated dependencies [87e7761]
  - @assistant-ui/core@0.1.13

## 0.0.24

### Patch Changes

- bdce66f: chore: update dependencies
- 209ae81: chore: remove aui-source export condition from package.json exports
- Updated dependencies [dffb6b4]
- Updated dependencies [6554892]
- Updated dependencies [9103282]
- Updated dependencies [876f75d]
- Updated dependencies [bdce66f]
- Updated dependencies [4abb898]
- Updated dependencies [209ae81]
- Updated dependencies [af70d7f]
  - assistant-stream@0.3.9
  - @assistant-ui/core@0.1.10

## 0.0.23

### Patch Changes

- 52403c3: chore: update dependencies
- Updated dependencies [781f28d]
- Updated dependencies [3227e71]
- Updated dependencies [3227e71]
- Updated dependencies [0f55ce8]
- Updated dependencies [83a15f7]
- Updated dependencies [52403c3]
- Updated dependencies [ffa3a0f]
  - @assistant-ui/core@0.1.9
  - assistant-stream@0.3.8

## 0.0.22

### Patch Changes

- 736344c: chore: update dependencies
- Updated dependencies [1406aed]
- Updated dependencies [9480f30]
- Updated dependencies [28a987a]
- Updated dependencies [736344c]
- Updated dependencies [ff3be2a]
- Updated dependencies [70b19f3]
  - @assistant-ui/core@0.1.8
  - assistant-stream@0.3.7

## 0.0.21

### Patch Changes

- 349f3c7: chore: update deps
- 619d923: Depend on @assistant-ui/core instead of @assistant-ui/react
- Updated dependencies [1ed9867]
- Updated dependencies [427ffaa]
- Updated dependencies [349f3c7]
- Updated dependencies [02614aa]
- Updated dependencies [6cc4122]
- Updated dependencies [642bcda]
  - @assistant-ui/core@0.1.6
  - assistant-stream@0.3.6

## 0.0.20

### Patch Changes

- 164ff4e: fix(react-ag-ui): preserve tool message id through AgUiMessage conversion round-trip
- Updated dependencies [5ae74fe]
- Updated dependencies [8ed9d6f]
  - @assistant-ui/react@0.12.16

## 0.0.19

### Patch Changes

- a845911: chore: update dependencies
- a8983ae: fix(react-ag-ui): add REASONING\_\* event support to match @ag-ui/client v0.0.45
- c482ca2: fix(react-ag-ui): correctly import `MESSAGES_SNAPSHOT` events that include `role: "tool"` messages by normalizing them into assistant tool-call results before core conversion.
- Updated dependencies [07dcce0]
- Updated dependencies [a845911]
- Updated dependencies [bc40eaf]
- Updated dependencies [be23d74]
- Updated dependencies [1eb059c]
  - @assistant-ui/react@0.12.15

## 0.0.18

### Patch Changes

- 36ef3a2: chore: update dependencies
- 8c29377: fix(react-ag-ui): route tool results to the latest pending tool call and avoid false auto-resume triggers
- Updated dependencies [36ef3a2]
- Updated dependencies [6692226]
- Updated dependencies [c31c0fa]
- Updated dependencies [1672be8]
- Updated dependencies [28f39fe]
- Updated dependencies [3a1cb66]
- Updated dependencies [14769af]
- Updated dependencies [7c360ce]
- Updated dependencies [a638f05]
- Updated dependencies [8a78cd2]
  - assistant-stream@0.3.4
  - @assistant-ui/react@0.12.12

## 0.0.17

### Patch Changes

- 88ec552: fix(react-ag-ui): auto-resume run after frontend tool execution completes
- Updated dependencies [5bbe8a9]
- Updated dependencies [5e304ea]
- Updated dependencies [546c053]
- Updated dependencies [a7039e3]
- Updated dependencies [16c10fd]
- Updated dependencies [98c3d54]
- Updated dependencies [b181803]
- Updated dependencies [7836760]
- Updated dependencies [9276547]
- Updated dependencies [b65428e]
- Updated dependencies [af5b085]
- Updated dependencies [61b54e9]
- Updated dependencies [a094c45]
- Updated dependencies [4d7f712]
- Updated dependencies [ecc29ec]
- Updated dependencies [6e97999]
- Updated dependencies [a247fc9]
- Updated dependencies [f414af9]
- Updated dependencies [b48912c]
- Updated dependencies [93910bd]
- Updated dependencies [58a8472]
  - @assistant-ui/react@0.12.11
  - assistant-stream@0.3.3

## 0.0.16

### Patch Changes

- afaaf3b: feat(react-ag-ui): support frontend tool execution in AG-UI runtime
- Updated dependencies [afaaf3b]
- Updated dependencies [afaaf3b]
- Updated dependencies [afaaf3b]
- Updated dependencies [afaaf3b]
- Updated dependencies [51d24be]
- Updated dependencies [afaaf3b]
  - @assistant-ui/react@0.12.10

## 0.0.15

### Patch Changes

- a088518: chore: update dependencies
- Updated dependencies [a088518]
- Updated dependencies [d8122cc]
  - assistant-stream@0.3.2
  - @assistant-ui/react@0.12.9

## 0.0.14

### Patch Changes

- d45b893: chore: update dependencies
- Updated dependencies [d45b893]
- Updated dependencies [fe71bfc]
  - assistant-stream@0.3.1
  - @assistant-ui/react@0.12.5

## 0.0.13

### Patch Changes

- a888c9b: feat(react-ag-ui): add experimental switch new thread

## 0.0.12

### Patch Changes

- acbaf07: feat: add framework-agnostic `toToolsJSONSchema` and `toGenericMessages` utilities to `assistant-stream`
- Updated dependencies [07d1c65]
- Updated dependencies [b591d72]
- Updated dependencies [59a338a]
- Updated dependencies [acbaf07]
- Updated dependencies [c665612]
- Updated dependencies [0371d72]
- Updated dependencies [e8b3f34]
  - @assistant-ui/react@0.12.3
  - assistant-stream@0.3.0

## 0.0.11

### Patch Changes

- 605d825: chore: update dependencies
- Updated dependencies [1ea3e28]
- Updated dependencies [8cbf686]
- Updated dependencies [a8be364]
- Updated dependencies [605d825]
  - @assistant-ui/react@0.12.2
  - assistant-stream@0.2.48

## 0.0.10

### Patch Changes

- c7b7897: fix(react-ag-ui): load history on runtime initialization
- 7073ccc: fix(react-ag-ui): use `threadId` instead of hardcoded `main`
- Updated dependencies [6eab31e]
- Updated dependencies [9314b36]
- Updated dependencies [083ed83]
- Updated dependencies [6511990]
- Updated dependencies [a526e63]
  - @assistant-ui/react@0.11.60

## 0.0.9

### Patch Changes

- 3719567: chore: update deps
- Updated dependencies [3719567]
  - assistant-stream@0.2.47
  - @assistant-ui/react@0.11.58

## 0.0.8

### Patch Changes

- bb1b4c2: fix(react-ag-ui): add missing DictationAdapter to UseAgUiRuntimeAdapters
- Updated dependencies [ebd41c7]
- Updated dependencies [9a110ea]
- Updated dependencies [caee095]
- Updated dependencies [9883125]
  - @assistant-ui/react@0.11.57

## 0.0.7

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages
- Updated dependencies [57bd207]
- Updated dependencies [cce009d]
  - assistant-stream@0.2.46
  - @assistant-ui/react@0.11.53

## 0.0.6

### Patch Changes

- e8ea57b: chore: update deps
- Updated dependencies [bae3aa2]
- Updated dependencies [e8ea57b]
  - @assistant-ui/react@0.11.50
  - assistant-stream@0.2.45

## 0.0.5

### Patch Changes

- Updated dependencies [89aec17]
- Updated dependencies [ee7040f]
- Updated dependencies [bd27465]
- Updated dependencies [a3e9549]
- Updated dependencies [206616b]
- Updated dependencies [7aa77b5]
  - assistant-stream@0.2.44
  - @assistant-ui/react@0.11.49

## 0.0.4

### Patch Changes

- 01c31fe: chore: update dependencies
- Updated dependencies [ba26b22]
- Updated dependencies [d169e4f]
- Updated dependencies [da9f8a6]
- Updated dependencies [01c31fe]
  - @assistant-ui/react@0.11.48
  - assistant-stream@0.2.43

## 0.0.3

### Patch Changes

- ec662cd: chore: update dependencies
- Updated dependencies [ec662cd]
  - assistant-stream@0.2.42
  - @assistant-ui/react@0.11.45

## 0.0.2

### Patch Changes

- 2c33091: chore: update deps
- Updated dependencies [2c33091]
  - assistant-stream@0.2.41
  - @assistant-ui/react@0.11.40

## 0.0.1

### Patch Changes

- Updated dependencies [ef58020]
  - assistant-stream@0.2.40
