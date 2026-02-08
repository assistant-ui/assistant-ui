# @assistant-ui/tap

## 0.4.6

### Patch Changes

- 2eba036: fix: use bracket notation for process.env

## 0.4.5

### Patch Changes

- a088518: chore: update dependencies

## 0.4.4

### Patch Changes

- 77af8c3: fix: runtime not responsive if loaded under React StrictMode (critial bug)

## 0.4.3

### Patch Changes

- d45b893: chore: update dependencies
- fe71bfc: feat: tapSubscribableResource hook

## 0.4.2

### Patch Changes

- 5ab3690: fix: allow optional props in resources

## 0.4.1

### Patch Changes

- 8cbf686: fix: tap should run effects after remount
- a8be364: feat: log individual errors when throwing AggregateError
- 605d825: chore: update dependencies
- fe15232: fix: tap strict mode should double invoke tapMemo calls

## 0.4.0

### Minor Changes

- feat: add StrictMode support
- feat: add tapConst
- feat: rewrite tapResources for better performance
- feat: withKey API
- feat: flushResourcesSync API
- fix: correctly unmount effects

## 0.3.6

### Patch Changes

- 3719567: chore: update deps

## 0.3.5

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages

## 0.3.4

### Patch Changes

- fix: crash on StrictMode

## 0.3.3

### Patch Changes

- bae3aa2: feat: new scheduler
- bae3aa2: feat: global flushSync
- bae3aa2: feat: align createResource API with react-dom's createRoot
- bae3aa2: feat: new tapResources API
- bae3aa2: fix: correctly unmount resources when the element passed to useResource changes
- bae3aa2: feat: better inference of unions passed to tapResource, tapResources and useResource
- e8ea57b: chore: update deps
- bae3aa2: feat: update Resource and ResourceElement types for better type inference

## 0.3.2

### Patch Changes

- 01c31fe: chore: update dependencies

## 0.3.1

### Patch Changes

- ec662cd: chore: update dependencies

## 0.3.0

### Minor Changes

- feat: added `ContravariantResource` type
- refactor: removed `Unsubscribe` type
- refactor: moved multiple types to `tapX` hook namespace

## 0.2.2

### Patch Changes

- 2c33091: chore: update deps

## 0.2.1

### Patch Changes

- 0a4bdc1: feat: renamed `ResourceElementConstructor` to `Resource`, changed `ResourceElement.type` to be `Resource` instead of `ResourceFn`

## 0.1.5

### Patch Changes

- dbc4ec7: fix: tapRef should not support callback fns
- 2fc7e99: chore: update deps

## 0.1.4

### Patch Changes

- 953db24: chore: update deps

## 0.1.3

### Patch Changes

- chore: update deps

## 0.1.2

### Patch Changes

- e6a46e4: chore: update deps

## 0.1.1

### Patch Changes

- 0534bc5: feat: Context API

## 0.1.0

### Minor Changes

- 5437dbe: feat: runtime rearchitecture (unified state API)
