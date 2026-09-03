# @assistant-ui/react-ag-ui

## 0.0.58

### Patch Changes

- [#6723](https://github.com/assistant-ui/assistant-ui/pull/6723) [`8cc962e`](https://github.com/assistant-ui/assistant-ui/commit/8cc962e4bb33a5d144535373deb8792edd7f6921) - fix: surface a refused tool-approval decision, and show the gate's own message ([@okisdev](https://github.com/okisdev))
  
  a rejected decision now reaches whoever rendered the controls as well as `onError`, so an expired or already-decided gate stays retryable instead of only being reported out of band. an interrupt's `message` is projected onto `approval.prompt` rather than dropped, so the renderer shows the question the gate asked.

- [#6685](https://github.com/assistant-ui/assistant-ui/pull/6685) [`205acf5`](https://github.com/assistant-ui/assistant-ui/commit/205acf51e026f13a3e9b1755c2cda9a20677f72c) - refactor: walk the nested tool-call tree through one shared traversal ([@okisdev](https://github.com/okisdev))

- [#6630](https://github.com/assistant-ui/assistant-ui/pull/6630) [`38c9611`](https://github.com/assistant-ui/assistant-ui/commit/38c96118380dcf685a535d8f641cd74ef70978b6) - fix: a subagent's frontend tool result is recorded, survives re-emits, and resumes the run ([@Kinfe123](https://github.com/Kinfe123))

- [#6580](https://github.com/assistant-ui/assistant-ui/pull/6580) [`dc2cab3`](https://github.com/assistant-ui/assistant-ui/commit/dc2cab3aecc0466c6c2274974e42b3196e0763bc) - fix: rely on the upstream client to forward resume input ([@okisdev](https://github.com/okisdev))

- [#6608](https://github.com/assistant-ui/assistant-ui/pull/6608) [`d6cd395`](https://github.com/assistant-ui/assistant-ui/commit/d6cd395f53c4ced02af96afdb7589ff4dec0a2f6) - feat: model the AG-UI subagent protocol. `SUBAGENT_STARTED` / `SUBAGENT_FINISHED` / `SUBAGENT_ERROR` are parsed instead of falling through to `RAW` and being dropped, `subagentRunId` is read off the events that carry it, and each subagent run is grouped into one nested assistant message attached to its spawning tool call as `ToolCallMessagePart.messages`. a subagent with no reachable spawning call renders in the parent thread rather than being dropped. ([@farazhassan](https://github.com/farazhassan))
  
  behavior change: a subagent's frontend-executed tool call is no longer reachable by `getPendingToolCalls()`, so it does not execute. previously these calls landed in the parent thread and ran, because subagent attribution did not exist. the run now reports `incomplete` / `tool-calls` instead of claiming it finished. see the subagents section of the react-ag-ui README and [#6612](https://github.com/assistant-ui/assistant-ui/issues/6612).

- [#6665](https://github.com/assistant-ui/assistant-ui/pull/6665) [`3083e84`](https://github.com/assistant-ui/assistant-ui/commit/3083e845bb8c099dc1e53578f539714f08abbc0b) - fix: diagnose malformed AG-UI events ([@rupic-app](https://github.com/apps/rupic-app))

- [#6670](https://github.com/assistant-ui/assistant-ui/pull/6670) [`e573efc`](https://github.com/assistant-ui/assistant-ui/commit/e573efc4e6c82ea5a9ec98fcd5d5f32a54b27130) - fix: diagnose malformed fields on accepted AG-UI events ([@rupic-app](https://github.com/apps/rupic-app))

- [#6660](https://github.com/assistant-ui/assistant-ui/pull/6660) [`be4f72b`](https://github.com/assistant-ui/assistant-ui/commit/be4f72b72fc78888beea0c2eb50314c6b22023d4) - fix: reject malformed message snapshot events ([@Kinfe123](https://github.com/Kinfe123))

- [#6501](https://github.com/assistant-ui/assistant-ui/pull/6501) [`1811972`](https://github.com/assistant-ui/assistant-ui/commit/1811972038997a8bc6941d8cac137871fc5bf90e) - fix: keep unresolved tool calls pending after successful runs ([@rupic-app](https://github.com/apps/rupic-app))

- [#6664](https://github.com/assistant-ui/assistant-ui/pull/6664) [`0dde2a4`](https://github.com/assistant-ui/assistant-ui/commit/0dde2a439cda7f4155852466d4e70e7d69899e42) - fix: reject state snapshots without a snapshot value ([@rupic-app](https://github.com/apps/rupic-app))

- [#6528](https://github.com/assistant-ui/assistant-ui/pull/6528) [`152a35d`](https://github.com/assistant-ui/assistant-ui/commit/152a35daae0e80b5307865e59af683c4ae720794) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#6639](https://github.com/assistant-ui/assistant-ui/pull/6639) [`05e3e6d`](https://github.com/assistant-ui/assistant-ui/commit/05e3e6d3971dac4ce20fc7e2a87d187d78b0e449) - chore: update dependencies ([@Yonom](https://github.com/Yonom))
- Updated dependencies [[`8cc962e`](https://github.com/assistant-ui/assistant-ui/commit/8cc962e4bb33a5d144535373deb8792edd7f6921), [`d746b30`](https://github.com/assistant-ui/assistant-ui/commit/d746b30d2cf47648eb9b4db2a7776df174da3719), [`2a31285`](https://github.com/assistant-ui/assistant-ui/commit/2a3128570eb52efc30d47c5aa1d7b16fd5e84cff), [`205acf5`](https://github.com/assistant-ui/assistant-ui/commit/205acf51e026f13a3e9b1755c2cda9a20677f72c), [`56ce8cc`](https://github.com/assistant-ui/assistant-ui/commit/56ce8ccaa2fe5b2b2a7e724b7b99e99d8801c043), [`740a573`](https://github.com/assistant-ui/assistant-ui/commit/740a5739c2da1363a43b5bde74dbefec1970b060), [`65d449b`](https://github.com/assistant-ui/assistant-ui/commit/65d449bf225e190f308de00f85196420b72dc6d4), [`79283c5`](https://github.com/assistant-ui/assistant-ui/commit/79283c5ab5462d5a15d4f3ef6a079104ec74b605), [`9ec29e1`](https://github.com/assistant-ui/assistant-ui/commit/9ec29e1708564dcb9ad308f5d565ec2bef7cf6c6), [`14fc938`](https://github.com/assistant-ui/assistant-ui/commit/14fc93895e3e0c67f84b2722fa2b1180b0341cb3), [`3f7af8b`](https://github.com/assistant-ui/assistant-ui/commit/3f7af8b2df9c62fee5e2cf0cc3871753dbb2814b), [`46fad14`](https://github.com/assistant-ui/assistant-ui/commit/46fad145974a890cd18f7fc2df54e9d0bf36b0fb), [`5511057`](https://github.com/assistant-ui/assistant-ui/commit/55110570389771b4b362d3ba502da8e329f4de70), [`dc2cab3`](https://github.com/assistant-ui/assistant-ui/commit/dc2cab3aecc0466c6c2274974e42b3196e0763bc), [`d75944b`](https://github.com/assistant-ui/assistant-ui/commit/d75944b44ffb60cf853f3abdcb8620628fd35dbb), [`6bd1570`](https://github.com/assistant-ui/assistant-ui/commit/6bd157073f12006e5f8cdcb41d10735f6d93d6a7), [`60ae973`](https://github.com/assistant-ui/assistant-ui/commit/60ae973db6c53941f54bb09e02b898f607366e31), [`9f08bdc`](https://github.com/assistant-ui/assistant-ui/commit/9f08bdc9c1208951cc71e60bd762b12bdb588e4b), [`0fb5390`](https://github.com/assistant-ui/assistant-ui/commit/0fb53906fd4cc35458502c34f699a114f5c887c4), [`dc2cab3`](https://github.com/assistant-ui/assistant-ui/commit/dc2cab3aecc0466c6c2274974e42b3196e0763bc), [`f0d0aa2`](https://github.com/assistant-ui/assistant-ui/commit/f0d0aa2f87b9d881f7003bf6132bbb519509b36b), [`1fa3e09`](https://github.com/assistant-ui/assistant-ui/commit/1fa3e099eeab5c19e414da25fcae1b213da3ff10), [`0f17ba5`](https://github.com/assistant-ui/assistant-ui/commit/0f17ba5bb0c048d5b639205900bd590db5b8824b), [`152a35d`](https://github.com/assistant-ui/assistant-ui/commit/152a35daae0e80b5307865e59af683c4ae720794), [`0c5c574`](https://github.com/assistant-ui/assistant-ui/commit/0c5c574993328635aac8a3b954141c451f0b127a), [`ddaac94`](https://github.com/assistant-ui/assistant-ui/commit/ddaac94844317d901e4a655461c5bd928bdf8e06), [`0c68179`](https://github.com/assistant-ui/assistant-ui/commit/0c68179227da4d64d73db9c6c36cd674ccaf59e6), [`250f69c`](https://github.com/assistant-ui/assistant-ui/commit/250f69ce608cf32c4930f01e49208e70e8ff9274), [`c22a3dc`](https://github.com/assistant-ui/assistant-ui/commit/c22a3dc69e51fc719ea54595b595b892303599c5), [`aca6e30`](https://github.com/assistant-ui/assistant-ui/commit/aca6e30876f675cfd44066dca410db6191e8251e), [`5bdd416`](https://github.com/assistant-ui/assistant-ui/commit/5bdd416af4379a2cc86c12292e06a6e3ce5fcdb9), [`6fdfc23`](https://github.com/assistant-ui/assistant-ui/commit/6fdfc2352390a5e227e488ddd5ef3ab348fc1fda), [`136bbf5`](https://github.com/assistant-ui/assistant-ui/commit/136bbf5800904dd2c51a878afa55e9fa40b1dc32), [`e53299b`](https://github.com/assistant-ui/assistant-ui/commit/e53299be07fd69bd5d64a2f50bd3561d85dc47cc), [`69d8e1b`](https://github.com/assistant-ui/assistant-ui/commit/69d8e1bab2d5d6e6c4c6f4434c9f055db0f59aa8), [`dabe8f2`](https://github.com/assistant-ui/assistant-ui/commit/dabe8f21f5cea21fa7fdd1b9c1987e0ac7367c07), [`05e3e6d`](https://github.com/assistant-ui/assistant-ui/commit/05e3e6d3971dac4ce20fc7e2a87d187d78b0e449), [`8d128af`](https://github.com/assistant-ui/assistant-ui/commit/8d128afd6919e7ffe84dba365e29da44592e26a4), [`9f08bdc`](https://github.com/assistant-ui/assistant-ui/commit/9f08bdc9c1208951cc71e60bd762b12bdb588e4b), [`47a46db`](https://github.com/assistant-ui/assistant-ui/commit/47a46db1753aeb836bc1f1d0879eb84d5829eaf9), [`8135d16`](https://github.com/assistant-ui/assistant-ui/commit/8135d16dfb871e807d94a427e958d2b957b19f1e), [`07fed43`](https://github.com/assistant-ui/assistant-ui/commit/07fed430ca6b1c07782abd36f5c7f91a7bf5256c), [`fa9c0dc`](https://github.com/assistant-ui/assistant-ui/commit/fa9c0dc8e88724f3d01251e002c3f4bb4c252f4a), [`fa9c0dc`](https://github.com/assistant-ui/assistant-ui/commit/fa9c0dc8e88724f3d01251e002c3f4bb4c252f4a), [`4ca7de9`](https://github.com/assistant-ui/assistant-ui/commit/4ca7de95c90f1ce1bba45fd5e635baac2441e53a), [`65d449b`](https://github.com/assistant-ui/assistant-ui/commit/65d449bf225e190f308de00f85196420b72dc6d4), [`49e727b`](https://github.com/assistant-ui/assistant-ui/commit/49e727b440c3c395ec7c4e9530a5b460b03b8f33), [`49e727b`](https://github.com/assistant-ui/assistant-ui/commit/49e727b440c3c395ec7c4e9530a5b460b03b8f33), [`d56a66a`](https://github.com/assistant-ui/assistant-ui/commit/d56a66a6d325d6e64abbc405dae204b4ee1dfc1e), [`96a2df8`](https://github.com/assistant-ui/assistant-ui/commit/96a2df8ba189796dc1cc14a3ab66160625b1e072), [`8206d8f`](https://github.com/assistant-ui/assistant-ui/commit/8206d8f139804dcb030a0731571858db16f42bd7)]:
  - @assistant-ui/core@0.3.17
  - @assistant-ui/react-generative-ui@0.0.17
  - assistant-stream@0.3.41
  - @assistant-ui/store@0.3.12

## 0.0.57

### Patch Changes

- [#6339](https://github.com/assistant-ui/assistant-ui/pull/6339) [`a20f753`](https://github.com/assistant-ui/assistant-ui/commit/a20f7539df6958fdfdeba479aa019c32960b0744) - fix: omit empty text parts from streamed snapshots ([@rupic-app](https://github.com/apps/rupic-app))

- [#6278](https://github.com/assistant-ui/assistant-ui/pull/6278) [`f1cec13`](https://github.com/assistant-ui/assistant-ui/commit/f1cec132de362613d352dd576a614c69eb4fe8d5) - fix: load a history adapter that arrives after the first load ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#6295](https://github.com/assistant-ui/assistant-ui/pull/6295) [`469554f`](https://github.com/assistant-ui/assistant-ui/commit/469554fc2aa9cefc222a622ffebc1969886e8323) - fix: keep developer messages across snapshot import ([@Kinfe123](https://github.com/Kinfe123))

- [#6290](https://github.com/assistant-ui/assistant-ui/pull/6290) [`068e16f`](https://github.com/assistant-ui/assistant-ui/commit/068e16f9f9202d1ddfd4bf96c34b016b751a63eb) - fix: keep reasoning signatures from live runs that produce no visible part ([@Kinfe123](https://github.com/Kinfe123))

- [#6342](https://github.com/assistant-ui/assistant-ui/pull/6342) [`e2f526c`](https://github.com/assistant-ui/assistant-ui/commit/e2f526c8152a24978703a35fd783526d8dbe213f) - refactor: generate ids with core generateId and drop the uuid dependency. ([@okisdev](https://github.com/okisdev))

- [#6329](https://github.com/assistant-ui/assistant-ui/pull/6329) [`8217a6e`](https://github.com/assistant-ui/assistant-ui/commit/8217a6e7105b682871211e5c93b1965f25198624) - refactor: derive executing-tool running state inside the external-store runtime; adapters now pass raw provider isRunning. ([@okisdev](https://github.com/okisdev))
  the assistant transport runtime enables tool invocations too, so it now keeps the thread running while a client tool executes instead of reporting idle.

- [#6439](https://github.com/assistant-ui/assistant-ui/pull/6439) [`7e03b66`](https://github.com/assistant-ui/assistant-ui/commit/7e03b669d08b4cadaf4b381a4d1e57c2fc22d139) - refactor: share the file part source resolution branch ([@okisdev](https://github.com/okisdev))

- [#6300](https://github.com/assistant-ui/assistant-ui/pull/6300) [`f80239b`](https://github.com/assistant-ui/assistant-ui/commit/f80239ba29e825b62cb4ae8cbc63d4e3299d7b76) - fix: keep tool follow-up text on its assistant message ([@okisdev](https://github.com/okisdev))

- [#6328](https://github.com/assistant-ui/assistant-ui/pull/6328) [`6b797ca`](https://github.com/assistant-ui/assistant-ui/commit/6b797ca09fd63ac988dc7a2e60117ca2fe231f97) - refactor: share the runtime lifecycle callback invoker from core internal. ([@okisdev](https://github.com/okisdev))
  callback errors continue to be reported and swallowed through the shared invoker.

- [#6430](https://github.com/assistant-ui/assistant-ui/pull/6430) [`a06be56`](https://github.com/assistant-ui/assistant-ui/commit/a06be56bfe75f869bb44f1d92949e35516f64686) - refactor: share the message repository session layer between a2a and ag-ui ([@okisdev](https://github.com/okisdev))

- [#6309](https://github.com/assistant-ui/assistant-ui/pull/6309) [`78324e6`](https://github.com/assistant-ui/assistant-ui/commit/78324e682f5b19efa7e7f4580b94c02e39cd3805) - fix: apply runtime options after commit ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#6305](https://github.com/assistant-ui/assistant-ui/pull/6305) [`e96d3de`](https://github.com/assistant-ui/assistant-ui/commit/e96d3dea9370159e04f82bf4eb39d6b1b1c4d21d) - chore: update dependencies ([@okisdev](https://github.com/okisdev))
- Updated dependencies [[`c70c911`](https://github.com/assistant-ui/assistant-ui/commit/c70c911d9537e6f3e87da44768e3363d65e6a19d), [`e0fa1e6`](https://github.com/assistant-ui/assistant-ui/commit/e0fa1e63d068c142ab3154eeddf6bbdb203ba463), [`b2f148e`](https://github.com/assistant-ui/assistant-ui/commit/b2f148ef81681745eeeb931a56f3c54719cb50e4), [`9dabbce`](https://github.com/assistant-ui/assistant-ui/commit/9dabbce426e284886e617f3178a7f50a2fbcbb94), [`5a3e9f7`](https://github.com/assistant-ui/assistant-ui/commit/5a3e9f7c26c85af640a806fa8174508cbf3fb031), [`43d52ad`](https://github.com/assistant-ui/assistant-ui/commit/43d52adfc7fb1b94d854454f36fedc40cb16e246), [`cdfc34d`](https://github.com/assistant-ui/assistant-ui/commit/cdfc34d57e86422666a12f4410e05bbe1c48dbdc), [`8626c1f`](https://github.com/assistant-ui/assistant-ui/commit/8626c1ffe1c6d56ec75073e795aa9fbf7493c3ed), [`4000eed`](https://github.com/assistant-ui/assistant-ui/commit/4000eed17a9bb97d854a44eb61d9d5b72634e66c), [`8217a6e`](https://github.com/assistant-ui/assistant-ui/commit/8217a6e7105b682871211e5c93b1965f25198624), [`3fcf338`](https://github.com/assistant-ui/assistant-ui/commit/3fcf3383ec002b4e43e27bd96f0b9a4148d7e6cd), [`4802d23`](https://github.com/assistant-ui/assistant-ui/commit/4802d238dd7411589a0ce40102c1c7e90fe53fc0), [`c3fd2b3`](https://github.com/assistant-ui/assistant-ui/commit/c3fd2b30443ac58019c6c22693c46e18deed18b4), [`231d148`](https://github.com/assistant-ui/assistant-ui/commit/231d14896f3a2b2bb65d7844e65eca17f9151399), [`7e03b66`](https://github.com/assistant-ui/assistant-ui/commit/7e03b669d08b4cadaf4b381a4d1e57c2fc22d139), [`fd42628`](https://github.com/assistant-ui/assistant-ui/commit/fd42628727e34723cc4f627352cc0fed70863ad7), [`1263c1f`](https://github.com/assistant-ui/assistant-ui/commit/1263c1fb8870ff1ba0a1c0e0ec3f3ea53a4c53da), [`465a7a6`](https://github.com/assistant-ui/assistant-ui/commit/465a7a68c9870e440040e70e9fe2cd062413de8e), [`531f61a`](https://github.com/assistant-ui/assistant-ui/commit/531f61a4d2f5fcee16821a6401d9d11394bf8339), [`5355528`](https://github.com/assistant-ui/assistant-ui/commit/5355528559bb575e11bbfbf6cac80203196cedaf), [`e97f7c6`](https://github.com/assistant-ui/assistant-ui/commit/e97f7c61365ef0f73686c7b596751802f1a1ddd2), [`a6d2da5`](https://github.com/assistant-ui/assistant-ui/commit/a6d2da5a0c021fbcd46ac3b56d5e4086edda1f64), [`6b797ca`](https://github.com/assistant-ui/assistant-ui/commit/6b797ca09fd63ac988dc7a2e60117ca2fe231f97), [`bea47ed`](https://github.com/assistant-ui/assistant-ui/commit/bea47edbf19aa0258506ade5d73e9096e510b858), [`dfaa94f`](https://github.com/assistant-ui/assistant-ui/commit/dfaa94fca3ecdd8b0b0ab202f08dafd03c1e2ed5), [`a4bc54a`](https://github.com/assistant-ui/assistant-ui/commit/a4bc54afa976423b6310a2d5be350df0f3b41e42), [`546dae8`](https://github.com/assistant-ui/assistant-ui/commit/546dae8c474463a0c228696e16d250bb9a3578ae), [`a06be56`](https://github.com/assistant-ui/assistant-ui/commit/a06be56bfe75f869bb44f1d92949e35516f64686), [`e3bbc32`](https://github.com/assistant-ui/assistant-ui/commit/e3bbc322286eb251c22bbc1ccf0c24136deb9e6a), [`96d4ddf`](https://github.com/assistant-ui/assistant-ui/commit/96d4ddf53398e2e952f3bc365539f2d6f6fd85e4), [`ae40ac8`](https://github.com/assistant-ui/assistant-ui/commit/ae40ac88368843034ed9ceb2b1a28451513c99e4), [`fd471e9`](https://github.com/assistant-ui/assistant-ui/commit/fd471e94babf7b6580e06bbea2b7a8cdd4882869), [`c8db434`](https://github.com/assistant-ui/assistant-ui/commit/c8db4344d5b597cec7484defc9224a65e41e38d8), [`bc55058`](https://github.com/assistant-ui/assistant-ui/commit/bc550585b16f1ae0379fb45dd01bd90ce7faf0eb), [`0221348`](https://github.com/assistant-ui/assistant-ui/commit/0221348df3770f590b34ef45e2c175e8de385e16), [`c415384`](https://github.com/assistant-ui/assistant-ui/commit/c415384e392426384c857f1ca00c69128075bf57), [`5bba723`](https://github.com/assistant-ui/assistant-ui/commit/5bba723caa79600c1c568d0deb937fca8acb0b54), [`0188899`](https://github.com/assistant-ui/assistant-ui/commit/018889996bbc9aefcfc503e12159dfe76f793b40), [`ac7ec15`](https://github.com/assistant-ui/assistant-ui/commit/ac7ec15e118a9279dd60521b839ecc38983675c5), [`e96d3de`](https://github.com/assistant-ui/assistant-ui/commit/e96d3dea9370159e04f82bf4eb39d6b1b1c4d21d), [`027f5e2`](https://github.com/assistant-ui/assistant-ui/commit/027f5e20e927b49fac5644283bd622a9725cf346), [`563fd25`](https://github.com/assistant-ui/assistant-ui/commit/563fd2518cf64288fe0ccb71394d4ff37d5cf40a), [`ebabca4`](https://github.com/assistant-ui/assistant-ui/commit/ebabca49de57630a2040af0ed59c058da95483d7), [`4b98f3b`](https://github.com/assistant-ui/assistant-ui/commit/4b98f3b59ce55e5563e2025c54105283e5f2cc28), [`f96e22f`](https://github.com/assistant-ui/assistant-ui/commit/f96e22ffa8c85cbfc4a878db4f371c510070066d), [`fc7f72f`](https://github.com/assistant-ui/assistant-ui/commit/fc7f72f0f846848e8c88eaba2131d4ef0005feab), [`bfc8bef`](https://github.com/assistant-ui/assistant-ui/commit/bfc8bef9f1ee6cb4cb25f83488a0e4ce1a393ff3), [`2cd5cbc`](https://github.com/assistant-ui/assistant-ui/commit/2cd5cbcf78c586b7557421b00e9c996c62bd7f43), [`105af3e`](https://github.com/assistant-ui/assistant-ui/commit/105af3eaea2093df271d9c44642e1c04d5f5cf7c), [`4c3194a`](https://github.com/assistant-ui/assistant-ui/commit/4c3194aca4470753a2a37e244cb5e3fb27cbc76b), [`0064d1e`](https://github.com/assistant-ui/assistant-ui/commit/0064d1e859171e271c11cec07f4dcde7d0d023bc)]:
  - @assistant-ui/core@0.3.16
  - assistant-stream@0.3.40
  - @assistant-ui/react-generative-ui@0.0.16
  - @assistant-ui/store@0.3.11

## 0.0.56

### Patch Changes

- [#6078](https://github.com/assistant-ui/assistant-ui/pull/6078) [`179f8ca`](https://github.com/assistant-ui/assistant-ui/commit/179f8cafdf4c269a63831b2b4ea9cbb18a54228e) - feat: expose toAgUiMessages and fill a missing AG-UI message id ([@rupic-app](https://github.com/apps/rupic-app))

- [#5902](https://github.com/assistant-ui/assistant-ui/pull/5902) [`ff0aad4`](https://github.com/assistant-ui/assistant-ui/commit/ff0aad44eb3b738c47ab6105b64201e480e99920) - feat: expose AG-UI `tool_call` interrupts through the core tool-approval seam ([@samdickson22](https://github.com/samdickson22))

- [#6124](https://github.com/assistant-ui/assistant-ui/pull/6124) [`06b04a7`](https://github.com/assistant-ui/assistant-ui/commit/06b04a7976d10fac3af40ae9ca59b52385ef2ae2) - chore: update dependencies ([@okisdev](https://github.com/okisdev))
- Updated dependencies [[`fa30915`](https://github.com/assistant-ui/assistant-ui/commit/fa309156e033dc085c0d3b8fb97c27c81a3d2c6e), [`b355aef`](https://github.com/assistant-ui/assistant-ui/commit/b355aefbe2403025562f0e08494a57450bfdc049), [`f7bd2d9`](https://github.com/assistant-ui/assistant-ui/commit/f7bd2d9392e1e71750012fa87649002e8c9d1dab), [`4947ef4`](https://github.com/assistant-ui/assistant-ui/commit/4947ef4f9b0956bd4ca21c457b3cc7e79a2fc9e0), [`332f736`](https://github.com/assistant-ui/assistant-ui/commit/332f736e64bfa26f76cd60318279697ddbc0b36d), [`ef9254d`](https://github.com/assistant-ui/assistant-ui/commit/ef9254d5b2174fb4b58b4e954a8a0d60910a484c), [`9c65b51`](https://github.com/assistant-ui/assistant-ui/commit/9c65b511bc7cdc7d6699c128cac4650cae728043), [`5845ba7`](https://github.com/assistant-ui/assistant-ui/commit/5845ba7c5690af776701683fbd2d04e9ca0eaaff), [`1b30bfd`](https://github.com/assistant-ui/assistant-ui/commit/1b30bfdabadfe3613b7c98296de3d6665122136b), [`365e763`](https://github.com/assistant-ui/assistant-ui/commit/365e763928ff38d2de518efa2a7c44249afbbf83), [`d19921d`](https://github.com/assistant-ui/assistant-ui/commit/d19921d3739efb53dcbbb1ae04ffd18a94dca080), [`996aa57`](https://github.com/assistant-ui/assistant-ui/commit/996aa5723cf8d7db00cc72da08713226d90ec0e1), [`21d6e87`](https://github.com/assistant-ui/assistant-ui/commit/21d6e87dc2834af11babb93c004f7d4f3a4f9568), [`cd247e5`](https://github.com/assistant-ui/assistant-ui/commit/cd247e557b4876c49feb9b79c4f5149cc2271dad), [`1bf263b`](https://github.com/assistant-ui/assistant-ui/commit/1bf263ba208668ead7f6c0786ca0c3064e31c3ab), [`19e52c4`](https://github.com/assistant-ui/assistant-ui/commit/19e52c4012a6a8c32e514134af9ce4eee1146864), [`06b04a7`](https://github.com/assistant-ui/assistant-ui/commit/06b04a7976d10fac3af40ae9ca59b52385ef2ae2), [`a614b5e`](https://github.com/assistant-ui/assistant-ui/commit/a614b5e44df5f59d82b63b60132a41c89f82e185), [`07b51db`](https://github.com/assistant-ui/assistant-ui/commit/07b51dbbc749c94023fa25df99bb7f64dc211ff1), [`92e52bd`](https://github.com/assistant-ui/assistant-ui/commit/92e52bd2c99ee8cacd242bf723f617df64e42e2a)]:
  - @assistant-ui/core@0.3.15
  - assistant-stream@0.3.39

## 0.0.55

### Patch Changes

- [#5999](https://github.com/assistant-ui/assistant-ui/pull/5999) [`0cdf980`](https://github.com/assistant-ui/assistant-ui/commit/0cdf980cbb4bc67c26440b5c70a0a230f6380b1d) - fix(react-ag-ui): cancel active runs on runtime teardown ([@Kinfe123](https://github.com/Kinfe123))

- [#5843](https://github.com/assistant-ui/assistant-ui/pull/5843) [`d8ccd52`](https://github.com/assistant-ui/assistant-ui/commit/d8ccd52ccf7250ffc0c814f61e6e96b737585842) - feat: expose AG-UI custom events as assistant data parts ([@rupic-app](https://github.com/apps/rupic-app))

- [#5898](https://github.com/assistant-ui/assistant-ui/pull/5898) [`6ec2511`](https://github.com/assistant-ui/assistant-ui/commit/6ec2511768e2467a1838fd5d48058956f7f5b802) - fix: mark streamed AG-UI run errors as failed ([@Kinfe123](https://github.com/Kinfe123))

- [#5978](https://github.com/assistant-ui/assistant-ui/pull/5978) [`4101a7d`](https://github.com/assistant-ui/assistant-ui/commit/4101a7de128c31e6adeb9f2628a409d76ed145e1) - fix: persist snapshot assistants with append-only history adapters ([@rupic-app](https://github.com/apps/rupic-app))

- [#5313](https://github.com/assistant-ui/assistant-ui/pull/5313) [`a07a4dd`](https://github.com/assistant-ui/assistant-ui/commit/a07a4ddfb2838e509702364e5990347b3ed53277) - fix: preserve regeneration branches, visible server-id streaming, and history updates after message snapshots ([@Gujiassh](https://github.com/Gujiassh))

- [#5774](https://github.com/assistant-ui/assistant-ui/pull/5774) [`61d29f4`](https://github.com/assistant-ui/assistant-ui/commit/61d29f4157b525d3e36ac721d1fcef7d1baf987e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))
- Updated dependencies [[`ac0c836`](https://github.com/assistant-ui/assistant-ui/commit/ac0c8364a0f25555f693e4354d07c411e65f5489), [`c3fd447`](https://github.com/assistant-ui/assistant-ui/commit/c3fd447f23cbaa36381b2f62058b420bd54cc148), [`f858321`](https://github.com/assistant-ui/assistant-ui/commit/f8583212387716e965dda0f0f6c31b8366527dbc), [`f9529bf`](https://github.com/assistant-ui/assistant-ui/commit/f9529bfdea5018505ef393fe46e93809a0012032), [`f9529bf`](https://github.com/assistant-ui/assistant-ui/commit/f9529bfdea5018505ef393fe46e93809a0012032), [`05b94bd`](https://github.com/assistant-ui/assistant-ui/commit/05b94bd5ec879fbf87165385028000eb01e47396), [`cef671d`](https://github.com/assistant-ui/assistant-ui/commit/cef671d63d173bd30fcef268b1539f1a64cf5f39), [`ef7f70d`](https://github.com/assistant-ui/assistant-ui/commit/ef7f70d4fc05195d6386f8e2d072d3deaef1e56a), [`39db2ff`](https://github.com/assistant-ui/assistant-ui/commit/39db2ff60c6392267d88bbc42d63aa32dd9be0fe), [`0e91e27`](https://github.com/assistant-ui/assistant-ui/commit/0e91e277ebe218e891d1c318a18eec230ee4f981), [`c5bc8ed`](https://github.com/assistant-ui/assistant-ui/commit/c5bc8ed0c78e8fb66a6c21c596765caeccef3aec), [`a2a753b`](https://github.com/assistant-ui/assistant-ui/commit/a2a753b71cf8e2c531a8006060eb9931a44824d8), [`2b0fec7`](https://github.com/assistant-ui/assistant-ui/commit/2b0fec76d8abff2b013aa05eb2a5d62545325da2), [`bec0753`](https://github.com/assistant-ui/assistant-ui/commit/bec075348dbdcd377c38074dd179d2751463ba35), [`4326079`](https://github.com/assistant-ui/assistant-ui/commit/4326079bfca7cdaac75497958be39e132343b26c), [`3d68b16`](https://github.com/assistant-ui/assistant-ui/commit/3d68b168e23bb0fd63853b41368d46f8199a3874), [`98795aa`](https://github.com/assistant-ui/assistant-ui/commit/98795aa266f724d512b973d791ce08fe4c21c2c5), [`9d920cc`](https://github.com/assistant-ui/assistant-ui/commit/9d920cc89c25459e602ee0c3037b5f84fd626e01), [`1b9c33d`](https://github.com/assistant-ui/assistant-ui/commit/1b9c33d114ab1589f0592fabda58ca63265265c6), [`d68918e`](https://github.com/assistant-ui/assistant-ui/commit/d68918ee5c862ca6a261a01ea0b961e7b2b66af2), [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7), [`87bf950`](https://github.com/assistant-ui/assistant-ui/commit/87bf95093f6b3f38406b5317545ce697e4979e6d), [`5a01343`](https://github.com/assistant-ui/assistant-ui/commit/5a01343f87ba3282004a08ef014dc3d51f3ce3cf), [`0f6e9e9`](https://github.com/assistant-ui/assistant-ui/commit/0f6e9e9b56c648249781cef7689f4587209948d0), [`f0d1d48`](https://github.com/assistant-ui/assistant-ui/commit/f0d1d48842b61c8f781771375e3893d189321c2d), [`b80a6be`](https://github.com/assistant-ui/assistant-ui/commit/b80a6be3db5b5558792e5e0e267db45c133d248e), [`01580e3`](https://github.com/assistant-ui/assistant-ui/commit/01580e3b8b660542743d63ed79dd02026bb649e4), [`ab7f49f`](https://github.com/assistant-ui/assistant-ui/commit/ab7f49fcb91b8a9d96408426da3259c99f619649), [`e8c53e9`](https://github.com/assistant-ui/assistant-ui/commit/e8c53e9ce2b687e0342cbb9158191300827f75e9), [`53ae80f`](https://github.com/assistant-ui/assistant-ui/commit/53ae80f67f7cd82f5af1751f1d73ade437ba7136), [`5f4dee5`](https://github.com/assistant-ui/assistant-ui/commit/5f4dee5e233c2918b61719ef1b91397bad856762), [`9ffbd99`](https://github.com/assistant-ui/assistant-ui/commit/9ffbd99ee94e2d24e006decbb40f15aa2d254343), [`61d29f4`](https://github.com/assistant-ui/assistant-ui/commit/61d29f4157b525d3e36ac721d1fcef7d1baf987e), [`2da61a3`](https://github.com/assistant-ui/assistant-ui/commit/2da61a3be3e8e3f61a4d9310b1845325c44d8ac7), [`0131fc7`](https://github.com/assistant-ui/assistant-ui/commit/0131fc741624dad2a0c2a60b4a29eb106e0511aa), [`a934d03`](https://github.com/assistant-ui/assistant-ui/commit/a934d03a14fb5e2afa6a7647b82a0018d4a66b1d), [`b6d7b2b`](https://github.com/assistant-ui/assistant-ui/commit/b6d7b2b1c553433784a5e52ac411c9c544d8d0c1), [`bc337af`](https://github.com/assistant-ui/assistant-ui/commit/bc337af975bb69c0127a7b42ae48790ab8e3440b), [`dc6eb2f`](https://github.com/assistant-ui/assistant-ui/commit/dc6eb2f9098e1fd9de112b44a5dfd46d3bcea249), [`ce57458`](https://github.com/assistant-ui/assistant-ui/commit/ce574588a32f806ebf37e9c2c4457569b1269348), [`ab7ead9`](https://github.com/assistant-ui/assistant-ui/commit/ab7ead9dae979daafd5fb423d4e636cb41b8ed26), [`067ef52`](https://github.com/assistant-ui/assistant-ui/commit/067ef528f725fb77a892049bd8d6bbc5422baaa4), [`f44163f`](https://github.com/assistant-ui/assistant-ui/commit/f44163f8030e8a12d33f1412de96ecdda4000f7c), [`e5bf0ef`](https://github.com/assistant-ui/assistant-ui/commit/e5bf0ef9739be0579bb4fb4bb175dc0cdd3143fc), [`a2ab997`](https://github.com/assistant-ui/assistant-ui/commit/a2ab997dc645923fa8ebbca5e8e050d467a69cf4), [`fc9dd90`](https://github.com/assistant-ui/assistant-ui/commit/fc9dd90e25db8635a42e8961f4e371ce09457523), [`0e2a230`](https://github.com/assistant-ui/assistant-ui/commit/0e2a23073b3b62ebd2e614858cd910c75886977c), [`d800f8b`](https://github.com/assistant-ui/assistant-ui/commit/d800f8bbee28f5fe3693f2ec2c8682f4dad2ae62), [`f5b39d4`](https://github.com/assistant-ui/assistant-ui/commit/f5b39d415b447d881bf269d08577d31a9646b0fd), [`26f40c1`](https://github.com/assistant-ui/assistant-ui/commit/26f40c1304b5b4dcd081303bd69a5ec95a37334e), [`f618ab6`](https://github.com/assistant-ui/assistant-ui/commit/f618ab692eed3662a60a15d474c1c16715edb012), [`d80e988`](https://github.com/assistant-ui/assistant-ui/commit/d80e9882c4ec0a7662df28546ddd92cc1f0b1fcd), [`7f944be`](https://github.com/assistant-ui/assistant-ui/commit/7f944be666ab4f59d35e68c721bfb93ca7551522), [`f37f595`](https://github.com/assistant-ui/assistant-ui/commit/f37f5952171240eb04c1fe3395d4c9afe4b5ccc8), [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7), [`1b9c33d`](https://github.com/assistant-ui/assistant-ui/commit/1b9c33d114ab1589f0592fabda58ca63265265c6), [`82e2bde`](https://github.com/assistant-ui/assistant-ui/commit/82e2bde62d0b3b31ec445c939c719ab72cd8ff23), [`52df42d`](https://github.com/assistant-ui/assistant-ui/commit/52df42da5d7c4e9610469f64b8e3fe8fd690d7cd), [`6c9e7dd`](https://github.com/assistant-ui/assistant-ui/commit/6c9e7ddf584394ce63c3bc5f17bafcb28face442), [`837ef1b`](https://github.com/assistant-ui/assistant-ui/commit/837ef1b21fead90a2a4176f209dbb01ed6ccae62), [`7748e15`](https://github.com/assistant-ui/assistant-ui/commit/7748e15acf9d7d16701296e9ef89e1757ec346b3), [`72705c3`](https://github.com/assistant-ui/assistant-ui/commit/72705c39b3241a5a61919baeee3996ddbfe4cf48), [`0d2e23f`](https://github.com/assistant-ui/assistant-ui/commit/0d2e23f5597c2500da03ac417bfee1defd2d808e), [`4446d45`](https://github.com/assistant-ui/assistant-ui/commit/4446d458e8fc904b66f306749d4e389cb1c46e60), [`e8997d9`](https://github.com/assistant-ui/assistant-ui/commit/e8997d922d15d0de0d20558ce0735fa3e844f27f), [`bfe47b6`](https://github.com/assistant-ui/assistant-ui/commit/bfe47b699ca1ed7e6c222ad1fc5a33b21ec8a4af), [`ceb8c16`](https://github.com/assistant-ui/assistant-ui/commit/ceb8c166fe233fa8235b3ab4cece8f636c77a164), [`7ea9de1`](https://github.com/assistant-ui/assistant-ui/commit/7ea9de1204687585297c62981183015cac0baa99), [`51886b2`](https://github.com/assistant-ui/assistant-ui/commit/51886b2ce2e023708c3a07b3241f09181e57b418), [`3053195`](https://github.com/assistant-ui/assistant-ui/commit/3053195d8b62b1338335cb5b424f15cd5dda7c83), [`44e574f`](https://github.com/assistant-ui/assistant-ui/commit/44e574f8c17dd5603933ec74821eecd08e94e371), [`14c3b5a`](https://github.com/assistant-ui/assistant-ui/commit/14c3b5a25afe2b2f37760dfe8003818b2e4f72d3)]:
  - @assistant-ui/core@0.3.14
  - @assistant-ui/store@0.3.10
  - @assistant-ui/react-generative-ui@0.0.15
  - assistant-stream@0.3.38

## 0.0.54

### Patch Changes

- [#5805](https://github.com/assistant-ui/assistant-ui/pull/5805) [`48af3c5`](https://github.com/assistant-ui/assistant-ui/commit/48af3c5c4198b9f3fe015e77580922b2e4733e7a) - feat: round-trip a part's `providerMetadata.agui` through AG-UI's content `metadata`. An image or file part, whether it sits on the message or inside an attachment, now reaches the agent with whatever the host put in that namespace, and an inbound item puts it back on the rebuilt part, so a snapshot echo resends it instead of dropping it. A file part's own `filename` still wins over a key of the same name. Text is unchanged, its AG-UI schema has no metadata field. ([@okisdev](https://github.com/okisdev))

- [#5807](https://github.com/assistant-ui/assistant-ui/pull/5807) [`84ef0df`](https://github.com/assistant-ui/assistant-ui/commit/84ef0dfca1c5b9c711dd89b85aa8fa09e5432f7b) - fix: preserve image filenames through AG-UI snapshots ([@Kinfe123](https://github.com/Kinfe123))

- [#5803](https://github.com/assistant-ui/assistant-ui/pull/5803) [`a44c953`](https://github.com/assistant-ui/assistant-ui/commit/a44c953fffb26d8310e9c1ab26b86f1c6ebf12cc) - fix: preserve queued messages when cancelling an active run ([@Kinfe123](https://github.com/Kinfe123))

- [#5755](https://github.com/assistant-ui/assistant-ui/pull/5755) [`b9d5ba3`](https://github.com/assistant-ui/assistant-ui/commit/b9d5ba358f130ef548f295ab35465ad7b61847a0) - fix: preserve encrypted-only reasoning records across the AG-UI round trip. Under zero data retention an agent sends a `ReasoningMessage` whose readable `content` is empty and whose payload is entirely in `encryptedValue`, and both the adapter and the core normalizer dropped it: the import guarded on empty text, and a reasoning part with neither text nor summary is removed by `fromThreadMessageLike`. Such a record now rides on `metadata.custom.agui.opaqueReasoning` of the neighbouring message instead of becoming an unrenderable part, and is replayed into the run input adjacent to that message. A record that sat between an assistant message and its own tool result is replayed after that result, since import folds the result into the assistant message and that boundary no longer exists at export. A runtime configured with `showThinking: false` is affected too: it previously emitted no `reasoning` records at all, and now emits `{ role: "reasoning", content: "", encryptedValue }` for each imported record that carried a value, since that option hides reasoning from the UI rather than discarding state the agent needs back. ([@okisdev](https://github.com/okisdev))

- [#5752](https://github.com/assistant-ui/assistant-ui/pull/5752) [`ee4db08`](https://github.com/assistant-ui/assistant-ui/commit/ee4db0894b636c6754dcc6fdd7edbca6d9942996) - fix: keep reasoning, and its signature, across the AG-UI round trip. `toAgUiMessages` built the run input from `extractText`, which reads text parts only, so an imported reasoning-only assistant message was discarded as a blank turn and a live assistant message silently lost its reasoning; reloading a thread and sending one more message deleted the reasoning history from what the agent received. Reasoning parts now leave as the standalone `reasoning` records they arrived as. The runtime also consumes `REASONING_ENCRYPTED_VALUE` and stores the blob at `providerMetadata.agui.encryptedValue`, so reasoning from a live run and from an imported `ReasoningMessage` are both re-emitted with their signature intact rather than replayed unsigned. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`a90db30`](https://github.com/assistant-ui/assistant-ui/commit/a90db30dbf1c73eb2ba8cc587cf157b1a04ce541), [`cfb5fab`](https://github.com/assistant-ui/assistant-ui/commit/cfb5fab251784ce20722ec9371fd66137a9727f8), [`65e03a6`](https://github.com/assistant-ui/assistant-ui/commit/65e03a697366c62cc5295c28ae528634baaf2901), [`d3fece3`](https://github.com/assistant-ui/assistant-ui/commit/d3fece3b17487edbbeeedb903f0e8075f82b2dd7), [`63d6d34`](https://github.com/assistant-ui/assistant-ui/commit/63d6d346b5fa84910fb07b02e5b0ce0c994dc2bd), [`388a49b`](https://github.com/assistant-ui/assistant-ui/commit/388a49b42fd2c96f1072dfde51b8e1b268f51ccd), [`4b75b8f`](https://github.com/assistant-ui/assistant-ui/commit/4b75b8f96729314a369879d26d8e4cd8321eac36), [`1e98bcf`](https://github.com/assistant-ui/assistant-ui/commit/1e98bcf3f406385f3c924521b73300c12898fea6), [`82cbc15`](https://github.com/assistant-ui/assistant-ui/commit/82cbc1560b069ba1dd7e9b068585f5c647629b36), [`93ccfc2`](https://github.com/assistant-ui/assistant-ui/commit/93ccfc268b63df355da881d6009ce4900d6c8e99), [`e28a62d`](https://github.com/assistant-ui/assistant-ui/commit/e28a62d84439e93a32b64f166196cef2cb02e5db), [`48af3c5`](https://github.com/assistant-ui/assistant-ui/commit/48af3c5c4198b9f3fe015e77580922b2e4733e7a), [`22fa20f`](https://github.com/assistant-ui/assistant-ui/commit/22fa20ffd1f0d192c417b12d4512dcffeab5161b), [`00a630a`](https://github.com/assistant-ui/assistant-ui/commit/00a630aa93ce0a5e40f81fbf6ff1886275f72356), [`73fdb3a`](https://github.com/assistant-ui/assistant-ui/commit/73fdb3a415b5be71227a0bb1a84c0c6c99fcab07), [`2016d07`](https://github.com/assistant-ui/assistant-ui/commit/2016d070c10b67e09d3fe155becae6b51ee30604), [`417efee`](https://github.com/assistant-ui/assistant-ui/commit/417efee92b48f3fac057d65200f85d4df8657fa0), [`1e1d52b`](https://github.com/assistant-ui/assistant-ui/commit/1e1d52bd2f08b8712764792a9d95b608cb365b64), [`685a069`](https://github.com/assistant-ui/assistant-ui/commit/685a06939edb9478d68258cab632f389c2742a05), [`a3ef2f0`](https://github.com/assistant-ui/assistant-ui/commit/a3ef2f06abbbe595260c7f2654383a5758731134), [`1674523`](https://github.com/assistant-ui/assistant-ui/commit/167452334042fae4c5d171a5b6ad120c21fca12b), [`f59d24b`](https://github.com/assistant-ui/assistant-ui/commit/f59d24b3ee7036c94bce7bc0a38f018574f50a69), [`092585b`](https://github.com/assistant-ui/assistant-ui/commit/092585b6859eeca4d2947cbe858019f5a9d9e101)]:
  - @assistant-ui/core@0.3.13
  - @assistant-ui/react-generative-ui@0.0.14
  - @assistant-ui/store@0.3.9

## 0.0.53

### Patch Changes

- [#5723](https://github.com/assistant-ui/assistant-ui/pull/5723) [`94dc3e5`](https://github.com/assistant-ui/assistant-ui/commit/94dc3e509fa2b4fae1a14c88ec34b910c8d95af8) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`94dc3e5`](https://github.com/assistant-ui/assistant-ui/commit/94dc3e509fa2b4fae1a14c88ec34b910c8d95af8), [`ab57969`](https://github.com/assistant-ui/assistant-ui/commit/ab5796932c97bc5bade19022e2ac8762949d2967)]:
  - assistant-stream@0.3.36
  - @assistant-ui/core@0.3.10
  - @assistant-ui/react-generative-ui@0.0.13
  - @assistant-ui/store@0.3.8

## 0.0.52

### Patch Changes

- [#5684](https://github.com/assistant-ui/assistant-ui/pull/5684) [`20bda3c`](https://github.com/assistant-ui/assistant-ui/commit/20bda3c29c879b4ae5ac385a7bed491467634a79) - fix: send `description: ""` for a tool registered without one, so `RunAgentInput` stays valid against the AG-UI schema. previously the key was dropped from the payload entirely and validating servers rejected the run. also types the `runAgent` call site against the upstream parameters. ([@samdickson22](https://github.com/samdickson22))

- [#5670](https://github.com/assistant-ui/assistant-ui/pull/5670) [`a87c192`](https://github.com/assistant-ui/assistant-ui/commit/a87c1922027dbb5698736d7541b01b06e0d41689) - fix: isolate runtime lifecycle callback failures ([@Kinfe123](https://github.com/Kinfe123))

- Updated dependencies [[`456b056`](https://github.com/assistant-ui/assistant-ui/commit/456b056b2859994bf49ed5cc4cf031f0601e2174), [`99d09c8`](https://github.com/assistant-ui/assistant-ui/commit/99d09c828c04bfca35d091e73f29c6d6643dfb01), [`a88751d`](https://github.com/assistant-ui/assistant-ui/commit/a88751d71edfd2516f266ce8889081749fba4e5a), [`79253f2`](https://github.com/assistant-ui/assistant-ui/commit/79253f2a5e0a637c8907ba30859f308ff6dcd1c4), [`4e99deb`](https://github.com/assistant-ui/assistant-ui/commit/4e99deb80dc3401480f80c7bef31acbf86a71573), [`2af514c`](https://github.com/assistant-ui/assistant-ui/commit/2af514cabbf6d7d52cb0fd20ef8d1e842294ebb3)]:
  - assistant-stream@0.3.35
  - @assistant-ui/core@0.3.8
  - @assistant-ui/store@0.3.7

## 0.0.51

### Patch Changes

- [#5622](https://github.com/assistant-ui/assistant-ui/pull/5622) [`7bd72be`](https://github.com/assistant-ui/assistant-ui/commit/7bd72be63b57ab532bb174c49617b2f520116a44) - fix: abort AG-UI HTTP requests when cancelling runs ([@rupic-app](https://github.com/apps/rupic-app))

- [#5649](https://github.com/assistant-ui/assistant-ui/pull/5649) [`baa6e2e`](https://github.com/assistant-ui/assistant-ui/commit/baa6e2e23e22089ee83ec1d9dca5262d5b91e94c) - feat: add unstable_enableMessageQueue so a send during a run is buffered instead of swallowed ([@okisdev](https://github.com/okisdev))

- [#5650](https://github.com/assistant-ui/assistant-ui/pull/5650) [`34cec64`](https://github.com/assistant-ui/assistant-ui/commit/34cec64fcfbdef0e101d731f5518e9075d989e2f) - feat: two-lane, placement-aware message queue with steer-by-default mid-run sends ([@Yonom](https://github.com/Yonom))

  `ExternalThreadQueueAdapter` is reshaped: `enqueue(message, { steer })` splits into
  `enqueue(message)` / `steer(message)`, `steer(queueItemId)` becomes
  `move(queueItemId, { lane: "steer", insertAfter: null })`, `clear(reason)` is dropped
  (queue clear policy is now host-owned), and `steerItems` / `move` / `edit` and
  `QueueItemState.parts` are required.

- Updated dependencies [[`dcacd9b`](https://github.com/assistant-ui/assistant-ui/commit/dcacd9bc45117f9beca698006fd67616d2c1ca61), [`d52928d`](https://github.com/assistant-ui/assistant-ui/commit/d52928db2c83a3ba6f25bf8c6b21934571dd4622), [`d8a59ad`](https://github.com/assistant-ui/assistant-ui/commit/d8a59ad5d75f220e76e689d4191855c244ddc20a), [`0578c16`](https://github.com/assistant-ui/assistant-ui/commit/0578c16296fa5fb6b42455195ccf5f9a681693a5), [`e70da91`](https://github.com/assistant-ui/assistant-ui/commit/e70da91866a5ac880472fbcf23039909270f7623), [`aac3a8c`](https://github.com/assistant-ui/assistant-ui/commit/aac3a8cb8824472f694226a4c53829a0a693072e), [`aa302ee`](https://github.com/assistant-ui/assistant-ui/commit/aa302eeaacd399f58b74b64eb3a1e17d9ea97e03), [`aa302ee`](https://github.com/assistant-ui/assistant-ui/commit/aa302eeaacd399f58b74b64eb3a1e17d9ea97e03), [`34cec64`](https://github.com/assistant-ui/assistant-ui/commit/34cec64fcfbdef0e101d731f5518e9075d989e2f)]:
  - @assistant-ui/store@0.3.4
  - @assistant-ui/core@0.3.6
  - assistant-stream@0.3.34
  - @assistant-ui/react-generative-ui@0.0.12

## 0.0.50

### Patch Changes

- [#5461](https://github.com/assistant-ui/assistant-ui/pull/5461) [`1fae3c6`](https://github.com/assistant-ui/assistant-ui/commit/1fae3c6439bac1875bbf0627125e534be8772934) - fix: convert file parts placed directly in message content ([@okisdev](https://github.com/okisdev))

  `buildUserContent` filtered every `file` part out of `message.content`, on the stated grounds that binary always flows through `message.attachments`. That rule was not actually implemented: `image` and `audio` content parts, equally binary, were converted from content all along, so only `file` was excluded. It also guarded nothing, because both composer paths put binary in attachments and leave content as text (the edit composer lifts non-text parts with `liftNonTextParts` and passes none through), and because content-sourced and attachment-sourced parts land in the same flat `InputContent[]` with no downstream distinction. The only way a file part reached that filter was a deliberate `append()`, where it was silently dropped.

- [#5445](https://github.com/assistant-ui/assistant-ui/pull/5445) [`2fdff87`](https://github.com/assistant-ui/assistant-ui/commit/2fdff878211979b1f24d746bf2f16d8b6254102d) - feat: honor sourceType "url" in a2a, ag-ui, and adk file converters ([@ShobhitPatra](https://github.com/ShobhitPatra))

- Updated dependencies [[`b19c2f5`](https://github.com/assistant-ui/assistant-ui/commit/b19c2f5efd37e1203502c76d92e0554b63020952), [`01140bd`](https://github.com/assistant-ui/assistant-ui/commit/01140bde14fbfa89af9bdd080bbf79b3a509b524), [`8c99934`](https://github.com/assistant-ui/assistant-ui/commit/8c99934ca7fe9a8ffea0aa972e3579ff74e18553), [`ece5a54`](https://github.com/assistant-ui/assistant-ui/commit/ece5a5422e8b45429e1681b7a845d68be2879834), [`2fdff87`](https://github.com/assistant-ui/assistant-ui/commit/2fdff878211979b1f24d746bf2f16d8b6254102d), [`90b3003`](https://github.com/assistant-ui/assistant-ui/commit/90b3003b943e083fa6cd81e30181bf5b88904361), [`4c313cf`](https://github.com/assistant-ui/assistant-ui/commit/4c313cfabe9802a7e59362c323ec926a24d089d4), [`55b2824`](https://github.com/assistant-ui/assistant-ui/commit/55b282476bf3075beff391978a72a13968b6418a), [`22b05a4`](https://github.com/assistant-ui/assistant-ui/commit/22b05a43ec921a6dd7015692a77a746656a61f5f), [`f913c21`](https://github.com/assistant-ui/assistant-ui/commit/f913c2142708d8cd1f4ac63bd801e5b6defcb74e), [`c868710`](https://github.com/assistant-ui/assistant-ui/commit/c8687104b0407f424d55dd0a369d692fe7a4c708), [`011e275`](https://github.com/assistant-ui/assistant-ui/commit/011e275c4df5cd85942b5fd545a74d9c7cf549a6), [`da32fe0`](https://github.com/assistant-ui/assistant-ui/commit/da32fe0b2f51c8a340935c5f4d2e31e747d39460), [`f913c21`](https://github.com/assistant-ui/assistant-ui/commit/f913c2142708d8cd1f4ac63bd801e5b6defcb74e), [`5bb2573`](https://github.com/assistant-ui/assistant-ui/commit/5bb25733674396d496046b7c5443366171d0e8cf), [`5ececc1`](https://github.com/assistant-ui/assistant-ui/commit/5ececc1df536e098f8ee252addd2e62be7d61a7a)]:
  - @assistant-ui/core@0.3.4
  - assistant-stream@0.3.32
  - @assistant-ui/store@0.3.3

## 0.0.49

### Patch Changes

- [#5386](https://github.com/assistant-ui/assistant-ui/pull/5386) [`d9502b2`](https://github.com/assistant-ui/assistant-ui/commit/d9502b24b86ff59f1a68b1a2d30db3491d16f2e0) - feat: send A2UI actions back to the agent as forwardedProps.a2uiAction on the next run ([@okisdev](https://github.com/okisdev))

- [#5329](https://github.com/assistant-ui/assistant-ui/pull/5329) [`f30b54c`](https://github.com/assistant-ui/assistant-ui/commit/f30b54c9856d50a18f738c4d485c02bcd039151c) - refactor: move createRuntimeExtras to the @assistant-ui/core/react entry and drop the internal re-export ([@okisdev](https://github.com/okisdev))

- [#5314](https://github.com/assistant-ui/assistant-ui/pull/5314) [`3d45df9`](https://github.com/assistant-ui/assistant-ui/commit/3d45df9626ebb8f8403e6e209329de2accdaa0a4) - feat: read the canonical nested `_meta.ui.resourceUri` MCP Apps pointer, keeping the deprecated flat `"ui/resourceUri"` key as a fallback ([@okisdev](https://github.com/okisdev))

- [#5345](https://github.com/assistant-ui/assistant-ui/pull/5345) [`ed3794c`](https://github.com/assistant-ui/assistant-ui/commit/ed3794c031d5d1eff36d0336140cf9f253e1a314) - feat: consume a2ui-surface activity snapshots and render A2UI surfaces as present tool-call parts ([@okisdev](https://github.com/okisdev))

- [#5352](https://github.com/assistant-ui/assistant-ui/pull/5352) [`4a9a765`](https://github.com/assistant-ui/assistant-ui/commit/4a9a7650503956b3397fe5a4d5e74794ba40ec07) - feat: rehydrate A2UI surfaces from restored activity history ([@rupic-app](https://github.com/apps/rupic-app))

- [#5315](https://github.com/assistant-ui/assistant-ui/pull/5315) [`676c751`](https://github.com/assistant-ui/assistant-ui/commit/676c75178c59bfd497e58b30b2fecabf66be7929) - fix: forward audio message parts and skip data parts instead of dropping or throwing ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#5311](https://github.com/assistant-ui/assistant-ui/pull/5311) [`34e95a1`](https://github.com/assistant-ui/assistant-ui/commit/34e95a1c2fe39ffa1ba7521d2f983e30d2c35c1f) - fix: keep streaming across mid-run MESSAGES_SNAPSHOT imports. The active assistant is preserved and re-anchored when the snapshot omits it, and when a snapshot shape still evicts it, the placeholder is recreated under its original id on the next content-bearing emit, so neither the token stream nor the message identity is lost. ([@Gujiassh](https://github.com/Gujiassh))

- Updated dependencies [[`d2e7a4a`](https://github.com/assistant-ui/assistant-ui/commit/d2e7a4a1c71c214fd8c4363ec16e879d1122639e), [`ecd7c87`](https://github.com/assistant-ui/assistant-ui/commit/ecd7c879cace69d6371b3f673c52a80669377fc0), [`2daf2d5`](https://github.com/assistant-ui/assistant-ui/commit/2daf2d5dfcb77938f6deb63d048575540e1806a2), [`a5bdbed`](https://github.com/assistant-ui/assistant-ui/commit/a5bdbed993d8f14c919b692b40d51f5cd64467b9), [`fb993c3`](https://github.com/assistant-ui/assistant-ui/commit/fb993c34ca1623bac373137c5ab207dd79cb500c), [`3ae058c`](https://github.com/assistant-ui/assistant-ui/commit/3ae058c5d275e2444701da70a6513528439ecb3e), [`f30b54c`](https://github.com/assistant-ui/assistant-ui/commit/f30b54c9856d50a18f738c4d485c02bcd039151c), [`7f9b91f`](https://github.com/assistant-ui/assistant-ui/commit/7f9b91fc0b356286b66e7751339aa19d0d220f29), [`936c52c`](https://github.com/assistant-ui/assistant-ui/commit/936c52c4301b89242572d9890c870050f63cbe93), [`ee87dd9`](https://github.com/assistant-ui/assistant-ui/commit/ee87dd9fef1389165bbfe0019be2a6995b2cfb24), [`e41734c`](https://github.com/assistant-ui/assistant-ui/commit/e41734c102a192ab772703899d7980bb5c055d07), [`1c5266c`](https://github.com/assistant-ui/assistant-ui/commit/1c5266c1fb32bc71647fedc485372f6ffa25171f), [`cdcdbd0`](https://github.com/assistant-ui/assistant-ui/commit/cdcdbd0a9354483a72edbc01f51a850a1d6b5dc5), [`42dbc69`](https://github.com/assistant-ui/assistant-ui/commit/42dbc697642c0fa327728860f78a8ce5270bf32d), [`25f1e4f`](https://github.com/assistant-ui/assistant-ui/commit/25f1e4f9d33073216458d3c5a05e8d79845d4b3b), [`d16e62d`](https://github.com/assistant-ui/assistant-ui/commit/d16e62d25b5c1e7e2bc1504fb4a5e97c3c25b6e3), [`60d049e`](https://github.com/assistant-ui/assistant-ui/commit/60d049eeadf681f4235157c903543493c98cc258), [`8643393`](https://github.com/assistant-ui/assistant-ui/commit/8643393490ebe1aa86661f705bb9ac907bfb4eac), [`2eca438`](https://github.com/assistant-ui/assistant-ui/commit/2eca4386778618f555258855ee6612eb44d89bb2), [`23ee5db`](https://github.com/assistant-ui/assistant-ui/commit/23ee5dbb60e6ac7993b8ce4023fb63a5f7eea713), [`f4aabe9`](https://github.com/assistant-ui/assistant-ui/commit/f4aabe9ca57d14a13e60932c4cc41e8b4864a21c)]:
  - @assistant-ui/store@0.3.2
  - @assistant-ui/core@0.3.2
  - @assistant-ui/react-generative-ui@0.0.11
  - assistant-stream@0.3.31

## 0.0.48

### Patch Changes

- Updated dependencies [[`9a7e776`](https://github.com/assistant-ui/assistant-ui/commit/9a7e77603d59b5e091ee922e2e087f0101679321), [`ae5f831`](https://github.com/assistant-ui/assistant-ui/commit/ae5f83129b20edb38b7f9e7f92b6c60f3c8fe8d9), [`a196711`](https://github.com/assistant-ui/assistant-ui/commit/a1967113d52c6e5751af7ae4109c13b6a322fe23), [`f78e579`](https://github.com/assistant-ui/assistant-ui/commit/f78e5794d8d9d2f1c815485cb39a56f1072ed795), [`dcc41bb`](https://github.com/assistant-ui/assistant-ui/commit/dcc41bb50948f64744a052b22720f0f8dffa510e), [`2f5d0d4`](https://github.com/assistant-ui/assistant-ui/commit/2f5d0d441caf6a152bf4eef13566a2f9a161541c)]:
  - @assistant-ui/store@0.3.0
  - @assistant-ui/core@0.3.0
  - assistant-stream@0.3.29

## 0.0.47

### Patch Changes

- [#5225](https://github.com/assistant-ui/assistant-ui/pull/5225) [`1f8e80c`](https://github.com/assistant-ui/assistant-ui/commit/1f8e80c6f1c807be5c5bad0b9089906c1222c914) - feat: reconstruct `mcp.app` on restored tool-call parts in `fromAgUiMessages` from the `_meta["ui/resourceUri"]` MCP-UI pointer, so `getMcpAppFromToolPart` resolves the app on restored history instead of leaving `McpAppRenderer` on its fallback; effective for transports that preserve `_meta` (the standard `@ag-ui/client` HTTP transport strips it until upstream `ToolMessageSchema` gains a passthrough, agno-agi/agno#9087) ([@rupic-app](https://github.com/apps/rupic-app))

- Updated dependencies [[`f9c1b0f`](https://github.com/assistant-ui/assistant-ui/commit/f9c1b0fec5ac4cae09c1c9da77f901c0799140ad), [`235c17e`](https://github.com/assistant-ui/assistant-ui/commit/235c17e22acae8a643c583905f3bf90955651794), [`6225d6a`](https://github.com/assistant-ui/assistant-ui/commit/6225d6a6e1bc1be99983e19441e62d0bbd849ac5), [`801781c`](https://github.com/assistant-ui/assistant-ui/commit/801781c18b8097e0cd968f1421a43beaf41fdf24), [`d4bdf2c`](https://github.com/assistant-ui/assistant-ui/commit/d4bdf2c50f741912c1c165bd65441ff91bc632dc), [`a0ddc86`](https://github.com/assistant-ui/assistant-ui/commit/a0ddc862b0c506bd791238ebf800868e4836820a), [`cee74f1`](https://github.com/assistant-ui/assistant-ui/commit/cee74f1302299f0cf662ee7ad83ea552a1a3ac2d), [`cf839ff`](https://github.com/assistant-ui/assistant-ui/commit/cf839ff72efe8852072a1323b902e540f0a1d9d2), [`396ea1f`](https://github.com/assistant-ui/assistant-ui/commit/396ea1fda2cbee9a254daba7531a50d5ac62b961), [`e1f27d8`](https://github.com/assistant-ui/assistant-ui/commit/e1f27d8ca87443569aede02ceba0ca99e1a9e4a3), [`3e8f59e`](https://github.com/assistant-ui/assistant-ui/commit/3e8f59e1e0732f473cb190c9fcc423503ca4d32d), [`06f5266`](https://github.com/assistant-ui/assistant-ui/commit/06f5266bf8d7d347020c113c089b199b182a0099), [`d319637`](https://github.com/assistant-ui/assistant-ui/commit/d319637df1297b7aa589a77ff268467270a85386)]:
  - assistant-stream@0.3.28
  - @assistant-ui/core@0.2.23
  - @assistant-ui/store@0.2.22

## 0.0.46

### Patch Changes

- [#5025](https://github.com/assistant-ui/assistant-ui/pull/5025) [`d15791c`](https://github.com/assistant-ui/assistant-ui/commit/d15791c791536c2f72f376279440379fc6c9e19e) - refactor: share interrupt-response validation between submitInterruptResponses and steerAway ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#5110](https://github.com/assistant-ui/assistant-ui/pull/5110) [`8150626`](https://github.com/assistant-ui/assistant-ui/commit/815062662b59ce9ef00dc3b3b86ba5bbaf423b59) - fix: apply mcp-apps ACTIVITY_SNAPSHOT events to tool calls from restored history ([@VihaanAgarwal](https://github.com/VihaanAgarwal))

- [#5095](https://github.com/assistant-ui/assistant-ui/pull/5095) [`1e3e195`](https://github.com/assistant-ui/assistant-ui/commit/1e3e19533856711665056ebbc19c83ad9bd4229c) - fix: preserve MCP Host fields in AG-UI tool results and restored history ([@samdickson22](https://github.com/samdickson22))

- [#5039](https://github.com/assistant-ui/assistant-ui/pull/5039) [`8faad07`](https://github.com/assistant-ui/assistant-ui/commit/8faad07801875f2877635380179a18a7fd4f3193) - refactor: share parseDataUrl and httpUrlPattern from core internal ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#5079](https://github.com/assistant-ui/assistant-ui/pull/5079) [`390e417`](https://github.com/assistant-ui/assistant-ui/commit/390e4177ca47f7ece839613ad0f076add9313328) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`8630186`](https://github.com/assistant-ui/assistant-ui/commit/8630186c86f651bd5e3db9901de14b3feff073ec), [`908ec91`](https://github.com/assistant-ui/assistant-ui/commit/908ec91a15b247b629fbcee6fd8b7af620af6632), [`0d0834d`](https://github.com/assistant-ui/assistant-ui/commit/0d0834d77967eb3f68198c48597a3bb9c6f474cb), [`3355098`](https://github.com/assistant-ui/assistant-ui/commit/33550987bbed0ffaa424218e4d415cb8a4191f72), [`79034bb`](https://github.com/assistant-ui/assistant-ui/commit/79034bbfe8da82c3739969bf7b4cc744910d203a), [`7207b19`](https://github.com/assistant-ui/assistant-ui/commit/7207b19041c4ceed31acc1b28d39836f99d4eae6), [`446a118`](https://github.com/assistant-ui/assistant-ui/commit/446a1187d38f3ca8ce12b1f0ac739400cb32d63e), [`a081656`](https://github.com/assistant-ui/assistant-ui/commit/a0816568bcb0632a67f6e09dc0c90e76cc2b50cc), [`25a5be0`](https://github.com/assistant-ui/assistant-ui/commit/25a5be0c8b7101a382ee7fc31102bdf4fb7ad114), [`b17d392`](https://github.com/assistant-ui/assistant-ui/commit/b17d3929d785cb418615d18b739fb9e3b7b53728), [`20643e2`](https://github.com/assistant-ui/assistant-ui/commit/20643e299a3d9eeb73d73dca72d4b70220f4dc0b), [`47562fd`](https://github.com/assistant-ui/assistant-ui/commit/47562fd231b35fe41c61b437ff66021f9cf0e554), [`afacb10`](https://github.com/assistant-ui/assistant-ui/commit/afacb1081447b899e6e84df969ec1ac9b6d8609f), [`af6c945`](https://github.com/assistant-ui/assistant-ui/commit/af6c9450f0242c4eee3d9e03f82f20efe8c9a89b), [`33924df`](https://github.com/assistant-ui/assistant-ui/commit/33924df40ad3463f4e589617876d2496f48936ec), [`19cfdcd`](https://github.com/assistant-ui/assistant-ui/commit/19cfdcdfdc6778a3ed3f607f694787fe1ef54612), [`044def8`](https://github.com/assistant-ui/assistant-ui/commit/044def8b0c6173dbed5a888993c55933d6a81177), [`039b75f`](https://github.com/assistant-ui/assistant-ui/commit/039b75f91f189a8cb391bb6ea75c87cddefaaebb), [`5e4dd9f`](https://github.com/assistant-ui/assistant-ui/commit/5e4dd9fd00161fd79df60821d2b9af0cd7ebcefd), [`5da0d93`](https://github.com/assistant-ui/assistant-ui/commit/5da0d93808089b9fca35667ab442dff196de46b8), [`85d4976`](https://github.com/assistant-ui/assistant-ui/commit/85d49764ca3585fc553257dafa00a47830727e36), [`5135400`](https://github.com/assistant-ui/assistant-ui/commit/5135400d054297889312b9ae03fe803443ee2fae), [`fc6b4ad`](https://github.com/assistant-ui/assistant-ui/commit/fc6b4ad0c77d195bb69148536e52759d13df2a99), [`121ee83`](https://github.com/assistant-ui/assistant-ui/commit/121ee830d7d26a7db0a8007c0394ffa86c7d56d9), [`2b2587a`](https://github.com/assistant-ui/assistant-ui/commit/2b2587ac09bfe09d552915300b8dcf5b5bb7107d), [`ca80153`](https://github.com/assistant-ui/assistant-ui/commit/ca801537e02bbab09532d0f505992778d282dddb), [`e4ce1a2`](https://github.com/assistant-ui/assistant-ui/commit/e4ce1a2a59faaa117cd8bd819a7c2a5c3bc9c6a6), [`f2f5e83`](https://github.com/assistant-ui/assistant-ui/commit/f2f5e8361fa5cee5c67ede5b5dac239416aa32ac), [`ec8ee6a`](https://github.com/assistant-ui/assistant-ui/commit/ec8ee6a84975632c2ec28f20e7d9cb8a16573495), [`9a343db`](https://github.com/assistant-ui/assistant-ui/commit/9a343db871ceab7e574bfcec9ab22af0ddaf1841), [`666aaab`](https://github.com/assistant-ui/assistant-ui/commit/666aaab6ac3a64ec0f58c3ae958186a9880d8764), [`c1b1750`](https://github.com/assistant-ui/assistant-ui/commit/c1b175040e49ecb82b43d2713536aef7a1f2300e), [`f263c9e`](https://github.com/assistant-ui/assistant-ui/commit/f263c9e827f3ed96f6773b3d8d14f573e53ee941), [`475fca3`](https://github.com/assistant-ui/assistant-ui/commit/475fca35d81a2f30909566e2b3703f5fbce76869), [`8faad07`](https://github.com/assistant-ui/assistant-ui/commit/8faad07801875f2877635380179a18a7fd4f3193), [`61518b9`](https://github.com/assistant-ui/assistant-ui/commit/61518b99c11c49f439fc9411187b1cb148777b79), [`5412099`](https://github.com/assistant-ui/assistant-ui/commit/541209975bdc380edf7b34ecc270c201abd14788), [`1eb7275`](https://github.com/assistant-ui/assistant-ui/commit/1eb72757257d1919b2c198c8700deb79ff280253), [`c47bdf4`](https://github.com/assistant-ui/assistant-ui/commit/c47bdf475381d2b79abed6201157984afa1e22c4), [`ba948d8`](https://github.com/assistant-ui/assistant-ui/commit/ba948d8192b8c4bf12cbe60ece4d0f2d11506aa6), [`de54334`](https://github.com/assistant-ui/assistant-ui/commit/de54334ab8416be1a5ec9ebcebc58258bb80cbd5), [`44aac58`](https://github.com/assistant-ui/assistant-ui/commit/44aac5834cff3a4f985b3b0aefe31c8b7951732f), [`9402648`](https://github.com/assistant-ui/assistant-ui/commit/94026488709d1fcc4ed446f39e2dcb78f9eb1daf), [`4651ea5`](https://github.com/assistant-ui/assistant-ui/commit/4651ea5b003bcd56d82e0bb3de16f918d6722906), [`2f69f68`](https://github.com/assistant-ui/assistant-ui/commit/2f69f682d2490c945acb378cdf33052e69d40790), [`390e417`](https://github.com/assistant-ui/assistant-ui/commit/390e4177ca47f7ece839613ad0f076add9313328), [`2bc6798`](https://github.com/assistant-ui/assistant-ui/commit/2bc6798346378fd6c1f8b7e8423fda162d7f3a27)]:
  - assistant-stream@0.3.27
  - @assistant-ui/core@0.2.22
  - @assistant-ui/store@0.2.21

## 0.0.45

### Patch Changes

- [#4828](https://github.com/assistant-ui/assistant-ui/pull/4828) [`9e23265`](https://github.com/assistant-ui/assistant-ui/commit/9e232652fb423c621fb27bf4113520879d14d4dd) - feat: useAgUiState and useAgUiSetState hooks exposing shared agent state with optimistic updates that ride the next run ([@okisdev](https://github.com/okisdev))

- [#4760](https://github.com/assistant-ui/assistant-ui/pull/4760) [`15b9ac2`](https://github.com/assistant-ui/assistant-ui/commit/15b9ac24d7309768f70ed1e66526e4f7c1112bb6) - feat: auto-cancel pending client-side tool calls on send, edit, and reload (opt out with autoCancelPendingToolCalls: false) ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4776](https://github.com/assistant-ui/assistant-ui/pull/4776) [`a5ce81a`](https://github.com/assistant-ui/assistant-ui/commit/a5ce81a662a71aecbb4cad711695df131d9ee4a7) - fix: preserve branchable history loaded by the AG-UI runtime ([@Kinfe123](https://github.com/Kinfe123))

- [#4938](https://github.com/assistant-ui/assistant-ui/pull/4938) [`477d08e`](https://github.com/assistant-ui/assistant-ui/commit/477d08e357e7fe908c385f3d3214f5a3ac302b50) - refactor: back AG-UI thread state with a MessageRepository source of truth ([@okisdev](https://github.com/okisdev))

- [#4976](https://github.com/assistant-ui/assistant-ui/pull/4976) [`f1dcd8b`](https://github.com/assistant-ui/assistant-ui/commit/f1dcd8bf4e8ad77243f70dc6bb2706971f743135) - chore: reformat with oxfmt 0.59 ([@okisdev](https://github.com/okisdev))

- [#4898](https://github.com/assistant-ui/assistant-ui/pull/4898) [`a84cf6d`](https://github.com/assistant-ui/assistant-ui/commit/a84cf6ddc37ba7a7ea7244eb73e5d40a00ea5e24) - feat: plumb an optional serverId through MCP Apps metadata and host calls for multi-MCP routing ([@okisdev](https://github.com/okisdev))

- [#4674](https://github.com/assistant-ui/assistant-ui/pull/4674) [`16d5ec4`](https://github.com/assistant-ui/assistant-ui/commit/16d5ec4f1485fae0ae610c3064ec3cd2c99d97a0) - feat: steer-away cancels pending client-side tool calls ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4895](https://github.com/assistant-ui/assistant-ui/pull/4895) [`139f7c5`](https://github.com/assistant-ui/assistant-ui/commit/139f7c5b67caf01e38a07a08b34883d1cd19eb79) - feat: surface the mcp-apps ACTIVITY_SNAPSHOT CallToolResult on the tool part result while preserving the model-facing text for subsequent runs ([@okisdev](https://github.com/okisdev))

- [#4815](https://github.com/assistant-ui/assistant-ui/pull/4815) [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`43b8ce8`](https://github.com/assistant-ui/assistant-ui/commit/43b8ce862520e1f53d837407c5fcd7106c9ffd7c), [`1e926b6`](https://github.com/assistant-ui/assistant-ui/commit/1e926b68a8f61d5d099a53c89ad25b168872b853), [`d6c7571`](https://github.com/assistant-ui/assistant-ui/commit/d6c757149df4cc66aa3261a3bd3beb041cac6c49), [`4d7a447`](https://github.com/assistant-ui/assistant-ui/commit/4d7a4479b2dd673e3f5a356c4dd763f3aa72053d), [`ca751f4`](https://github.com/assistant-ui/assistant-ui/commit/ca751f41905a82e9b1622d100af62b8b31314a5c), [`2aca5e0`](https://github.com/assistant-ui/assistant-ui/commit/2aca5e09337b5b867562e6280b8cc6d49763e845), [`908af6d`](https://github.com/assistant-ui/assistant-ui/commit/908af6d6104b355c3097fcf77367bed1bf5541b8), [`1b46551`](https://github.com/assistant-ui/assistant-ui/commit/1b465515f38be1d7d4e844ab5d95c90537745d15), [`7865f67`](https://github.com/assistant-ui/assistant-ui/commit/7865f6730d0a98e43bc27d5a0482bc43f2678de5), [`438ecd3`](https://github.com/assistant-ui/assistant-ui/commit/438ecd350d5f14e5c5d329d6f4c0689b491c0845), [`5a34e8c`](https://github.com/assistant-ui/assistant-ui/commit/5a34e8c2721b02e7a115d085bc09a447e0d3caa9), [`5dbbac4`](https://github.com/assistant-ui/assistant-ui/commit/5dbbac4f49b6269c1017f11c9bf6da2909fa6c96), [`d3bd0ed`](https://github.com/assistant-ui/assistant-ui/commit/d3bd0ede457f50043ff59f8987f59b16c675ef01), [`84e8ddf`](https://github.com/assistant-ui/assistant-ui/commit/84e8ddf548d808d74d84b6be5a8ed28642baad3d), [`8282269`](https://github.com/assistant-ui/assistant-ui/commit/8282269f0864bc43c999cd209fbbee035ee53641), [`03ffe44`](https://github.com/assistant-ui/assistant-ui/commit/03ffe44808f4898a2862e608db7258682cf12383), [`38bf104`](https://github.com/assistant-ui/assistant-ui/commit/38bf1045406da7eff1b9c5847e4e7db96d327c2c), [`19b2a00`](https://github.com/assistant-ui/assistant-ui/commit/19b2a00add7f1900bc3fed579759400fc241747c), [`77c7b26`](https://github.com/assistant-ui/assistant-ui/commit/77c7b269795c7aad03ce83e7e574425c3e0f26c8), [`026a7ae`](https://github.com/assistant-ui/assistant-ui/commit/026a7aeabc8134d3ecb26127225ebf0070267261), [`160b0af`](https://github.com/assistant-ui/assistant-ui/commit/160b0afa773b13a5e0f462cf05b7661baa1627f5), [`c814c9c`](https://github.com/assistant-ui/assistant-ui/commit/c814c9cf562a66ab3864ca0472d667902ebc131b), [`6be3b67`](https://github.com/assistant-ui/assistant-ui/commit/6be3b6781b3ddd178208bc9de15326ab35d496d4), [`c590a21`](https://github.com/assistant-ui/assistant-ui/commit/c590a21a63405f5a52a6d372e003afca06cf4a1e), [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98), [`a84cf6d`](https://github.com/assistant-ui/assistant-ui/commit/a84cf6ddc37ba7a7ea7244eb73e5d40a00ea5e24), [`9f99c46`](https://github.com/assistant-ui/assistant-ui/commit/9f99c46ca1ca724081466f97c7e17eda316e8fb3), [`c2d2271`](https://github.com/assistant-ui/assistant-ui/commit/c2d2271b9709c235da18036a0edd5283ce279916), [`e3aba86`](https://github.com/assistant-ui/assistant-ui/commit/e3aba86b7a788261d25921e4a58cebbe7a59fb44), [`25f9eb2`](https://github.com/assistant-ui/assistant-ui/commit/25f9eb2caacade2e5522f92e3221ee8173da0608), [`84e8ddf`](https://github.com/assistant-ui/assistant-ui/commit/84e8ddf548d808d74d84b6be5a8ed28642baad3d), [`d03e5cf`](https://github.com/assistant-ui/assistant-ui/commit/d03e5cf0e6efada832503fedc565a1fb8f14676a), [`ef81c86`](https://github.com/assistant-ui/assistant-ui/commit/ef81c869a3292175a32f0d924e911564a07d439b), [`5ade3a5`](https://github.com/assistant-ui/assistant-ui/commit/5ade3a500498b59a4449f46d443ced8a1e3136be), [`1f284ac`](https://github.com/assistant-ui/assistant-ui/commit/1f284ac2f4e20b0daebfdb6829a44ba0a56033b3), [`65ba32a`](https://github.com/assistant-ui/assistant-ui/commit/65ba32a956661804203450cfb9a2b0285450da9d), [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac)]:
  - assistant-stream@0.3.26
  - @assistant-ui/core@0.2.21
  - @assistant-ui/store@0.2.20

## 0.0.44

### Patch Changes

- [#4615](https://github.com/assistant-ui/assistant-ui/pull/4615) [`c4fcb07`](https://github.com/assistant-ui/assistant-ui/commit/c4fcb073016aa1177307c089c57e96e502ba8a0a) - feat(react-ag-ui): restore interrupt status in fromAgUiMessages from persisted metadata ([@ShobhitPatra](https://github.com/ShobhitPatra))

- Updated dependencies [[`523e0b5`](https://github.com/assistant-ui/assistant-ui/commit/523e0b563a71a656f050473c42c414b26c2d5ab4), [`f833bc1`](https://github.com/assistant-ui/assistant-ui/commit/f833bc118b49641f3f6e0ab22bcfc63bf0a04408)]:
  - @assistant-ui/core@0.2.20
  - assistant-stream@0.3.25

## 0.0.43

### Patch Changes

- [#4538](https://github.com/assistant-ui/assistant-ui/pull/4538) [`13df77b`](https://github.com/assistant-ui/assistant-ui/commit/13df77b146e7b17fa95e2094d09b78e9bd88257b) - feat(react-ag-ui): restore requires-action status for pending tool calls in fromAgUiMessages so reloaded human-in-the-loop calls are actionable ([@okisdev](https://github.com/okisdev))

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#4533](https://github.com/assistant-ui/assistant-ui/pull/4533) [`fa4c23d`](https://github.com/assistant-ui/assistant-ui/commit/fa4c23d961a6758f8f39feffc5afe1c823132ca5) - fix: order tool-call parts by parentMessageId ([@dkachur1](https://github.com/dkachur1))

  The run aggregator appended tool-call parts in wire-arrival order. Because the messages and tool-call channels are not ordered relative to each other on the wire, a tool whose `TOOL_CALL_START` arrived after a later message's text was rendered below that text instead of under the message that spawned it. Tool-call parts are now placed adjacent to their `parentMessageId` text part (falling back to append when the parent is unknown), matching the message association the canonical `@ag-ui/client` already performs.

- [#4485](https://github.com/assistant-ui/assistant-ui/pull/4485) [`3a405b4`](https://github.com/assistant-ui/assistant-ui/commit/3a405b47e2dc965a5571ac7a33901cc7b826fff0) - feat(react-ag-ui): expose pending interrupts through the shared createRuntimeExtras + hooks.ts surface (`useAgUiInterrupts`, `useAgUiSubmitInterruptResponses`); the equivalent `unstable_getPendingInterrupts` / `unstable_submitInterruptResponses` runtime methods are now deprecated but keep working ([@okisdev](https://github.com/okisdev))

- [#4493](https://github.com/assistant-ui/assistant-ui/pull/4493) [`2303d0f`](https://github.com/assistant-ui/assistant-ui/commit/2303d0f4cbad1f2c483ae78967c6bb84352888ea) - feat(react-ag-ui): add `useAgUiSteerAway` to send a new message while an AG-UI interrupt is pending; it accepts a string or partial message (the parent defaults to the head), cancels every open interrupt as `{status:"cancelled"}` on the wire (honoring the AG-UI interrupts spec), and resumes the run instead of throwing. pass `responses` to resolve specific interrupts while cancelling the rest ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`ddc40b7`](https://github.com/assistant-ui/assistant-ui/commit/ddc40b7791563057749ecf1121e15d19574479ff), [`ea52de0`](https://github.com/assistant-ui/assistant-ui/commit/ea52de06368853b7af7ac6755b157ec5305a8494), [`29c6fdb`](https://github.com/assistant-ui/assistant-ui/commit/29c6fdbc8ede04fb2647b0a47184003ee3c2f090), [`d0987a3`](https://github.com/assistant-ui/assistant-ui/commit/d0987a32540880e5058ee529fd52a3efb4298706), [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff), [`0c51b90`](https://github.com/assistant-ui/assistant-ui/commit/0c51b905d22418b93532636b1028c080ecc819e0), [`3a8f685`](https://github.com/assistant-ui/assistant-ui/commit/3a8f685e23a3e7ad76ac41e3ce6fff05714e04d3), [`ec6adf4`](https://github.com/assistant-ui/assistant-ui/commit/ec6adf4adc91fe12c7de47fc93adcc347ece8245), [`4acd4c0`](https://github.com/assistant-ui/assistant-ui/commit/4acd4c0f608da1c62bf23a666bc0fec870a27dca)]:
  - @assistant-ui/core@0.2.19
  - assistant-stream@0.3.24
  - @assistant-ui/store@0.2.19

## 0.0.42

### Patch Changes

- [#4420](https://github.com/assistant-ui/assistant-ui/pull/4420) [`fe24ad6`](https://github.com/assistant-ui/assistant-ui/commit/fe24ad645e292cc77d9bdda6b0c18ccd8be23096) - feat(react-ag-ui): apply external state from `ThreadHistoryAdapter.load()` ([@dkachur1](https://github.com/dkachur1))

  `onSwitchToThread` already applies returned `state` via `loadExternalState`, but the history `load()` path did not, so state restored on a fresh page load was dropped. `ThreadHistoryAdapter.load()` may now return an optional `state`, and `AgUiThreadRuntimeCore` applies it — making both load paths symmetric.

- Updated dependencies [[`68dfbaa`](https://github.com/assistant-ui/assistant-ui/commit/68dfbaa348fba7ccec251c63d0c5cc8765e42a64), [`fe24ad6`](https://github.com/assistant-ui/assistant-ui/commit/fe24ad645e292cc77d9bdda6b0c18ccd8be23096)]:
  - @assistant-ui/core@0.2.18

## 0.0.41

### Patch Changes

- [#4414](https://github.com/assistant-ui/assistant-ui/pull/4414) [`344f737`](https://github.com/assistant-ui/assistant-ui/commit/344f7370511f7238db17e1982f2a43a10829604c) - chore: import `generateId` and `fromThreadMessageLike` from the public `@assistant-ui/core` entry instead of `/internal` ([@okisdev](https://github.com/okisdev))

  no behavior change; these utilities are now part of the public API.

- Updated dependencies [[`344f737`](https://github.com/assistant-ui/assistant-ui/commit/344f7370511f7238db17e1982f2a43a10829604c), [`a2e21ee`](https://github.com/assistant-ui/assistant-ui/commit/a2e21ee797761907db9b7e4559da2a41afd00fc9)]:
  - @assistant-ui/core@0.2.17

## 0.0.40

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d), [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda)]:
  - assistant-stream@0.3.23
  - @assistant-ui/core@0.2.16

## 0.0.39

### Patch Changes

- [#4381](https://github.com/assistant-ui/assistant-ui/pull/4381) [`f9db6ca`](https://github.com/assistant-ui/assistant-ui/commit/f9db6cac4dd69131c4b6668da170e742302d48cd) - feat: accept any AbstractAgent in useAgUiRuntime instead of requiring HttpAgent ([@dkachur1](https://github.com/dkachur1))

- [#4380](https://github.com/assistant-ui/assistant-ui/pull/4380) [`6f2f687`](https://github.com/assistant-ui/assistant-ui/commit/6f2f68761088b857334e005b01d835ffc10d1f05) - feat: forward the full ExternalStoreThreadListAdapter (threads, archivedThreads, onRename, onArchive, ...) through adapters.threadList so server-persisted threads can be registered and switched to; clear messages before onSwitchToThread so the previous thread's messages no longer merge in as a phantom sibling branch; onSwitchToThread can return unstable_resume to reattach to an in-flight run after switching (resumes in the background and requires a ThreadHistoryAdapter with resume(), otherwise it reports through onError instead of re-running the agent) ([@dkachur1](https://github.com/dkachur1))

- [#4362](https://github.com/assistant-ui/assistant-ui/pull/4362) [`64a6566`](https://github.com/assistant-ui/assistant-ui/commit/64a6566eea3b97735194c04b61724bd1a6b7f2dc) - fix: attach a TOOL_CALL_RESULT for a prior run's tool call to its owning message instead of synthesizing a duplicate empty-args part ([@dkachur1](https://github.com/dkachur1))

- [#4382](https://github.com/assistant-ui/assistant-ui/pull/4382) [`fa89168`](https://github.com/assistant-ui/assistant-ui/commit/fa89168083cb87e9044d8683625723bc6e629b9e) - fix: keep failed and aborted runs visible. the synthetic RUN_FINISHED from onRunFinalized used to overwrite RUN_ERROR with a successful status, so failed runs rendered as complete and MessagePrimitive.Error never showed. aborts (which @ag-ui/client routes through onRunFailed) now map to RUN_CANCELLED instead of RUN_ERROR, so the run lands as incomplete/cancelled. ([@dkachur1](https://github.com/dkachur1))

- Updated dependencies [[`c207bcd`](https://github.com/assistant-ui/assistant-ui/commit/c207bcda24468c1ae6e5adb61054a3682d3ff1d8), [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff), [`4583ca7`](https://github.com/assistant-ui/assistant-ui/commit/4583ca7477c834ef0906e7268005b469c7300cbe), [`94cc028`](https://github.com/assistant-ui/assistant-ui/commit/94cc02875b4e813e1af7020709511bb5f61e6067)]:
  - @assistant-ui/core@0.2.15
  - assistant-stream@0.3.22

## 0.0.38

### Patch Changes

- [#4321](https://github.com/assistant-ui/assistant-ui/pull/4321) [`f5e183b`](https://github.com/assistant-ui/assistant-ui/commit/f5e183bde86b96d5c0a885f59ed9d449c56e40e7) - feat: restore multimodal user input (`image`, `audio`, `video`, `document`, and legacy `binary` parts) as attachments in `fromAgUiMessages`, so persisted conversations reload attachments instead of dropping them and re-send them on the next run ([@dkachur1](https://github.com/dkachur1))

- Updated dependencies [[`ab8e5bc`](https://github.com/assistant-ui/assistant-ui/commit/ab8e5bc8650b1e39c8f01ab6c0efb80aa8baf723), [`59d252f`](https://github.com/assistant-ui/assistant-ui/commit/59d252fa09c1511acd7e31c9d8178514c5a5cb77), [`feecac3`](https://github.com/assistant-ui/assistant-ui/commit/feecac38c6ba0f8f30ec356376d1d6b19188e08f), [`5a4f20e`](https://github.com/assistant-ui/assistant-ui/commit/5a4f20e75dcd93aeb70a4a5582a0a5a1f870b4f2), [`f10b8ae`](https://github.com/assistant-ui/assistant-ui/commit/f10b8ae6659ed8df8b0c25b5bb2bb8cfa7d7a718), [`1fb5862`](https://github.com/assistant-ui/assistant-ui/commit/1fb586241534064fa48e3498f422bdaa7f382139)]:
  - @assistant-ui/core@0.2.14

## 0.0.37

### Patch Changes

- [#4317](https://github.com/assistant-ui/assistant-ui/pull/4317) [`89e603e`](https://github.com/assistant-ui/assistant-ui/commit/89e603e4ec93bb22085e7b9c0127615d97341e3e) - fix: mark the streaming assistant placeholder with `metadata.isOptimistic` so the message repository evicts it after the client→server id swap, instead of leaving a phantom empty sibling branch on every run ([@dkachur1](https://github.com/dkachur1))

- Updated dependencies [[`60ef0e9`](https://github.com/assistant-ui/assistant-ui/commit/60ef0e9ed26ceab722468332ff93c4751cc631fb), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b)]:
  - @assistant-ui/core@0.2.13

## 0.0.36

### Patch Changes

- [#4278](https://github.com/assistant-ui/assistant-ui/pull/4278) [`a4d9836`](https://github.com/assistant-ui/assistant-ui/commit/a4d9836d0ef6839b5ebe3255cd91a762ce8492d2) - feat: consume ACTIVITY_SNAPSHOT events to support MCP Apps on the AG-UI runtime ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4264](https://github.com/assistant-ui/assistant-ui/pull/4264) [`11f2321`](https://github.com/assistant-ui/assistant-ui/commit/11f23214b00541fa0ff15434f19c4130b0e94df1) - feat: export `fromAgUiMessages` from the package root ([@serhiizghama](https://github.com/serhiizghama))

  Converting persisted AG-UI messages to assistant-ui messages (e.g. when
  restoring a conversation from a `GET /agents/state` endpoint on page load)
  previously required reaching into package internals. `fromAgUiMessages` is now
  a public export, typed to return `ThreadMessageLike[]` so its output plugs
  directly into `ExportedMessageRepository.fromArray` inside a history adapter.

- [#4233](https://github.com/assistant-ui/assistant-ui/pull/4233) [`465f264`](https://github.com/assistant-ui/assistant-ui/commit/465f264322acedb61e5a5ea386383eb68accd097) - fix: import AG-UI `reasoning` messages from `MESSAGES_SNAPSHOT` ([@dkachur1](https://github.com/dkachur1))

  `fromAgUiMessages` only branched on `tool`/`assistant`/`user`/`system`, so
  `reasoning` messages in a `MESSAGES_SNAPSHOT` were silently dropped on cold
  reload even though the live `REASONING_*` (and deprecated `THINKING_*`) path
  already surfaces them. They are now converted faithfully to a `reasoning`
  assistant part. `activity` messages carry a structured payload with no
  assistant-ui message-part equivalent and remain intentionally unmapped.

- [#4232](https://github.com/assistant-ui/assistant-ui/pull/4232) [`a16baa8`](https://github.com/assistant-ui/assistant-ui/commit/a16baa8020930b149159d6c7f24ed3f5426195a5) - feat: emit AG-UI multimodal input parts (image/audio/video/document with typed data/url sources) for file attachments instead of the legacy `binary` input content ([@dkachur1](https://github.com/dkachur1))

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`2a84174`](https://github.com/assistant-ui/assistant-ui/commit/2a8417422996920c4a58be80eddc1c1740158518), [`a0a0769`](https://github.com/assistant-ui/assistant-ui/commit/a0a076915dafdb7152c9fde75b40cfddebcb2676), [`19c5b5f`](https://github.com/assistant-ui/assistant-ui/commit/19c5b5f3b1616a82ddfa928325c5e02c5786e867), [`dbdfb15`](https://github.com/assistant-ui/assistant-ui/commit/dbdfb15e8b609d3886c71fedb25a9d8345e5fc3c), [`ca191dc`](https://github.com/assistant-ui/assistant-ui/commit/ca191dc63f4a63c7d3f98566e9febd7d7f857aec), [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc), [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60), [`26a365b`](https://github.com/assistant-ui/assistant-ui/commit/26a365bb2b5bf840e21cd0caf1870627fb57c045)]:
  - @assistant-ui/core@0.2.11
  - assistant-stream@0.3.21

## 0.0.35

### Patch Changes

- [#4241](https://github.com/assistant-ui/assistant-ui/pull/4241) [`b94f545`](https://github.com/assistant-ui/assistant-ui/commit/b94f545e688ae97ead230c75b82bc1b977487ffd) - fix: preserve frontend tool results and auto-continue when they resolve before RUN_FINISHED ([@Yonom](https://github.com/Yonom))

- [#4224](https://github.com/assistant-ui/assistant-ui/pull/4224) [`f086497`](https://github.com/assistant-ui/assistant-ui/commit/f08649741273e9eb5a09d144feb3fccd8ec2aa71) - feat(react-ag-ui): honor `CreateResumeRunConfig.stream` in `AgUiThreadRuntimeCore` ([@dkachur1](https://github.com/dkachur1))

  `resume()` previously logged `resume stream is not supported` and fell back to a fresh `agent.runAgent(...)`, re-running the agent on every resume. It now passes the resume generator into `startRun`, which replays each `ChatModelRunResult` into the existing assistant message (no new `runId`, no replayed `agent.runAgent`). On history `load()` with `unstable_resume`, the adapter now feeds `history.resume()` when present (falling back to a fresh run otherwise), and `ResumeRunConfig.stream` is typed as the real `(options: ChatModelRunOptions) => AsyncGenerator<ChatModelRunResult, void, unknown>` instead of `unknown`. This lets apps that persist their own AG-UI event stream re-attach and continue consuming on reload.

- [#4198](https://github.com/assistant-ui/assistant-ui/pull/4198) [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4210](https://github.com/assistant-ui/assistant-ui/pull/4210) [`8dc2e0d`](https://github.com/assistant-ui/assistant-ui/commit/8dc2e0d295118f2b37bd14c854aeb4f092e59c60) - feat(react-ag-ui): apply AG-UI STATE_DELTA events ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`cba2b42`](https://github.com/assistant-ui/assistant-ui/commit/cba2b42c26083e730ae07194186ab4473f9f4cf3), [`4145caa`](https://github.com/assistant-ui/assistant-ui/commit/4145caaa23452f38c71366b55c03f8ec4da3fd54), [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab), [`0558db2`](https://github.com/assistant-ui/assistant-ui/commit/0558db28952fcd1c05a2ea3f15020cf50ca52489), [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46), [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47), [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb), [`7640b31`](https://github.com/assistant-ui/assistant-ui/commit/7640b319f704414bd5eb197f34e11ae0b2324a1d)]:
  - assistant-stream@0.3.20
  - @assistant-ui/core@0.2.10

## 0.0.34

### Patch Changes

- [#4136](https://github.com/assistant-ui/assistant-ui/pull/4136) [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b) - centralize thread-level shared options forwarding across runtime wrapper hooks. follow-up to [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). ([@okisdev](https://github.com/okisdev))

  new public exports from `@assistant-ui/core` (re-exported from `@assistant-ui/react`):
  - `ExternalStoreSharedOptions`, a typed `Pick` over `ExternalStoreAdapter` covering the four thread-level optional fields every wrapper forwards: `isDisabled`, `isSendDisabled`, `unstable_capabilities`, `suggestions`.
  - `pickExternalStoreSharedOptions(options)`, plucks those four fields from a wider options object. the body uses `satisfies Required<...>` so adding a key to the type without copying it in the function is a compile error rather than a silent missing-field bug.
  - `useExternalStoreSharedOptions(options)` (from `@assistant-ui/core/react`), a memoized variant for wrappers that wrap their store in `useMemo`. lets the wrapper list a single stable `shared` reference as a dep instead of enumerating the four fields. same `satisfies` guard internally so the destructure stays in sync with the type.

  internal: every runtime wrapper hook (`useChatRuntime`, `useAISDKRuntime`, `useLangGraphRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useAdkRuntime`, `useStreamRuntime`, `useOpenCodeRuntime`) now uses these helpers instead of inlining the conditional spreads added in [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). each wrapper sheds 20 to 40 lines of duplicated declarations and conditional spreads; future additions to the shared option set propagate through a single edit in `pickExternalStoreSharedOptions` instead of touching every wrapper. no user-facing behavior change.

- [#4175](https://github.com/assistant-ui/assistant-ui/pull/4175) [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4135](https://github.com/assistant-ui/assistant-ui/pull/4135) [`e7c2396`](https://github.com/assistant-ui/assistant-ui/commit/e7c2396a6a212404657e9b537add0b5534fe807c) - align the runtime wrapper hooks so every distribution forwards the same set of optional adapter-level fields to `useExternalStoreRuntime`. closes [#4134](https://github.com/assistant-ui/assistant-ui/issues/4134). ([@okisdev](https://github.com/okisdev))

  `useChatRuntime` and `useAISDKRuntime` (which already accepted `suggestions`) gain three new options:
  - `isDisabled`, disables the composer input entirely.
  - `isSendDisabled`, keeps the input usable but makes `send()` a no-op (paired with `composer.canSend`).
  - `unstable_capabilities`, per-thread capability overrides (currently `{ copy?: boolean }`).

  `useLangGraphRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useAdkRuntime`, `useStreamRuntime`, `useOpenCodeRuntime` gain all four (the three above plus `suggestions`).

  adapter-level additions, where missing:
  - `useChatRuntime` / `useAISDKRuntime` already accepted `dictation` and `voice` through the `ExternalStoreAdapter` adapter shape; this just confirms the typing.
  - `useLangGraphRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useAdkRuntime`, `useStreamRuntime`, `useOpenCodeRuntime` now accept `dictation` and `voice` in their `adapters` object and forward them through.
  - `useOpenCodeRuntime` gains an `adapters` option for the first time (attachments / speech / dictation / voice / feedback).

  every new field is optional and defaults to the prior behavior, so existing call sites need no changes.

- [#4133](https://github.com/assistant-ui/assistant-ui/pull/4133) [`c4d3eea`](https://github.com/assistant-ui/assistant-ui/commit/c4d3eeac6907a2fc15718f3c710d73d24eaeb652) - forward per-tool `providerOptions` from `useAssistantTool` through `toToolsJSONSchema` and `frontendTools` into the AI SDK request body, and emit tool entries in alphabetical order so identical tool sets produce byte-identical request bodies for stable prompt caching. `react-ag-ui` inherits the sort via `toAgUiTools`, so identical tool sets reach the AG-UI runtime in a stable order regardless of mount order. ([@okisdev](https://github.com/okisdev))

  this lets you opt into provider-specific tool features (e.g. Anthropic's `defer_loading`, Anthropic Tool Search Tool) without any provider-aware code in assistant-ui:

  ```ts
  useAssistantTool({
    toolName: "get_weather",
    parameters: schema,
    providerOptions: { anthropic: { deferLoading: true } },
    execute: async ({ city }) => fetchWeather(city),
  });
  ```

  the value is passed through verbatim; the AI SDK provider (`@ai-sdk/anthropic`, `@ai-sdk/openai`, ...) interprets it.

- [#4128](https://github.com/assistant-ui/assistant-ui/pull/4128) [`331f2f7`](https://github.com/assistant-ui/assistant-ui/commit/331f2f7f432285fd0cdc14e0862b550e5d15769e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b), [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b), [`76f7d16`](https://github.com/assistant-ui/assistant-ui/commit/76f7d161c2d802b72e07a12f67595f94c9ad7e4d), [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d), [`c4d3eea`](https://github.com/assistant-ui/assistant-ui/commit/c4d3eeac6907a2fc15718f3c710d73d24eaeb652)]:
  - assistant-stream@0.3.18
  - @assistant-ui/core@0.2.8

## 0.0.33

### Patch Changes

- [#4125](https://github.com/assistant-ui/assistant-ui/pull/4125) [`e639a11`](https://github.com/assistant-ui/assistant-ui/commit/e639a11838642aa111644077ba51acf6277051f2) - chore: drop tracker-behaviour explainer comments left behind in satellite runtimes ([@Yonom](https://github.com/Yonom))

## 0.0.32

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`13a12c4`](https://github.com/assistant-ui/assistant-ui/commit/13a12c46c94f7e5e62af02692cf3479fff48bd02), [`0a0c306`](https://github.com/assistant-ui/assistant-ui/commit/0a0c306286598ea885b046a1dfb85016f720051c), [`6a0ecb2`](https://github.com/assistant-ui/assistant-ui/commit/6a0ecb2e49f24c5f066052018db5a9f1411dcc59), [`e4634a5`](https://github.com/assistant-ui/assistant-ui/commit/e4634a59b7a926d158e929d559326f243efe438b), [`325de4c`](https://github.com/assistant-ui/assistant-ui/commit/325de4c73b348d4c20dafa4a2ac6d436c69dbf28), [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`f2ec01c`](https://github.com/assistant-ui/assistant-ui/commit/f2ec01ce0f01317a8444b779d88f9b6a26d691c5)]:
  - assistant-stream@0.3.16
  - @assistant-ui/core@0.2.5

## 0.0.31

### Patch Changes

- [#4066](https://github.com/assistant-ui/assistant-ui/pull/4066) [`3bc6dc0`](https://github.com/assistant-ui/assistant-ui/commit/3bc6dc0c407dfc19d7654c75efa22c45cf11d6d0) - fix(react-ag-ui): preserve arrival order of parts in RunAggregator ([@tlecomte](https://github.com/tlecomte))

  The aggregator now strictly preserves the order events arrive from the upstream stream. Each `REASONING_START`, `TOOL_CALL_START`, and `TEXT_MESSAGE_END` acts as a boundary that closes the current active part, so consecutive events of the same type are grouped into one part while interleaved events of a different type produce separate parts in chronological order.

  Previously, the first reasoning block was always moved before the first text part regardless of arrival order, and multiple reasoning cycles were merged into a single block. Both behaviours have been removed.

- [#3925](https://github.com/assistant-ui/assistant-ui/pull/3925) [`53cdc51`](https://github.com/assistant-ui/assistant-ui/commit/53cdc51665a48dfeb0220455f6c32a34981e0b0e) - feat(react-ag-ui): track streaming timing on the run aggregator so `useMessageTiming()` works on AG-UI assistant messages ([@shashank-100](https://github.com/shashank-100))

- Updated dependencies [[`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`8b6fc88`](https://github.com/assistant-ui/assistant-ui/commit/8b6fc8836871e62efc2fd8c131c6783e12c5fc47), [`179895f`](https://github.com/assistant-ui/assistant-ui/commit/179895fdcb56edee2e8d9efb4b38cd3859eeecdd), [`7a8bf26`](https://github.com/assistant-ui/assistant-ui/commit/7a8bf26eda76f5f8490f96b3ff9dce1ccd072917), [`3b2bbce`](https://github.com/assistant-ui/assistant-ui/commit/3b2bbce1589b44a13b8b7a570c19bf35a2266fbd)]:
  - assistant-stream@0.3.15
  - @assistant-ui/core@0.2.3

## 0.0.30

### Patch Changes

- [#3974](https://github.com/assistant-ui/assistant-ui/pull/3974) [`1959f3a`](https://github.com/assistant-ui/assistant-ui/commit/1959f3ad9ac5da430e1882439cc64f0853a39d6a) - feat(react-ag-ui): surface AG-UI interrupt-aware run lifecycle ([@okisdev](https://github.com/okisdev))

  `event-parser` reads the optional `outcome` on `RUN_FINISHED` and forwards both `success` and `interrupt` variants; the subscriber subscribes to `onRunFinishedEvent` (with `onRunFinalized` as a fallback for older servers). `RunAggregator` maps `outcome.type === "interrupt"` to `requires-action` with `reason: "interrupt"` and writes the interrupts to `metadata.custom.agui.interrupts`. `useAgUiRuntime` returns an `AgUiAssistantRuntime` augmented with `unstable_getPendingInterrupts` and `unstable_submitInterruptResponses`; the latter validates coverage and expiry on the client, then issues a fresh run with `RunAgentInput.resume` populated. the runtime state snapshot is also synced onto the agent before each run so `state` actually reaches the protocol layer.

- [#3977](https://github.com/assistant-ui/assistant-ui/pull/3977) [`876abd1`](https://github.com/assistant-ui/assistant-ui/commit/876abd124854b864ef0ba4ea6b9e67a82bc743c0) - feat(react-ag-ui): tighten interrupt lifecycle ([@okisdev](https://github.com/okisdev))

  `append`, `reload`, and `resume` now refuse to start a new run while interrupts are still pending on the thread; the call throws with a message pointing at `submitInterruptResponses` instead of letting the request hit the wire and rely on the agent to reject it (AG-UI interrupts spec rule 4).

  `AgUiInterrupt.reason` is typed as `AgUiInterruptReason` (`"tool_call" | "input_required" | "confirmation" | (string & {})`), so the spec values autocomplete while string extension stays open.

  `onRunFinishedEvent` now ignores payloads that parse as a different event type, so a misrouted callback can no longer suppress the `onRunFinalized` fallback.

- [#4017](https://github.com/assistant-ui/assistant-ui/pull/4017) [`1802e08`](https://github.com/assistant-ui/assistant-ui/commit/1802e08fe86567125d8ef013d7bc9a5c10e0b022) - fix(react-ag-ui): adopt `TEXT_MESSAGE_START.messageId` as the assistant `ThreadMessage.id` ([@okisdev](https://github.com/okisdev))

  `AgUiThreadRuntimeCore` now inserts the assistant placeholder under an optimistic id (`generateOptimisticId`), then atomically reassigns the message id to the server-supplied `messageId` the first time `RunAggregator` observes one (on `TEXT_MESSAGE_START`, `TEXT_MESSAGE_CONTENT`, `TEXT_MESSAGE_END`, or `TOOL_CALL_START.parentMessageId`). `assistantHistoryParents` and `recordedHistoryIds` migrate with the id, so `persistAssistantHistory`, `addToolResult`, and downstream lookups keep working and resolve to the canonical AG-UI id. This brings the streaming path in line with `MESSAGES_SNAPSHOT` imports, which were already keyed on the server id.

  `TOOL_CALL_RESULT.messageId` is now surfaced as `unstable_toolMessageId` on the tool-call part, so tool messages round-trip back to AG-UI with their original id instead of a synthetic `${toolCallId}:tool` value.

- Updated dependencies [[`9ecda1d`](https://github.com/assistant-ui/assistant-ui/commit/9ecda1dfdd96f2c638e7b51cc951319ccacd06c9), [`35d0146`](https://github.com/assistant-ui/assistant-ui/commit/35d014628a69b0003799666895c2552b46ac7198), [`fa4510a`](https://github.com/assistant-ui/assistant-ui/commit/fa4510a3f3a23e0458ce8f3a397c352e3b0cde07), [`c9dd16c`](https://github.com/assistant-ui/assistant-ui/commit/c9dd16c4b1edc52f6a2529a9a07ebb7964aee9a1), [`dea8bc7`](https://github.com/assistant-ui/assistant-ui/commit/dea8bc7e122ad6ff53e48e6b0ffc6fcc2abaadd3), [`9c3d24d`](https://github.com/assistant-ui/assistant-ui/commit/9c3d24d8a358bcf5f683f85473b82524ea018930)]:
  - assistant-stream@0.3.14
  - @assistant-ui/core@0.2.1

## 0.0.29

### Patch Changes

- Updated dependencies [[`040d469`](https://github.com/assistant-ui/assistant-ui/commit/040d469acfcf782de6fc188c646dfd8732d27088)]:
  - @assistant-ui/core@0.2.0

## 0.0.28

### Patch Changes

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6), [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94)]:
  - @assistant-ui/core@0.1.18
  - assistant-stream@0.3.13

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
