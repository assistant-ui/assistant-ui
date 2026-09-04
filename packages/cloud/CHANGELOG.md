# assistant-cloud

## 0.1.43

### Patch Changes

- [#6472](https://github.com/assistant-ui/assistant-ui/pull/6472) [`99fd86e`](https://github.com/assistant-ui/assistant-ui/commit/99fd86ec6d8a94e7723ed738a086620bd9c5a38b) - fix: coordinate anonymous authentication across Cloud client instances ([@Kinfe123](https://github.com/Kinfe123))

- [#6487](https://github.com/assistant-ui/assistant-ui/pull/6487) [`7f7bd54`](https://github.com/assistant-ui/assistant-ui/commit/7f7bd54a2b707d2d1e9bc663f7cd8862dcfca50e) - fix: coordinate anonymous authentication across browser tabs ([@rupic-app](https://github.com/apps/rupic-app))

- [#6626](https://github.com/assistant-ui/assistant-ui/pull/6626) [`5972a5e`](https://github.com/assistant-ui/assistant-ui/commit/5972a5ea8e9c4bf188196f2aacd019b78639575e) - fix: deduplicate concurrent message appends while parent persistence is pending ([@Kinfe123](https://github.com/Kinfe123))

- [#6528](https://github.com/assistant-ui/assistant-ui/pull/6528) [`152a35d`](https://github.com/assistant-ui/assistant-ui/commit/152a35daae0e80b5307865e59af683c4ae720794) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#6502](https://github.com/assistant-ui/assistant-ui/pull/6502) [`d9eae73`](https://github.com/assistant-ui/assistant-ui/commit/d9eae7321e61b93486d57aa8e172d043bfb1d8c6) - fix: abort Cloud authentication token requests after their deadline ([@Kinfe123](https://github.com/Kinfe123))

- [#6701](https://github.com/assistant-ui/assistant-ui/pull/6701) [`d56a66a`](https://github.com/assistant-ui/assistant-ui/commit/d56a66a6d325d6e64abbc405dae204b4ee1dfc1e) - fix: report cached and reasoning tokens from the AI SDK v7 token details ([@okisdev](https://github.com/okisdev))
- Updated dependencies [[`46fad14`](https://github.com/assistant-ui/assistant-ui/commit/46fad145974a890cd18f7fc2df54e9d0bf36b0fb), [`f0d0aa2`](https://github.com/assistant-ui/assistant-ui/commit/f0d0aa2f87b9d881f7003bf6132bbb519509b36b), [`5bdd416`](https://github.com/assistant-ui/assistant-ui/commit/5bdd416af4379a2cc86c12292e06a6e3ce5fcdb9), [`e53299b`](https://github.com/assistant-ui/assistant-ui/commit/e53299be07fd69bd5d64a2f50bd3561d85dc47cc)]:
  - assistant-stream@0.3.41

## 0.1.42

### Patch Changes

- [#6255](https://github.com/assistant-ui/assistant-ui/pull/6255) [`0f0ebb6`](https://github.com/assistant-ui/assistant-ui/commit/0f0ebb6eb56a15d4976336839d2d74780e3bad4c) - fix: surface the response text when a JSON error body has no message ([@Kinfe123](https://github.com/Kinfe123))

- [#6262](https://github.com/assistant-ui/assistant-ui/pull/6262) [`5a3e9f7`](https://github.com/assistant-ui/assistant-ui/commit/5a3e9f7c26c85af640a806fa8174508cbf3fb031) - refactor: move the run report tool call shape and its serialization into assistant-cloud ([@okisdev](https://github.com/okisdev))

- [#6254](https://github.com/assistant-ui/assistant-ui/pull/6254) [`d24bcb2`](https://github.com/assistant-ui/assistant-ui/commit/d24bcb27a92701f614b10fd113941591d609ab1f) - fix: keep telemetry enabled when config carries an undefined enabled ([@Kinfe123](https://github.com/Kinfe123))

- [#6340](https://github.com/assistant-ui/assistant-ui/pull/6340) [`7adf047`](https://github.com/assistant-ui/assistant-ui/commit/7adf047d12e56d1e8faab67364b99fa0f3f38e39) - refactor: provide thread title generation from assistant-cloud; cloud-ai-sdk keeps only the format-specific half. ([@okisdev](https://github.com/okisdev))

- [#6264](https://github.com/assistant-ui/assistant-ui/pull/6264) [`1743d19`](https://github.com/assistant-ui/assistant-ui/commit/1743d1996e87421bba7f559f47673d695d3ecf30) - fix: clamp pre-serialized run telemetry arguments ([@rupic-app](https://github.com/apps/rupic-app))

- [#6305](https://github.com/assistant-ui/assistant-ui/pull/6305) [`e96d3de`](https://github.com/assistant-ui/assistant-ui/commit/e96d3dea9370159e04f82bf4eb39d6b1b1c4d21d) - chore: update dependencies ([@okisdev](https://github.com/okisdev))
- Updated dependencies [[`8626c1f`](https://github.com/assistant-ui/assistant-ui/commit/8626c1ffe1c6d56ec75073e795aa9fbf7493c3ed), [`531f61a`](https://github.com/assistant-ui/assistant-ui/commit/531f61a4d2f5fcee16821a6401d9d11394bf8339), [`dfaa94f`](https://github.com/assistant-ui/assistant-ui/commit/dfaa94fca3ecdd8b0b0ab202f08dafd03c1e2ed5), [`a4bc54a`](https://github.com/assistant-ui/assistant-ui/commit/a4bc54afa976423b6310a2d5be350df0f3b41e42), [`fd471e9`](https://github.com/assistant-ui/assistant-ui/commit/fd471e94babf7b6580e06bbea2b7a8cdd4882869), [`ac7ec15`](https://github.com/assistant-ui/assistant-ui/commit/ac7ec15e118a9279dd60521b839ecc38983675c5), [`e96d3de`](https://github.com/assistant-ui/assistant-ui/commit/e96d3dea9370159e04f82bf4eb39d6b1b1c4d21d), [`f96e22f`](https://github.com/assistant-ui/assistant-ui/commit/f96e22ffa8c85cbfc4a878db4f371c510070066d), [`bfc8bef`](https://github.com/assistant-ui/assistant-ui/commit/bfc8bef9f1ee6cb4cb25f83488a0e4ce1a393ff3), [`2cd5cbc`](https://github.com/assistant-ui/assistant-ui/commit/2cd5cbcf78c586b7557421b00e9c996c62bd7f43), [`105af3e`](https://github.com/assistant-ui/assistant-ui/commit/105af3eaea2093df271d9c44642e1c04d5f5cf7c), [`4c3194a`](https://github.com/assistant-ui/assistant-ui/commit/4c3194aca4470753a2a37e244cb5e3fb27cbc76b)]:
  - assistant-stream@0.3.40

## 0.1.41

### Patch Changes

- [#5953](https://github.com/assistant-ui/assistant-ui/pull/5953) [`bd01e8b`](https://github.com/assistant-ui/assistant-ui/commit/bd01e8bd38493565727644326997e1dd0c817d90) - fix: scope anonymous refresh tokens by Cloud backend ([@Kinfe123](https://github.com/Kinfe123))

- [#5984](https://github.com/assistant-ui/assistant-ui/pull/5984) [`4a2a76f`](https://github.com/assistant-ui/assistant-ui/commit/4a2a76f8ef3a9bb4d61e84e834bf22868c54b200) - fix: validate file API responses before returning them to consumers ([@Kinfe123](https://github.com/Kinfe123))

- [#5941](https://github.com/assistant-ui/assistant-ui/pull/5941) [`04e967c`](https://github.com/assistant-ui/assistant-ui/commit/04e967cb32eaea5c265533d3616845639dfcf3a2) - fix: preserve anonymous identities when token refresh fails transiently ([@Kinfe123](https://github.com/Kinfe123))

- [#5997](https://github.com/assistant-ui/assistant-ui/pull/5997) [`d79b87d`](https://github.com/assistant-ui/assistant-ui/commit/d79b87df08d4a7684831e1fa4a2ba8acea3938ff) - fix: validate auth token responses ([@rupic-app](https://github.com/apps/rupic-app))

- [#5954](https://github.com/assistant-ui/assistant-ui/pull/5954) [`645c56b`](https://github.com/assistant-ui/assistant-ui/commit/645c56bedafc493c022b782724e44872f9b6e4a9) - fix: validate Cloud run stream response bodies and content types ([@Kinfe123](https://github.com/Kinfe123))

- [#5774](https://github.com/assistant-ui/assistant-ui/pull/5774) [`61d29f4`](https://github.com/assistant-ui/assistant-ui/commit/61d29f4157b525d3e36ac721d1fcef7d1baf987e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#5738](https://github.com/assistant-ui/assistant-ui/pull/5738) [`72a6272`](https://github.com/assistant-ui/assistant-ui/commit/72a6272434a1e5964047c7158c49db37295e5f4e) - fix: validate thread, message, and run IDs returned by Cloud mutations ([@Kinfe123](https://github.com/Kinfe123))
- Updated dependencies [[`0e91e27`](https://github.com/assistant-ui/assistant-ui/commit/0e91e277ebe218e891d1c318a18eec230ee4f981), [`c5bc8ed`](https://github.com/assistant-ui/assistant-ui/commit/c5bc8ed0c78e8fb66a6c21c596765caeccef3aec), [`f0d1d48`](https://github.com/assistant-ui/assistant-ui/commit/f0d1d48842b61c8f781771375e3893d189321c2d), [`ab7f49f`](https://github.com/assistant-ui/assistant-ui/commit/ab7f49fcb91b8a9d96408426da3259c99f619649), [`61d29f4`](https://github.com/assistant-ui/assistant-ui/commit/61d29f4157b525d3e36ac721d1fcef7d1baf987e), [`a2ab997`](https://github.com/assistant-ui/assistant-ui/commit/a2ab997dc645923fa8ebbca5e8e050d467a69cf4), [`e8997d9`](https://github.com/assistant-ui/assistant-ui/commit/e8997d922d15d0de0d20558ce0735fa3e844f27f), [`44e574f`](https://github.com/assistant-ui/assistant-ui/commit/44e574f8c17dd5603933ec74821eecd08e94e371), [`14c3b5a`](https://github.com/assistant-ui/assistant-ui/commit/14c3b5a25afe2b2f37760dfe8003818b2e4f72d3)]:
  - assistant-stream@0.3.38

## 0.1.40

### Patch Changes

- [#5715](https://github.com/assistant-ui/assistant-ui/pull/5715) [`8bba3aa`](https://github.com/assistant-ui/assistant-ui/commit/8bba3aaadcae042b4750436e6aa62bbba4815dde) - fix: include archived Cloud threads when requested and preserve archive filters ([@Kinfe123](https://github.com/Kinfe123))

## 0.1.39

### Patch Changes

- [#5723](https://github.com/assistant-ui/assistant-ui/pull/5723) [`94dc3e5`](https://github.com/assistant-ui/assistant-ui/commit/94dc3e509fa2b4fae1a14c88ec34b910c8d95af8) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`94dc3e5`](https://github.com/assistant-ui/assistant-ui/commit/94dc3e509fa2b4fae1a14c88ec34b910c8d95af8)]:
  - assistant-stream@0.3.36

## 0.1.38

### Patch Changes

- [#5555](https://github.com/assistant-ui/assistant-ui/pull/5555) [`6c062f1`](https://github.com/assistant-ui/assistant-ui/commit/6c062f1b2a7c362fa7eb1b4fecc59c748588cb1a) - fix: validate successful anonymous authentication responses before use ([@Kinfe123](https://github.com/Kinfe123))

  Malformed successful responses now throw a `CloudResponseError` instead of persisting invalid refresh-token data or failing during JWT parsing.

- Updated dependencies [[`78943a3`](https://github.com/assistant-ui/assistant-ui/commit/78943a37b1006bfbee42596f838850cd96ab4566)]:
  - assistant-stream@0.3.33

## 0.1.37

### Patch Changes

- [#5208](https://github.com/assistant-ui/assistant-ui/pull/5208) [`a0ddc86`](https://github.com/assistant-ui/assistant-ui/commit/a0ddc862b0c506bd791238ebf800868e4836820a) - Adopt `erasableSyntaxOnly`; public enums are now `as const` objects. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`f9c1b0f`](https://github.com/assistant-ui/assistant-ui/commit/f9c1b0fec5ac4cae09c1c9da77f901c0799140ad), [`235c17e`](https://github.com/assistant-ui/assistant-ui/commit/235c17e22acae8a643c583905f3bf90955651794), [`a0ddc86`](https://github.com/assistant-ui/assistant-ui/commit/a0ddc862b0c506bd791238ebf800868e4836820a), [`06f5266`](https://github.com/assistant-ui/assistant-ui/commit/06f5266bf8d7d347020c113c089b199b182a0099), [`d319637`](https://github.com/assistant-ui/assistant-ui/commit/d319637df1297b7aa589a77ff268467270a85386)]:
  - assistant-stream@0.3.28

## 0.1.36

### Patch Changes

- [#5126](https://github.com/assistant-ui/assistant-ui/pull/5126) [`0d0834d`](https://github.com/assistant-ui/assistant-ui/commit/0d0834d77967eb3f68198c48597a3bb9c6f474cb) - fix: refresh Cloud history persistence when the Cloud client changes ([@Kinfe123](https://github.com/Kinfe123))

- [#5157](https://github.com/assistant-ui/assistant-ui/pull/5157) [`3f90440`](https://github.com/assistant-ui/assistant-ui/commit/3f90440a45d8b7bc11745a1d3cf242d4f40934ed) - fix: deduplicate concurrent Cloud authentication requests ([@Kinfe123](https://github.com/Kinfe123))

- [#4846](https://github.com/assistant-ui/assistant-ui/pull/4846) [`ccebbf9`](https://github.com/assistant-ui/assistant-ui/commit/ccebbf9317c04e1f93dd6141544e8811b42a0154) - fix: normalize Cloud base URLs across authentication modes ([@Kinfe123](https://github.com/Kinfe123))

- [#4773](https://github.com/assistant-ui/assistant-ui/pull/4773) [`85d7c25`](https://github.com/assistant-ui/assistant-ui/commit/85d7c251a9846422f693dcd9ac7c727ed22e6d09) - feat: add cloud.projects.threads.list() and cloud.projects.threads.messages.list() for project-wide thread and message export ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#5017](https://github.com/assistant-ui/assistant-ui/pull/5017) [`23a9925`](https://github.com/assistant-ui/assistant-ui/commit/23a9925415b92e9138e6f5e07755b89a0f17468f) - fix: thread and message responses are now decoded to match their published types ([@Kinfe123](https://github.com/Kinfe123))

  - timestamps are real `Date` objects (previously raw strings at runtime)
  - `threads.get()` returns the thread (previously the raw `{ thread }` envelope)
  - malformed responses now throw instead of passing through

- [#5058](https://github.com/assistant-ui/assistant-ui/pull/5058) [`7fde141`](https://github.com/assistant-ui/assistant-ui/commit/7fde141c094d122034804f9b9e19b4f17fb516ba) - fix(assistant-cloud): warn when an update targets a message without a remote id ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`8630186`](https://github.com/assistant-ui/assistant-ui/commit/8630186c86f651bd5e3db9901de14b3feff073ec), [`446a118`](https://github.com/assistant-ui/assistant-ui/commit/446a1187d38f3ca8ce12b1f0ac739400cb32d63e), [`a081656`](https://github.com/assistant-ui/assistant-ui/commit/a0816568bcb0632a67f6e09dc0c90e76cc2b50cc), [`25a5be0`](https://github.com/assistant-ui/assistant-ui/commit/25a5be0c8b7101a382ee7fc31102bdf4fb7ad114), [`47562fd`](https://github.com/assistant-ui/assistant-ui/commit/47562fd231b35fe41c61b437ff66021f9cf0e554), [`5e4dd9f`](https://github.com/assistant-ui/assistant-ui/commit/5e4dd9fd00161fd79df60821d2b9af0cd7ebcefd), [`5da0d93`](https://github.com/assistant-ui/assistant-ui/commit/5da0d93808089b9fca35667ab442dff196de46b8), [`85d4976`](https://github.com/assistant-ui/assistant-ui/commit/85d49764ca3585fc553257dafa00a47830727e36), [`5135400`](https://github.com/assistant-ui/assistant-ui/commit/5135400d054297889312b9ae03fe803443ee2fae), [`9a343db`](https://github.com/assistant-ui/assistant-ui/commit/9a343db871ceab7e574bfcec9ab22af0ddaf1841), [`666aaab`](https://github.com/assistant-ui/assistant-ui/commit/666aaab6ac3a64ec0f58c3ae958186a9880d8764), [`ba948d8`](https://github.com/assistant-ui/assistant-ui/commit/ba948d8192b8c4bf12cbe60ece4d0f2d11506aa6), [`44aac58`](https://github.com/assistant-ui/assistant-ui/commit/44aac5834cff3a4f985b3b0aefe31c8b7951732f), [`9402648`](https://github.com/assistant-ui/assistant-ui/commit/94026488709d1fcc4ed446f39e2dcb78f9eb1daf), [`4651ea5`](https://github.com/assistant-ui/assistant-ui/commit/4651ea5b003bcd56d82e0bb3de16f918d6722906), [`2bc6798`](https://github.com/assistant-ui/assistant-ui/commit/2bc6798346378fd6c1f8b7e8423fda162d7f3a27)]:
  - assistant-stream@0.3.27

## 0.1.35

### Patch Changes

- [#4732](https://github.com/assistant-ui/assistant-ui/pull/4732) [`0ea628f`](https://github.com/assistant-ui/assistant-ui/commit/0ea628fedba37d2e95195e250c60129d43af213c) - feat: expose CloudAPIError with the HTTP status on failed requests ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4870](https://github.com/assistant-ui/assistant-ui/pull/4870) [`7cf5acc`](https://github.com/assistant-ui/assistant-ui/commit/7cf5acc8ae31bc01102d170b854aaaf7c260eff9) - fix: guard localStorage access in anonymous auth strategy ([@okisdev](https://github.com/okisdev))

- [#4811](https://github.com/assistant-ui/assistant-ui/pull/4811) [`7a85307`](https://github.com/assistant-ui/assistant-ui/commit/7a85307390287a341618ac58b8967395df38a56b) - fix: handle empty successful Cloud API responses ([@Kinfe123](https://github.com/Kinfe123))

- [#4807](https://github.com/assistant-ui/assistant-ui/pull/4807) [`e4da8c5`](https://github.com/assistant-ui/assistant-ui/commit/e4da8c57e259e7276570ff05ea605e59321b1a3f) - fix: await auth headers when initializing Assistant Cloud auth ([@Kinfe123](https://github.com/Kinfe123))

- [#4746](https://github.com/assistant-ui/assistant-ui/pull/4746) [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4815](https://github.com/assistant-ui/assistant-ui/pull/4815) [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`43b8ce8`](https://github.com/assistant-ui/assistant-ui/commit/43b8ce862520e1f53d837407c5fcd7106c9ffd7c), [`1e926b6`](https://github.com/assistant-ui/assistant-ui/commit/1e926b68a8f61d5d099a53c89ad25b168872b853), [`d6c7571`](https://github.com/assistant-ui/assistant-ui/commit/d6c757149df4cc66aa3261a3bd3beb041cac6c49), [`4d7a447`](https://github.com/assistant-ui/assistant-ui/commit/4d7a4479b2dd673e3f5a356c4dd763f3aa72053d), [`ca751f4`](https://github.com/assistant-ui/assistant-ui/commit/ca751f41905a82e9b1622d100af62b8b31314a5c), [`38bf104`](https://github.com/assistant-ui/assistant-ui/commit/38bf1045406da7eff1b9c5847e4e7db96d327c2c), [`19b2a00`](https://github.com/assistant-ui/assistant-ui/commit/19b2a00add7f1900bc3fed579759400fc241747c), [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98), [`c2d2271`](https://github.com/assistant-ui/assistant-ui/commit/c2d2271b9709c235da18036a0edd5283ce279916), [`84e8ddf`](https://github.com/assistant-ui/assistant-ui/commit/84e8ddf548d808d74d84b6be5a8ed28642baad3d), [`d03e5cf`](https://github.com/assistant-ui/assistant-ui/commit/d03e5cf0e6efada832503fedc565a1fb8f14676a), [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac)]:
  - assistant-stream@0.3.26

## 0.1.34

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff)]:
  - assistant-stream@0.3.24

## 0.1.33

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d)]:
  - assistant-stream@0.3.23

## 0.1.32

### Patch Changes

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc)]:
  - assistant-stream@0.3.21

## 0.1.31

### Patch Changes

- [#4198](https://github.com/assistant-ui/assistant-ui/pull/4198) [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`cba2b42`](https://github.com/assistant-ui/assistant-ui/commit/cba2b42c26083e730ae07194186ab4473f9f4cf3), [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab), [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb)]:
  - assistant-stream@0.3.20

## 0.1.30

### Patch Changes

- [#4128](https://github.com/assistant-ui/assistant-ui/pull/4128) [`331f2f7`](https://github.com/assistant-ui/assistant-ui/commit/331f2f7f432285fd0cdc14e0862b550e5d15769e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d), [`c4d3eea`](https://github.com/assistant-ui/assistant-ui/commit/c4d3eeac6907a2fc15718f3c710d73d24eaeb652)]:
  - assistant-stream@0.3.18

## 0.1.29

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`13a12c4`](https://github.com/assistant-ui/assistant-ui/commit/13a12c46c94f7e5e62af02692cf3479fff48bd02), [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154)]:
  - assistant-stream@0.3.16

## 0.1.28

### Patch Changes

- [#4041](https://github.com/assistant-ui/assistant-ui/pull/4041) [`845c7c1`](https://github.com/assistant-ui/assistant-ui/commit/845c7c12fecbb448da7f1135c33163b653a50710) - feat(cloud): allow custom `baseUrl` with API key auth. Previously the apiKey config branch hard-coded `https://backend.assistant-api.com`; you can now pass `baseUrl` to point an apiKey-authenticated `AssistantCloud` at a self-hosted or staging backend. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33)]:
  - assistant-stream@0.3.15

## 0.1.27

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6)]:
  - assistant-stream@0.3.12

## 0.1.26

### Patch Changes

- c988db8: chore: update dependencies
- Updated dependencies [c988db8]
  - assistant-stream@0.3.11

## 0.1.25

### Patch Changes

- 376bb00: chore: update dependencies

## 0.1.24

### Patch Changes

- bdce66f: chore: update dependencies
- 209ae81: chore: remove aui-source export condition from package.json exports
- Updated dependencies [dffb6b4]
- Updated dependencies [9103282]
- Updated dependencies [bdce66f]
- Updated dependencies [209ae81]
  - assistant-stream@0.3.9

## 0.1.23

### Patch Changes

- 52403c3: chore: update dependencies
- Updated dependencies [3227e71]
- Updated dependencies [52403c3]
  - assistant-stream@0.3.8

## 0.1.22

### Patch Changes

- 349f3c7: chore: update deps
- Updated dependencies [427ffaa]
- Updated dependencies [349f3c7]
- Updated dependencies [02614aa]
  - assistant-stream@0.3.6

## 0.1.21

### Patch Changes

- a845911: chore: update dependencies

## 0.1.20

### Patch Changes

- 17cf9a8: feat(telemetry): add reasoning/cached token usage across cloud reporting paths

## 0.1.19

### Patch Changes

- 36ef3a2: chore: update dependencies
- Updated dependencies [36ef3a2]
  - assistant-stream@0.3.4

## 0.1.18

### Patch Changes

- d08a488: Preserve CloudAPIError instances from AssistantCloudAPI error responses.
- 5e304ea: feat: client-side run telemetry reporting with `beforeReport` hook
- af5b085: feat(assistant-cloud): support MCP tool observability
- a247fc9: feat(assistant-cloud): allow save complete multi-step message
- 93910bd: Rename .tsx files to .ts where no JSX syntax is used
- 58a8472: feat: Add standalone AI SDK hooks for cloud persistence without assistant-ui

  New `@assistant-ui/cloud-ai-sdk` package with `useCloudChat` and `useThreads` hooks. Wraps AI SDK's `useChat` with automatic message persistence, thread management, and auto-title generation.

- Updated dependencies [61b54e9]
- Updated dependencies [93910bd]
  - assistant-stream@0.3.3

## 0.1.17

### Patch Changes

- a088518: chore: update dependencies
- Updated dependencies [a088518]
  - assistant-stream@0.3.2

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
