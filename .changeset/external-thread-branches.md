---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: branch switching for the ExternalThread client

`ExternalThread` accepts an optional `branches` adapter (`ExternalThreadBranchAdapter` in `@assistant-ui/core`, re-exported from `@assistant-ui/react`): `getBranches(messageId)` returns ordered sibling branch ids and `switchToBranch(branchId)` makes a sibling visible by swapping the `messages` array. messages with more than one sibling get real `branchNumber`/`branchCount`, which is what shows the branch picker; `capabilities.switchToBranch` is set for parity with the legacy external store. without the adapter, behavior is unchanged.
