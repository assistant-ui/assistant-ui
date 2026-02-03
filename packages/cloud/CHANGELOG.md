# assistant-cloud

## 0.1.16

### Patch Changes

- d45b893: chore: update dependencies
- Updated dependencies [d45b893]
  - assistant-stream@0.3.1

## 0.1.15

### Patch Changes

- Updated dependencies [acbaf07]
  - assistant-stream@0.3.0

## 0.1.14

### Patch Changes

- 605d825: chore: update dependencies
- Updated dependencies [605d825]
  - assistant-stream@0.2.48

## 0.1.13

### Patch Changes

- 3719567: chore: update deps
- Updated dependencies [3719567]
  - assistant-stream@0.2.47

## 0.1.12

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages
- Updated dependencies [57bd207]
- Updated dependencies [cce009d]
  - assistant-stream@0.2.46

## 0.1.11

### Patch Changes

- e8ea57b: chore: update deps
- Updated dependencies [e8ea57b]
  - assistant-stream@0.2.45

## 0.1.10

### Patch Changes

- 01c31fe: chore: update dependencies
- Updated dependencies [01c31fe]
  - assistant-stream@0.2.43

## 0.1.9

### Patch Changes

- ec662cd: chore: update dependencies
- Updated dependencies [ec662cd]
  - assistant-stream@0.2.42

## 0.1.8

### Patch Changes

- 2c33091: chore: update deps
- Updated dependencies [2c33091]
  - assistant-stream@0.2.41

## 0.1.7

### Patch Changes

- 4e3877e: feat: Add thread fetching capability to remote thread list adapter
  - Add `fetch` method to `RemoteThreadListAdapter` interface
  - Implement `fetch` in cloud adapter to retrieve individual threads
  - Enhance `switchToThread` to automatically fetch and load threads not present in the current list
  - Add `get` method to `AssistantCloudThreads` for individual thread retrieval

## 0.1.6

### Patch Changes

- 2fc7e99: chore: update deps
- Updated dependencies [2fc7e99]
  - assistant-stream@0.2.39

## 0.1.5

### Patch Changes

- 953db24: chore: update deps
- Updated dependencies [953db24]
  - assistant-stream@0.2.37

## 0.1.4

### Patch Changes

- chore: update deps
- Updated dependencies
  - assistant-stream@0.2.36

## 0.1.3

### Patch Changes

- e6a46e4: chore: update deps
- Updated dependencies [e6a46e4]
  - assistant-stream@0.2.34

## 0.1.2

### Patch Changes

- 8812f86: chore: update deps
- Updated dependencies [8812f86]
  - assistant-stream@0.2.30

## 0.1.1

### Patch Changes

- 12e0a77: chore: update deps
- Updated dependencies [12e0a77]
  - assistant-stream@0.2.23

## 0.1.0

### Minor Changes

- 179f8b7: Add format parameter support to assistant-cloud client library
  - Add optional `format` query parameter to `AssistantCloudThreadMessages.list()` method
  - Update cloud history adapter to pass format parameter when loading messages
  - Enables backend-level message format conversion when supported by the cloud backend

## 0.0.4

### Patch Changes

- 0f063e0: chore: update dependencies
- Updated dependencies [0f063e0]
  - assistant-stream@0.2.22

## 0.0.3

### Patch Changes

- 65b3ff1: chore: update deps
- Updated dependencies [65b3ff1]
  - assistant-stream@0.2.18

## 0.0.2

### Patch Changes

- 644abb8: chore: update deps
- Updated dependencies [644abb8]
  - assistant-stream@0.2.17
