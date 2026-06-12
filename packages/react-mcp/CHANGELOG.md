# @assistant-ui/react-mcp

## 0.0.10

### Patch Changes

- Updated dependencies [[`ab8e5bc`](https://github.com/assistant-ui/assistant-ui/commit/ab8e5bc8650b1e39c8f01ab6c0efb80aa8baf723), [`59d252f`](https://github.com/assistant-ui/assistant-ui/commit/59d252fa09c1511acd7e31c9d8178514c5a5cb77), [`feecac3`](https://github.com/assistant-ui/assistant-ui/commit/feecac38c6ba0f8f30ec356376d1d6b19188e08f), [`3e58253`](https://github.com/assistant-ui/assistant-ui/commit/3e5825369c7206f4df3532d5fabfbe5cf5e4fd40), [`12b016b`](https://github.com/assistant-ui/assistant-ui/commit/12b016bd14560c847dadae075edb57631ac9c516), [`3e58253`](https://github.com/assistant-ui/assistant-ui/commit/3e5825369c7206f4df3532d5fabfbe5cf5e4fd40), [`5a4f20e`](https://github.com/assistant-ui/assistant-ui/commit/5a4f20e75dcd93aeb70a4a5582a0a5a1f870b4f2), [`f10b8ae`](https://github.com/assistant-ui/assistant-ui/commit/f10b8ae6659ed8df8b0c25b5bb2bb8cfa7d7a718), [`1fb5862`](https://github.com/assistant-ui/assistant-ui/commit/1fb586241534064fa48e3498f422bdaa7f382139)]:
  - @assistant-ui/core@0.2.14
  - @assistant-ui/store@0.2.16
  - @assistant-ui/tap@0.7.1

## 0.0.9

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

- Updated dependencies [[`60ef0e9`](https://github.com/assistant-ui/assistant-ui/commit/60ef0e9ed26ceab722468332ff93c4751cc631fb), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b)]:
  - @assistant-ui/core@0.2.13
  - @assistant-ui/tap@0.6.2
  - @assistant-ui/store@0.2.15

## 0.0.8

### Patch Changes

- Updated dependencies [[`5e1151e`](https://github.com/assistant-ui/assistant-ui/commit/5e1151e83ea3700edee9b1552f2e410b860b0afe)]:
  - @assistant-ui/tap@0.6.1
  - @assistant-ui/core@0.2.11
  - @assistant-ui/store@0.2.14

## 0.0.7

### Patch Changes

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`2a84174`](https://github.com/assistant-ui/assistant-ui/commit/2a8417422996920c4a58be80eddc1c1740158518), [`a0a0769`](https://github.com/assistant-ui/assistant-ui/commit/a0a076915dafdb7152c9fde75b40cfddebcb2676), [`19c5b5f`](https://github.com/assistant-ui/assistant-ui/commit/19c5b5f3b1616a82ddfa928325c5e02c5786e867), [`dbdfb15`](https://github.com/assistant-ui/assistant-ui/commit/dbdfb15e8b609d3886c71fedb25a9d8345e5fc3c), [`ca191dc`](https://github.com/assistant-ui/assistant-ui/commit/ca191dc63f4a63c7d3f98566e9febd7d7f857aec), [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc), [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60), [`01cf957`](https://github.com/assistant-ui/assistant-ui/commit/01cf957c209b1a58c69f5621565397de6d1eb794), [`01cf957`](https://github.com/assistant-ui/assistant-ui/commit/01cf957c209b1a58c69f5621565397de6d1eb794), [`26a365b`](https://github.com/assistant-ui/assistant-ui/commit/26a365bb2b5bf840e21cd0caf1870627fb57c045)]:
  - @assistant-ui/core@0.2.11
  - assistant-stream@0.3.21
  - @assistant-ui/store@0.2.14
  - @assistant-ui/tap@0.6.0

## 0.0.6

### Patch Changes

- Updated dependencies [[`cba2b42`](https://github.com/assistant-ui/assistant-ui/commit/cba2b42c26083e730ae07194186ab4473f9f4cf3), [`4145caa`](https://github.com/assistant-ui/assistant-ui/commit/4145caaa23452f38c71366b55c03f8ec4da3fd54), [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab), [`0558db2`](https://github.com/assistant-ui/assistant-ui/commit/0558db28952fcd1c05a2ea3f15020cf50ca52489), [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46), [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47), [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb), [`7640b31`](https://github.com/assistant-ui/assistant-ui/commit/7640b319f704414bd5eb197f34e11ae0b2324a1d)]:
  - assistant-stream@0.3.20
  - @assistant-ui/core@0.2.10
  - @assistant-ui/store@0.2.13
  - @assistant-ui/tap@0.5.14

## 0.0.5

### Patch Changes

- Updated dependencies [[`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e), [`27ae936`](https://github.com/assistant-ui/assistant-ui/commit/27ae936dec6dc5d05d21fd892af0a8e1db61928e)]:
  - assistant-stream@0.3.19
  - @assistant-ui/core@0.2.9

## 0.0.4

### Patch Changes

- [#4151](https://github.com/assistant-ui/assistant-ui/pull/4151) [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3) - chore: drop stale `biome-ignore` pragmas now that the repo lints with oxlint ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b), [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b), [`76f7d16`](https://github.com/assistant-ui/assistant-ui/commit/76f7d161c2d802b72e07a12f67595f94c9ad7e4d), [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d), [`c4d3eea`](https://github.com/assistant-ui/assistant-ui/commit/c4d3eeac6907a2fc15718f3c710d73d24eaeb652)]:
  - assistant-stream@0.3.18
  - @assistant-ui/core@0.2.8
  - @assistant-ui/store@0.2.13
  - @assistant-ui/tap@0.5.14

## 0.0.3

### Patch Changes

- Updated dependencies [[`7395092`](https://github.com/assistant-ui/assistant-ui/commit/73950929dbebadb275e3bdee23331f65f2635a33), [`a6e0653`](https://github.com/assistant-ui/assistant-ui/commit/a6e0653bad29fb93627646a77c3383000c57ee33), [`cabfc71`](https://github.com/assistant-ui/assistant-ui/commit/cabfc715e99f23a55dc1276a6028792d7ecad822)]:
  - @assistant-ui/core@0.2.7
  - @assistant-ui/tap@0.5.13
  - @assistant-ui/store@0.2.12

## 0.0.2

### Patch Changes

- Updated dependencies [[`372d4f0`](https://github.com/assistant-ui/assistant-ui/commit/372d4f0c538a766fd9a849fef74e413dde86d74a), [`d4f1db4`](https://github.com/assistant-ui/assistant-ui/commit/d4f1db428b1a1fe5c122150e1e366a377e9adb5f), [`32ae846`](https://github.com/assistant-ui/assistant-ui/commit/32ae846a91b61eccd01330693868a48f2f3bb0c4)]:
  - @assistant-ui/core@0.2.6
  - assistant-stream@0.3.17

## 0.0.1

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4025](https://github.com/assistant-ui/assistant-ui/pull/4025) [`c74c3bb`](https://github.com/assistant-ui/assistant-ui/commit/c74c3bb84e44f95b2b846d8f441a4910e0003aae) - feat: new package — MCP server configuration and OAuth primitives. Unstyled Radix-style primitives (`McpManagerPrimitive`, `McpServerPrimitive`, `McpAddFormPrimitive`), a tap-backed manager + per-server resource, OAuth (PKCE + DCR) / bearer / none auth modes, and pluggable persistence via `MCPLocalStorage` / `MCPMemoryStorage` / `MCPCustomStorage`. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`13a12c4`](https://github.com/assistant-ui/assistant-ui/commit/13a12c46c94f7e5e62af02692cf3479fff48bd02), [`0a0c306`](https://github.com/assistant-ui/assistant-ui/commit/0a0c306286598ea885b046a1dfb85016f720051c), [`6a0ecb2`](https://github.com/assistant-ui/assistant-ui/commit/6a0ecb2e49f24c5f066052018db5a9f1411dcc59), [`e4634a5`](https://github.com/assistant-ui/assistant-ui/commit/e4634a59b7a926d158e929d559326f243efe438b), [`325de4c`](https://github.com/assistant-ui/assistant-ui/commit/325de4c73b348d4c20dafa4a2ac6d436c69dbf28), [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`f2ec01c`](https://github.com/assistant-ui/assistant-ui/commit/f2ec01ce0f01317a8444b779d88f9b6a26d691c5), [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0)]:
  - assistant-stream@0.3.16
  - @assistant-ui/core@0.2.5
  - @assistant-ui/store@0.2.12
  - @assistant-ui/tap@0.5.12
