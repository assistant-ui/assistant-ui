# @assistant-ui/react-mcp

## 0.1.16

### Patch Changes

- [#6631](https://github.com/assistant-ui/assistant-ui/pull/6631) [`496e973`](https://github.com/assistant-ui/assistant-ui/commit/496e973f89534306eca0b1c133c721fc6ca7f292) - fix: publish workspace dependencies as caret ranges so they dedupe ([@okisdev](https://github.com/okisdev))

- [#6447](https://github.com/assistant-ui/assistant-ui/pull/6447) [`6c3b6cf`](https://github.com/assistant-ui/assistant-ui/commit/6c3b6cf75cc7b04cbdf12074e44beace9d8c5513) - fix: keep OAuth lifecycle callbacks scoped to committed renders ([@Kinfe123](https://github.com/Kinfe123))

- [#6528](https://github.com/assistant-ui/assistant-ui/pull/6528) [`152a35d`](https://github.com/assistant-ui/assistant-ui/commit/152a35daae0e80b5307865e59af683c4ae720794) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#6625](https://github.com/assistant-ui/assistant-ui/pull/6625) [`8648647`](https://github.com/assistant-ui/assistant-ui/commit/8648647a6de9cbb0d64260b8fcd8993fff77050f) - fix: key server reconnects on the storage's scope identity so an OAuth connection never keeps a replaced store ([@Kinfe123](https://github.com/Kinfe123))

- [#6469](https://github.com/assistant-ui/assistant-ui/pull/6469) [`c260fab`](https://github.com/assistant-ui/assistant-ui/commit/c260fab8ed0156b5919576bc8bd65824547bd308) - fix: serialize OAuth state persistence so concurrent updates are not lost ([@Kinfe123](https://github.com/Kinfe123))

- [#6491](https://github.com/assistant-ui/assistant-ui/pull/6491) [`1f4c7e4`](https://github.com/assistant-ui/assistant-ui/commit/1f4c7e4b56ecc9394fd042d3fb313eac984934ca) - fix: keep MCP storage resources stable across re-renders and serialize OAuth state persistence across provider instances ([@okisdev](https://github.com/okisdev))

- [#6598](https://github.com/assistant-ui/assistant-ui/pull/6598) [`04e6ed2`](https://github.com/assistant-ui/assistant-ui/commit/04e6ed21b465e5cbe21c41945051f795312d3cae) - fix: keep saved-token auto-connect from interrupting OAuth callbacks ([@Kinfe123](https://github.com/Kinfe123))

- [#6517](https://github.com/assistant-ui/assistant-ui/pull/6517) [`ff5a633`](https://github.com/assistant-ui/assistant-ui/commit/ff5a63332223a5beb1eb79457ec2f1c552f867b9) - fix: validate OAuth callback state and issuer parameters ([@Kinfe123](https://github.com/Kinfe123))
  
  the callback is now bound to the authorization request that started it. the generated state is persisted alongside its PKCE verifier, compared against the callback before anything is redeemed, and consumed once tokens are stored. the complete callback parameters are forwarded to the MCP SDK so it can validate the issuer per RFC 9207, which also means callback `error_description` text is no longer surfaced directly, since it is attacker-controlled in a mix-up attack.
  
  an authorization started before this release has no persisted state, so its callback is rejected once with "no pending OAuth authorization request for this server" and that server has to be authorized again. stored tokens and client registrations are unaffected.

- [#6698](https://github.com/assistant-ui/assistant-ui/pull/6698) [`79ac59d`](https://github.com/assistant-ui/assistant-ui/commit/79ac59de7f570dc5a6de6ccbbbd187d3f75c0957) - fix(react-mcp): key the oauth write fence on scopeId so a same-scope storage swap cannot resurrect cleared tokens ([@okisdev](https://github.com/okisdev))
- Updated dependencies [[`8cc962e`](https://github.com/assistant-ui/assistant-ui/commit/8cc962e4bb33a5d144535373deb8792edd7f6921), [`2a31285`](https://github.com/assistant-ui/assistant-ui/commit/2a3128570eb52efc30d47c5aa1d7b16fd5e84cff), [`205acf5`](https://github.com/assistant-ui/assistant-ui/commit/205acf51e026f13a3e9b1755c2cda9a20677f72c), [`740a573`](https://github.com/assistant-ui/assistant-ui/commit/740a5739c2da1363a43b5bde74dbefec1970b060), [`65d449b`](https://github.com/assistant-ui/assistant-ui/commit/65d449bf225e190f308de00f85196420b72dc6d4), [`79283c5`](https://github.com/assistant-ui/assistant-ui/commit/79283c5ab5462d5a15d4f3ef6a079104ec74b605), [`9ec29e1`](https://github.com/assistant-ui/assistant-ui/commit/9ec29e1708564dcb9ad308f5d565ec2bef7cf6c6), [`14fc938`](https://github.com/assistant-ui/assistant-ui/commit/14fc93895e3e0c67f84b2722fa2b1180b0341cb3), [`3f7af8b`](https://github.com/assistant-ui/assistant-ui/commit/3f7af8b2df9c62fee5e2cf0cc3871753dbb2814b), [`46fad14`](https://github.com/assistant-ui/assistant-ui/commit/46fad145974a890cd18f7fc2df54e9d0bf36b0fb), [`5511057`](https://github.com/assistant-ui/assistant-ui/commit/55110570389771b4b362d3ba502da8e329f4de70), [`dc2cab3`](https://github.com/assistant-ui/assistant-ui/commit/dc2cab3aecc0466c6c2274974e42b3196e0763bc), [`d75944b`](https://github.com/assistant-ui/assistant-ui/commit/d75944b44ffb60cf853f3abdcb8620628fd35dbb), [`6bd1570`](https://github.com/assistant-ui/assistant-ui/commit/6bd157073f12006e5f8cdcb41d10735f6d93d6a7), [`60ae973`](https://github.com/assistant-ui/assistant-ui/commit/60ae973db6c53941f54bb09e02b898f607366e31), [`9f08bdc`](https://github.com/assistant-ui/assistant-ui/commit/9f08bdc9c1208951cc71e60bd762b12bdb588e4b), [`0fb5390`](https://github.com/assistant-ui/assistant-ui/commit/0fb53906fd4cc35458502c34f699a114f5c887c4), [`dc2cab3`](https://github.com/assistant-ui/assistant-ui/commit/dc2cab3aecc0466c6c2274974e42b3196e0763bc), [`f0d0aa2`](https://github.com/assistant-ui/assistant-ui/commit/f0d0aa2f87b9d881f7003bf6132bbb519509b36b), [`1fa3e09`](https://github.com/assistant-ui/assistant-ui/commit/1fa3e099eeab5c19e414da25fcae1b213da3ff10), [`0f17ba5`](https://github.com/assistant-ui/assistant-ui/commit/0f17ba5bb0c048d5b639205900bd590db5b8824b), [`152a35d`](https://github.com/assistant-ui/assistant-ui/commit/152a35daae0e80b5307865e59af683c4ae720794), [`0c5c574`](https://github.com/assistant-ui/assistant-ui/commit/0c5c574993328635aac8a3b954141c451f0b127a), [`ddaac94`](https://github.com/assistant-ui/assistant-ui/commit/ddaac94844317d901e4a655461c5bd928bdf8e06), [`0c68179`](https://github.com/assistant-ui/assistant-ui/commit/0c68179227da4d64d73db9c6c36cd674ccaf59e6), [`250f69c`](https://github.com/assistant-ui/assistant-ui/commit/250f69ce608cf32c4930f01e49208e70e8ff9274), [`c22a3dc`](https://github.com/assistant-ui/assistant-ui/commit/c22a3dc69e51fc719ea54595b595b892303599c5), [`aca6e30`](https://github.com/assistant-ui/assistant-ui/commit/aca6e30876f675cfd44066dca410db6191e8251e), [`5bdd416`](https://github.com/assistant-ui/assistant-ui/commit/5bdd416af4379a2cc86c12292e06a6e3ce5fcdb9), [`6fdfc23`](https://github.com/assistant-ui/assistant-ui/commit/6fdfc2352390a5e227e488ddd5ef3ab348fc1fda), [`136bbf5`](https://github.com/assistant-ui/assistant-ui/commit/136bbf5800904dd2c51a878afa55e9fa40b1dc32), [`e53299b`](https://github.com/assistant-ui/assistant-ui/commit/e53299be07fd69bd5d64a2f50bd3561d85dc47cc), [`69d8e1b`](https://github.com/assistant-ui/assistant-ui/commit/69d8e1bab2d5d6e6c4c6f4434c9f055db0f59aa8), [`dabe8f2`](https://github.com/assistant-ui/assistant-ui/commit/dabe8f21f5cea21fa7fdd1b9c1987e0ac7367c07), [`8d128af`](https://github.com/assistant-ui/assistant-ui/commit/8d128afd6919e7ffe84dba365e29da44592e26a4), [`9f08bdc`](https://github.com/assistant-ui/assistant-ui/commit/9f08bdc9c1208951cc71e60bd762b12bdb588e4b), [`47a46db`](https://github.com/assistant-ui/assistant-ui/commit/47a46db1753aeb836bc1f1d0879eb84d5829eaf9), [`8135d16`](https://github.com/assistant-ui/assistant-ui/commit/8135d16dfb871e807d94a427e958d2b957b19f1e), [`07fed43`](https://github.com/assistant-ui/assistant-ui/commit/07fed430ca6b1c07782abd36f5c7f91a7bf5256c), [`fa9c0dc`](https://github.com/assistant-ui/assistant-ui/commit/fa9c0dc8e88724f3d01251e002c3f4bb4c252f4a), [`fa9c0dc`](https://github.com/assistant-ui/assistant-ui/commit/fa9c0dc8e88724f3d01251e002c3f4bb4c252f4a), [`4ca7de9`](https://github.com/assistant-ui/assistant-ui/commit/4ca7de95c90f1ce1bba45fd5e635baac2441e53a), [`65d449b`](https://github.com/assistant-ui/assistant-ui/commit/65d449bf225e190f308de00f85196420b72dc6d4), [`49e727b`](https://github.com/assistant-ui/assistant-ui/commit/49e727b440c3c395ec7c4e9530a5b460b03b8f33), [`49e727b`](https://github.com/assistant-ui/assistant-ui/commit/49e727b440c3c395ec7c4e9530a5b460b03b8f33), [`d56a66a`](https://github.com/assistant-ui/assistant-ui/commit/d56a66a6d325d6e64abbc405dae204b4ee1dfc1e), [`96a2df8`](https://github.com/assistant-ui/assistant-ui/commit/96a2df8ba189796dc1cc14a3ab66160625b1e072), [`8206d8f`](https://github.com/assistant-ui/assistant-ui/commit/8206d8f139804dcb030a0731571858db16f42bd7)]:
  - @assistant-ui/core@0.3.17
  - assistant-stream@0.3.41
  - @assistant-ui/store@0.3.12
  - @assistant-ui/tap@0.9.16

## 0.1.15

### Patch Changes

- [#6328](https://github.com/assistant-ui/assistant-ui/pull/6328) [`6b797ca`](https://github.com/assistant-ui/assistant-ui/commit/6b797ca09fd63ac988dc7a2e60117ca2fe231f97) - refactor: share the runtime lifecycle callback invoker from core internal. ([@okisdev](https://github.com/okisdev))
  callback errors continue to be reported and swallowed through the shared invoker.

- [#6305](https://github.com/assistant-ui/assistant-ui/pull/6305) [`e96d3de`](https://github.com/assistant-ui/assistant-ui/commit/e96d3dea9370159e04f82bf4eb39d6b1b1c4d21d) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#6400](https://github.com/assistant-ui/assistant-ui/pull/6400) [`e9fdaf6`](https://github.com/assistant-ui/assistant-ui/commit/e9fdaf6843493aaa8617c149121933b0b692d1d8) - refactor: generate ids from the shared core generator instead of per-call-site implementations ([@samdickson22](https://github.com/samdickson22))

- [#6353](https://github.com/assistant-ui/assistant-ui/pull/6353) [`93c887b`](https://github.com/assistant-ui/assistant-ui/commit/93c887bcb864dc09a9408ea2a487e7f5e486fdb2) - fix: refresh MCP connections when connector settings change ([@Kinfe123](https://github.com/Kinfe123))
- Updated dependencies [[`c70c911`](https://github.com/assistant-ui/assistant-ui/commit/c70c911d9537e6f3e87da44768e3363d65e6a19d), [`e0fa1e6`](https://github.com/assistant-ui/assistant-ui/commit/e0fa1e63d068c142ab3154eeddf6bbdb203ba463), [`b2f148e`](https://github.com/assistant-ui/assistant-ui/commit/b2f148ef81681745eeeb931a56f3c54719cb50e4), [`9dabbce`](https://github.com/assistant-ui/assistant-ui/commit/9dabbce426e284886e617f3178a7f50a2fbcbb94), [`5a3e9f7`](https://github.com/assistant-ui/assistant-ui/commit/5a3e9f7c26c85af640a806fa8174508cbf3fb031), [`43d52ad`](https://github.com/assistant-ui/assistant-ui/commit/43d52adfc7fb1b94d854454f36fedc40cb16e246), [`cdfc34d`](https://github.com/assistant-ui/assistant-ui/commit/cdfc34d57e86422666a12f4410e05bbe1c48dbdc), [`8626c1f`](https://github.com/assistant-ui/assistant-ui/commit/8626c1ffe1c6d56ec75073e795aa9fbf7493c3ed), [`4000eed`](https://github.com/assistant-ui/assistant-ui/commit/4000eed17a9bb97d854a44eb61d9d5b72634e66c), [`8217a6e`](https://github.com/assistant-ui/assistant-ui/commit/8217a6e7105b682871211e5c93b1965f25198624), [`3fcf338`](https://github.com/assistant-ui/assistant-ui/commit/3fcf3383ec002b4e43e27bd96f0b9a4148d7e6cd), [`4802d23`](https://github.com/assistant-ui/assistant-ui/commit/4802d238dd7411589a0ce40102c1c7e90fe53fc0), [`c3fd2b3`](https://github.com/assistant-ui/assistant-ui/commit/c3fd2b30443ac58019c6c22693c46e18deed18b4), [`231d148`](https://github.com/assistant-ui/assistant-ui/commit/231d14896f3a2b2bb65d7844e65eca17f9151399), [`7e03b66`](https://github.com/assistant-ui/assistant-ui/commit/7e03b669d08b4cadaf4b381a4d1e57c2fc22d139), [`1263c1f`](https://github.com/assistant-ui/assistant-ui/commit/1263c1fb8870ff1ba0a1c0e0ec3f3ea53a4c53da), [`465a7a6`](https://github.com/assistant-ui/assistant-ui/commit/465a7a68c9870e440040e70e9fe2cd062413de8e), [`531f61a`](https://github.com/assistant-ui/assistant-ui/commit/531f61a4d2f5fcee16821a6401d9d11394bf8339), [`5355528`](https://github.com/assistant-ui/assistant-ui/commit/5355528559bb575e11bbfbf6cac80203196cedaf), [`e97f7c6`](https://github.com/assistant-ui/assistant-ui/commit/e97f7c61365ef0f73686c7b596751802f1a1ddd2), [`a6d2da5`](https://github.com/assistant-ui/assistant-ui/commit/a6d2da5a0c021fbcd46ac3b56d5e4086edda1f64), [`6b797ca`](https://github.com/assistant-ui/assistant-ui/commit/6b797ca09fd63ac988dc7a2e60117ca2fe231f97), [`bea47ed`](https://github.com/assistant-ui/assistant-ui/commit/bea47edbf19aa0258506ade5d73e9096e510b858), [`dfaa94f`](https://github.com/assistant-ui/assistant-ui/commit/dfaa94fca3ecdd8b0b0ab202f08dafd03c1e2ed5), [`a4bc54a`](https://github.com/assistant-ui/assistant-ui/commit/a4bc54afa976423b6310a2d5be350df0f3b41e42), [`546dae8`](https://github.com/assistant-ui/assistant-ui/commit/546dae8c474463a0c228696e16d250bb9a3578ae), [`a06be56`](https://github.com/assistant-ui/assistant-ui/commit/a06be56bfe75f869bb44f1d92949e35516f64686), [`96d4ddf`](https://github.com/assistant-ui/assistant-ui/commit/96d4ddf53398e2e952f3bc365539f2d6f6fd85e4), [`fd471e9`](https://github.com/assistant-ui/assistant-ui/commit/fd471e94babf7b6580e06bbea2b7a8cdd4882869), [`c8db434`](https://github.com/assistant-ui/assistant-ui/commit/c8db4344d5b597cec7484defc9224a65e41e38d8), [`bc55058`](https://github.com/assistant-ui/assistant-ui/commit/bc550585b16f1ae0379fb45dd01bd90ce7faf0eb), [`0221348`](https://github.com/assistant-ui/assistant-ui/commit/0221348df3770f590b34ef45e2c175e8de385e16), [`c415384`](https://github.com/assistant-ui/assistant-ui/commit/c415384e392426384c857f1ca00c69128075bf57), [`5bba723`](https://github.com/assistant-ui/assistant-ui/commit/5bba723caa79600c1c568d0deb937fca8acb0b54), [`0188899`](https://github.com/assistant-ui/assistant-ui/commit/018889996bbc9aefcfc503e12159dfe76f793b40), [`ac7ec15`](https://github.com/assistant-ui/assistant-ui/commit/ac7ec15e118a9279dd60521b839ecc38983675c5), [`e96d3de`](https://github.com/assistant-ui/assistant-ui/commit/e96d3dea9370159e04f82bf4eb39d6b1b1c4d21d), [`027f5e2`](https://github.com/assistant-ui/assistant-ui/commit/027f5e20e927b49fac5644283bd622a9725cf346), [`ebabca4`](https://github.com/assistant-ui/assistant-ui/commit/ebabca49de57630a2040af0ed59c058da95483d7), [`f96e22f`](https://github.com/assistant-ui/assistant-ui/commit/f96e22ffa8c85cbfc4a878db4f371c510070066d), [`fc7f72f`](https://github.com/assistant-ui/assistant-ui/commit/fc7f72f0f846848e8c88eaba2131d4ef0005feab), [`bfc8bef`](https://github.com/assistant-ui/assistant-ui/commit/bfc8bef9f1ee6cb4cb25f83488a0e4ce1a393ff3), [`2cd5cbc`](https://github.com/assistant-ui/assistant-ui/commit/2cd5cbcf78c586b7557421b00e9c996c62bd7f43), [`105af3e`](https://github.com/assistant-ui/assistant-ui/commit/105af3eaea2093df271d9c44642e1c04d5f5cf7c), [`4c3194a`](https://github.com/assistant-ui/assistant-ui/commit/4c3194aca4470753a2a37e244cb5e3fb27cbc76b), [`0064d1e`](https://github.com/assistant-ui/assistant-ui/commit/0064d1e859171e271c11cec07f4dcde7d0d023bc)]:
  - @assistant-ui/core@0.3.16
  - assistant-stream@0.3.40
  - @assistant-ui/store@0.3.11
  - @assistant-ui/tap@0.9.15

## 0.1.14

### Patch Changes

- Updated dependencies [[`fa30915`](https://github.com/assistant-ui/assistant-ui/commit/fa309156e033dc085c0d3b8fb97c27c81a3d2c6e), [`b355aef`](https://github.com/assistant-ui/assistant-ui/commit/b355aefbe2403025562f0e08494a57450bfdc049), [`f7bd2d9`](https://github.com/assistant-ui/assistant-ui/commit/f7bd2d9392e1e71750012fa87649002e8c9d1dab), [`4947ef4`](https://github.com/assistant-ui/assistant-ui/commit/4947ef4f9b0956bd4ca21c457b3cc7e79a2fc9e0), [`332f736`](https://github.com/assistant-ui/assistant-ui/commit/332f736e64bfa26f76cd60318279697ddbc0b36d), [`ef9254d`](https://github.com/assistant-ui/assistant-ui/commit/ef9254d5b2174fb4b58b4e954a8a0d60910a484c), [`9c65b51`](https://github.com/assistant-ui/assistant-ui/commit/9c65b511bc7cdc7d6699c128cac4650cae728043), [`5845ba7`](https://github.com/assistant-ui/assistant-ui/commit/5845ba7c5690af776701683fbd2d04e9ca0eaaff), [`1b30bfd`](https://github.com/assistant-ui/assistant-ui/commit/1b30bfdabadfe3613b7c98296de3d6665122136b), [`365e763`](https://github.com/assistant-ui/assistant-ui/commit/365e763928ff38d2de518efa2a7c44249afbbf83), [`d19921d`](https://github.com/assistant-ui/assistant-ui/commit/d19921d3739efb53dcbbb1ae04ffd18a94dca080), [`996aa57`](https://github.com/assistant-ui/assistant-ui/commit/996aa5723cf8d7db00cc72da08713226d90ec0e1), [`21d6e87`](https://github.com/assistant-ui/assistant-ui/commit/21d6e87dc2834af11babb93c004f7d4f3a4f9568), [`cd247e5`](https://github.com/assistant-ui/assistant-ui/commit/cd247e557b4876c49feb9b79c4f5149cc2271dad), [`f2b3ef8`](https://github.com/assistant-ui/assistant-ui/commit/f2b3ef8b6330e9353741973b0bfe0abf37d81e70), [`1bf263b`](https://github.com/assistant-ui/assistant-ui/commit/1bf263ba208668ead7f6c0786ca0c3064e31c3ab), [`19e52c4`](https://github.com/assistant-ui/assistant-ui/commit/19e52c4012a6a8c32e514134af9ce4eee1146864), [`06b04a7`](https://github.com/assistant-ui/assistant-ui/commit/06b04a7976d10fac3af40ae9ca59b52385ef2ae2), [`a614b5e`](https://github.com/assistant-ui/assistant-ui/commit/a614b5e44df5f59d82b63b60132a41c89f82e185), [`07b51db`](https://github.com/assistant-ui/assistant-ui/commit/07b51dbbc749c94023fa25df99bb7f64dc211ff1), [`92e52bd`](https://github.com/assistant-ui/assistant-ui/commit/92e52bd2c99ee8cacd242bf723f617df64e42e2a)]:
  - @assistant-ui/core@0.3.15
  - @assistant-ui/tap@0.9.14
  - assistant-stream@0.3.39
  - @assistant-ui/store@0.3.10

## 0.1.13

### Patch Changes

- [#5887](https://github.com/assistant-ui/assistant-ui/pull/5887) [`843ff0d`](https://github.com/assistant-ui/assistant-ui/commit/843ff0de44b8eeacd1ed8e7eb2cbaa78d41fc49c) - fix: keep successful server additions successful when callbacks fail ([@Kinfe123](https://github.com/Kinfe123))

- [#5516](https://github.com/assistant-ui/assistant-ui/pull/5516) [`4e1ed08`](https://github.com/assistant-ui/assistant-ui/commit/4e1ed0829dc306a886b21e98764833e25639fa34) - fix: report automatic authentication storage failures through server state ([@Kinfe123](https://github.com/Kinfe123))

- [#5834](https://github.com/assistant-ui/assistant-ui/pull/5834) [`d80e988`](https://github.com/assistant-ui/assistant-ui/commit/d80e9882c4ec0a7662df28546ddd92cc1f0b1fcd) - fix: model-context registrations follow the committed scope across structural replacements. The new `useAssistantScopeEffect(scope, effect, deps)` re-runs a registration when the scope's bound client is replaced (cleaning up against the old one first) while ignoring value updates, and the toolkit, runtime-adapter, interactables, and MCP registration sites now use it instead of registering once against a stable client ref. ([@okisdev](https://github.com/okisdev))

- [#5596](https://github.com/assistant-ui/assistant-ui/pull/5596) [`673cb23`](https://github.com/assistant-ui/assistant-ui/commit/673cb23fb72772e0adc7857c05d43510cd8da65a) - fix: persist MCP OAuth discovery state across authorization redirects ([@Kinfe123](https://github.com/Kinfe123))
- Updated dependencies [[`99c5302`](https://github.com/assistant-ui/assistant-ui/commit/99c530260e625c4c63a06701ef40bda0ef6b41a6), [`ac0c836`](https://github.com/assistant-ui/assistant-ui/commit/ac0c8364a0f25555f693e4354d07c411e65f5489), [`c3fd447`](https://github.com/assistant-ui/assistant-ui/commit/c3fd447f23cbaa36381b2f62058b420bd54cc148), [`f9529bf`](https://github.com/assistant-ui/assistant-ui/commit/f9529bfdea5018505ef393fe46e93809a0012032), [`f9529bf`](https://github.com/assistant-ui/assistant-ui/commit/f9529bfdea5018505ef393fe46e93809a0012032), [`05b94bd`](https://github.com/assistant-ui/assistant-ui/commit/05b94bd5ec879fbf87165385028000eb01e47396), [`cef671d`](https://github.com/assistant-ui/assistant-ui/commit/cef671d63d173bd30fcef268b1539f1a64cf5f39), [`ef7f70d`](https://github.com/assistant-ui/assistant-ui/commit/ef7f70d4fc05195d6386f8e2d072d3deaef1e56a), [`39db2ff`](https://github.com/assistant-ui/assistant-ui/commit/39db2ff60c6392267d88bbc42d63aa32dd9be0fe), [`0e91e27`](https://github.com/assistant-ui/assistant-ui/commit/0e91e277ebe218e891d1c318a18eec230ee4f981), [`c5bc8ed`](https://github.com/assistant-ui/assistant-ui/commit/c5bc8ed0c78e8fb66a6c21c596765caeccef3aec), [`a2a753b`](https://github.com/assistant-ui/assistant-ui/commit/a2a753b71cf8e2c531a8006060eb9931a44824d8), [`2b0fec7`](https://github.com/assistant-ui/assistant-ui/commit/2b0fec76d8abff2b013aa05eb2a5d62545325da2), [`bec0753`](https://github.com/assistant-ui/assistant-ui/commit/bec075348dbdcd377c38074dd179d2751463ba35), [`4326079`](https://github.com/assistant-ui/assistant-ui/commit/4326079bfca7cdaac75497958be39e132343b26c), [`3d68b16`](https://github.com/assistant-ui/assistant-ui/commit/3d68b168e23bb0fd63853b41368d46f8199a3874), [`98795aa`](https://github.com/assistant-ui/assistant-ui/commit/98795aa266f724d512b973d791ce08fe4c21c2c5), [`9d920cc`](https://github.com/assistant-ui/assistant-ui/commit/9d920cc89c25459e602ee0c3037b5f84fd626e01), [`1b9c33d`](https://github.com/assistant-ui/assistant-ui/commit/1b9c33d114ab1589f0592fabda58ca63265265c6), [`d68918e`](https://github.com/assistant-ui/assistant-ui/commit/d68918ee5c862ca6a261a01ea0b961e7b2b66af2), [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7), [`87bf950`](https://github.com/assistant-ui/assistant-ui/commit/87bf95093f6b3f38406b5317545ce697e4979e6d), [`5a01343`](https://github.com/assistant-ui/assistant-ui/commit/5a01343f87ba3282004a08ef014dc3d51f3ce3cf), [`0f6e9e9`](https://github.com/assistant-ui/assistant-ui/commit/0f6e9e9b56c648249781cef7689f4587209948d0), [`f0d1d48`](https://github.com/assistant-ui/assistant-ui/commit/f0d1d48842b61c8f781771375e3893d189321c2d), [`b80a6be`](https://github.com/assistant-ui/assistant-ui/commit/b80a6be3db5b5558792e5e0e267db45c133d248e), [`01580e3`](https://github.com/assistant-ui/assistant-ui/commit/01580e3b8b660542743d63ed79dd02026bb649e4), [`ab7f49f`](https://github.com/assistant-ui/assistant-ui/commit/ab7f49fcb91b8a9d96408426da3259c99f619649), [`e8c53e9`](https://github.com/assistant-ui/assistant-ui/commit/e8c53e9ce2b687e0342cbb9158191300827f75e9), [`53ae80f`](https://github.com/assistant-ui/assistant-ui/commit/53ae80f67f7cd82f5af1751f1d73ade437ba7136), [`5f4dee5`](https://github.com/assistant-ui/assistant-ui/commit/5f4dee5e233c2918b61719ef1b91397bad856762), [`61d29f4`](https://github.com/assistant-ui/assistant-ui/commit/61d29f4157b525d3e36ac721d1fcef7d1baf987e), [`2da61a3`](https://github.com/assistant-ui/assistant-ui/commit/2da61a3be3e8e3f61a4d9310b1845325c44d8ac7), [`0131fc7`](https://github.com/assistant-ui/assistant-ui/commit/0131fc741624dad2a0c2a60b4a29eb106e0511aa), [`a934d03`](https://github.com/assistant-ui/assistant-ui/commit/a934d03a14fb5e2afa6a7647b82a0018d4a66b1d), [`b6d7b2b`](https://github.com/assistant-ui/assistant-ui/commit/b6d7b2b1c553433784a5e52ac411c9c544d8d0c1), [`bc337af`](https://github.com/assistant-ui/assistant-ui/commit/bc337af975bb69c0127a7b42ae48790ab8e3440b), [`dc6eb2f`](https://github.com/assistant-ui/assistant-ui/commit/dc6eb2f9098e1fd9de112b44a5dfd46d3bcea249), [`ce57458`](https://github.com/assistant-ui/assistant-ui/commit/ce574588a32f806ebf37e9c2c4457569b1269348), [`ab7ead9`](https://github.com/assistant-ui/assistant-ui/commit/ab7ead9dae979daafd5fb423d4e636cb41b8ed26), [`067ef52`](https://github.com/assistant-ui/assistant-ui/commit/067ef528f725fb77a892049bd8d6bbc5422baaa4), [`f44163f`](https://github.com/assistant-ui/assistant-ui/commit/f44163f8030e8a12d33f1412de96ecdda4000f7c), [`e5bf0ef`](https://github.com/assistant-ui/assistant-ui/commit/e5bf0ef9739be0579bb4fb4bb175dc0cdd3143fc), [`a2ab997`](https://github.com/assistant-ui/assistant-ui/commit/a2ab997dc645923fa8ebbca5e8e050d467a69cf4), [`fc9dd90`](https://github.com/assistant-ui/assistant-ui/commit/fc9dd90e25db8635a42e8961f4e371ce09457523), [`0e2a230`](https://github.com/assistant-ui/assistant-ui/commit/0e2a23073b3b62ebd2e614858cd910c75886977c), [`d800f8b`](https://github.com/assistant-ui/assistant-ui/commit/d800f8bbee28f5fe3693f2ec2c8682f4dad2ae62), [`f5b39d4`](https://github.com/assistant-ui/assistant-ui/commit/f5b39d415b447d881bf269d08577d31a9646b0fd), [`26f40c1`](https://github.com/assistant-ui/assistant-ui/commit/26f40c1304b5b4dcd081303bd69a5ec95a37334e), [`f618ab6`](https://github.com/assistant-ui/assistant-ui/commit/f618ab692eed3662a60a15d474c1c16715edb012), [`d80e988`](https://github.com/assistant-ui/assistant-ui/commit/d80e9882c4ec0a7662df28546ddd92cc1f0b1fcd), [`7f944be`](https://github.com/assistant-ui/assistant-ui/commit/7f944be666ab4f59d35e68c721bfb93ca7551522), [`f37f595`](https://github.com/assistant-ui/assistant-ui/commit/f37f5952171240eb04c1fe3395d4c9afe4b5ccc8), [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7), [`1b9c33d`](https://github.com/assistant-ui/assistant-ui/commit/1b9c33d114ab1589f0592fabda58ca63265265c6), [`82e2bde`](https://github.com/assistant-ui/assistant-ui/commit/82e2bde62d0b3b31ec445c939c719ab72cd8ff23), [`52df42d`](https://github.com/assistant-ui/assistant-ui/commit/52df42da5d7c4e9610469f64b8e3fe8fd690d7cd), [`6c9e7dd`](https://github.com/assistant-ui/assistant-ui/commit/6c9e7ddf584394ce63c3bc5f17bafcb28face442), [`837ef1b`](https://github.com/assistant-ui/assistant-ui/commit/837ef1b21fead90a2a4176f209dbb01ed6ccae62), [`5c092ef`](https://github.com/assistant-ui/assistant-ui/commit/5c092efb81aab1afc75acb913ecd95f0c07b7365), [`2f3c638`](https://github.com/assistant-ui/assistant-ui/commit/2f3c638efb70313c6b64721a6edf15bb8d27bac9), [`8e77515`](https://github.com/assistant-ui/assistant-ui/commit/8e77515ce17d91240c5e0877b6a4b4c0a2ed548a), [`d9c355d`](https://github.com/assistant-ui/assistant-ui/commit/d9c355d25c6daf415283edf769b88c4c6786fd13), [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7), [`a14b347`](https://github.com/assistant-ui/assistant-ui/commit/a14b347c67a0a2dee1f77dbf8dc6035036bcd41d), [`e999f5d`](https://github.com/assistant-ui/assistant-ui/commit/e999f5d363731fb87f4890d89a65b75ca64413db), [`44d98d7`](https://github.com/assistant-ui/assistant-ui/commit/44d98d708b85d6f76cd48f923e78a25d9e4b5171), [`4320fc6`](https://github.com/assistant-ui/assistant-ui/commit/4320fc62de06f89370dd074bc19530ab97ddac15), [`d4b8845`](https://github.com/assistant-ui/assistant-ui/commit/d4b884535d60b19f0841e94e8e5ea5cd6e14a852), [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7), [`a279301`](https://github.com/assistant-ui/assistant-ui/commit/a27930133724dd6dafa7f6dcce6998e0bdc759e9), [`d7322c0`](https://github.com/assistant-ui/assistant-ui/commit/d7322c0ca223dd0d34d246e55055928270df60ff), [`8b0a836`](https://github.com/assistant-ui/assistant-ui/commit/8b0a836ec4a05a2b110780e7c325de7aec178af7), [`20efa42`](https://github.com/assistant-ui/assistant-ui/commit/20efa4206a7c08eb8df192305fb1e434d06a4bfc), [`833fbe8`](https://github.com/assistant-ui/assistant-ui/commit/833fbe84f12a23a8caebd121d60a32528e33378d), [`94a39ad`](https://github.com/assistant-ui/assistant-ui/commit/94a39ad218bea1228c3298756122acc312cf7218), [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7), [`74dca03`](https://github.com/assistant-ui/assistant-ui/commit/74dca0330e907428ec11b85fb1a33306368ddae7), [`7748e15`](https://github.com/assistant-ui/assistant-ui/commit/7748e15acf9d7d16701296e9ef89e1757ec346b3), [`72705c3`](https://github.com/assistant-ui/assistant-ui/commit/72705c39b3241a5a61919baeee3996ddbfe4cf48), [`0d2e23f`](https://github.com/assistant-ui/assistant-ui/commit/0d2e23f5597c2500da03ac417bfee1defd2d808e), [`4446d45`](https://github.com/assistant-ui/assistant-ui/commit/4446d458e8fc904b66f306749d4e389cb1c46e60), [`e8997d9`](https://github.com/assistant-ui/assistant-ui/commit/e8997d922d15d0de0d20558ce0735fa3e844f27f), [`bfe47b6`](https://github.com/assistant-ui/assistant-ui/commit/bfe47b699ca1ed7e6c222ad1fc5a33b21ec8a4af), [`ceb8c16`](https://github.com/assistant-ui/assistant-ui/commit/ceb8c166fe233fa8235b3ab4cece8f636c77a164), [`61d29f4`](https://github.com/assistant-ui/assistant-ui/commit/61d29f4157b525d3e36ac721d1fcef7d1baf987e), [`7ea9de1`](https://github.com/assistant-ui/assistant-ui/commit/7ea9de1204687585297c62981183015cac0baa99), [`51886b2`](https://github.com/assistant-ui/assistant-ui/commit/51886b2ce2e023708c3a07b3241f09181e57b418), [`3053195`](https://github.com/assistant-ui/assistant-ui/commit/3053195d8b62b1338335cb5b424f15cd5dda7c83), [`44e574f`](https://github.com/assistant-ui/assistant-ui/commit/44e574f8c17dd5603933ec74821eecd08e94e371), [`14c3b5a`](https://github.com/assistant-ui/assistant-ui/commit/14c3b5a25afe2b2f37760dfe8003818b2e4f72d3)]:
  - @assistant-ui/tap@0.9.13
  - @assistant-ui/core@0.3.14
  - @assistant-ui/store@0.3.10
  - assistant-stream@0.3.38

## 0.1.12

### Patch Changes

- Updated dependencies [[`a90db30`](https://github.com/assistant-ui/assistant-ui/commit/a90db30dbf1c73eb2ba8cc587cf157b1a04ce541), [`cfb5fab`](https://github.com/assistant-ui/assistant-ui/commit/cfb5fab251784ce20722ec9371fd66137a9727f8), [`65e03a6`](https://github.com/assistant-ui/assistant-ui/commit/65e03a697366c62cc5295c28ae528634baaf2901), [`d3fece3`](https://github.com/assistant-ui/assistant-ui/commit/d3fece3b17487edbbeeedb903f0e8075f82b2dd7), [`4b75b8f`](https://github.com/assistant-ui/assistant-ui/commit/4b75b8f96729314a369879d26d8e4cd8321eac36), [`1e98bcf`](https://github.com/assistant-ui/assistant-ui/commit/1e98bcf3f406385f3c924521b73300c12898fea6), [`82cbc15`](https://github.com/assistant-ui/assistant-ui/commit/82cbc1560b069ba1dd7e9b068585f5c647629b36), [`e28a62d`](https://github.com/assistant-ui/assistant-ui/commit/e28a62d84439e93a32b64f166196cef2cb02e5db), [`48af3c5`](https://github.com/assistant-ui/assistant-ui/commit/48af3c5c4198b9f3fe015e77580922b2e4733e7a), [`22fa20f`](https://github.com/assistant-ui/assistant-ui/commit/22fa20ffd1f0d192c417b12d4512dcffeab5161b), [`00a630a`](https://github.com/assistant-ui/assistant-ui/commit/00a630aa93ce0a5e40f81fbf6ff1886275f72356), [`417efee`](https://github.com/assistant-ui/assistant-ui/commit/417efee92b48f3fac057d65200f85d4df8657fa0), [`1e1d52b`](https://github.com/assistant-ui/assistant-ui/commit/1e1d52bd2f08b8712764792a9d95b608cb365b64), [`c98699d`](https://github.com/assistant-ui/assistant-ui/commit/c98699d83b1fcc98511ca00e810e1c3d2ba019ba), [`685a069`](https://github.com/assistant-ui/assistant-ui/commit/685a06939edb9478d68258cab632f389c2742a05), [`f59d24b`](https://github.com/assistant-ui/assistant-ui/commit/f59d24b3ee7036c94bce7bc0a38f018574f50a69), [`092585b`](https://github.com/assistant-ui/assistant-ui/commit/092585b6859eeca4d2947cbe858019f5a9d9e101)]:
  - @assistant-ui/core@0.3.13
  - @assistant-ui/store@0.3.9
  - @assistant-ui/tap@0.9.12

## 0.1.11

### Patch Changes

- Updated dependencies [[`1df4327`](https://github.com/assistant-ui/assistant-ui/commit/1df4327dc915103bb1b64e01ee8d888c08de9f59)]:
  - @assistant-ui/core@0.3.12

## 0.1.10

### Patch Changes

- Updated dependencies [[`f551562`](https://github.com/assistant-ui/assistant-ui/commit/f551562162f43b2bbeb2bb46d39b68243ca1d35a), [`dc7b77d`](https://github.com/assistant-ui/assistant-ui/commit/dc7b77dca65ad8d0384e8aec268a4141dc8bd0da), [`0ae51a8`](https://github.com/assistant-ui/assistant-ui/commit/0ae51a8e8c4c49c4b8810b9c64845eeeded8b9bc), [`d1b7097`](https://github.com/assistant-ui/assistant-ui/commit/d1b7097ca86e84698fcfaabd1b310e30612dd32c), [`e319574`](https://github.com/assistant-ui/assistant-ui/commit/e319574df10df2dbf2d57fc2bcf7cb92d3c6a2e6)]:
  - @assistant-ui/core@0.3.11
  - assistant-stream@0.3.37

## 0.1.9

### Patch Changes

- [#5723](https://github.com/assistant-ui/assistant-ui/pull/5723) [`94dc3e5`](https://github.com/assistant-ui/assistant-ui/commit/94dc3e509fa2b4fae1a14c88ec34b910c8d95af8) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`94dc3e5`](https://github.com/assistant-ui/assistant-ui/commit/94dc3e509fa2b4fae1a14c88ec34b910c8d95af8), [`ab57969`](https://github.com/assistant-ui/assistant-ui/commit/ab5796932c97bc5bade19022e2ac8762949d2967)]:
  - assistant-stream@0.3.36
  - @assistant-ui/core@0.3.10
  - @assistant-ui/store@0.3.8
  - @assistant-ui/tap@0.9.11

## 0.1.8

### Patch Changes

- Updated dependencies [[`ab9e765`](https://github.com/assistant-ui/assistant-ui/commit/ab9e765a2d70e30572c4a72c26526df490334b1e)]:
  - @assistant-ui/core@0.3.9

## 0.1.7

### Patch Changes

- Updated dependencies [[`456b056`](https://github.com/assistant-ui/assistant-ui/commit/456b056b2859994bf49ed5cc4cf031f0601e2174), [`99d09c8`](https://github.com/assistant-ui/assistant-ui/commit/99d09c828c04bfca35d091e73f29c6d6643dfb01), [`a88751d`](https://github.com/assistant-ui/assistant-ui/commit/a88751d71edfd2516f266ce8889081749fba4e5a), [`79253f2`](https://github.com/assistant-ui/assistant-ui/commit/79253f2a5e0a637c8907ba30859f308ff6dcd1c4), [`4e99deb`](https://github.com/assistant-ui/assistant-ui/commit/4e99deb80dc3401480f80c7bef31acbf86a71573), [`2af514c`](https://github.com/assistant-ui/assistant-ui/commit/2af514cabbf6d7d52cb0fd20ef8d1e842294ebb3)]:
  - assistant-stream@0.3.35
  - @assistant-ui/core@0.3.8
  - @assistant-ui/store@0.3.7

## 0.1.6

### Patch Changes

- Fix broken 0.1.5 publish that shipped unresolved workspace: dependency ranges.

## 0.1.5

### Patch Changes

- [#5662](https://github.com/assistant-ui/assistant-ui/pull/5662) [`9f20853`](https://github.com/assistant-ui/assistant-ui/commit/9f20853a0821229e6562f1d812bbb1358c7638e4) - fix: isolate OAuth lifecycle callback failures from authentication state ([@Kinfe123](https://github.com/Kinfe123))

- Updated dependencies [[`bd4c0ad`](https://github.com/assistant-ui/assistant-ui/commit/bd4c0ad3d41a65d0a2caea921f82c6502011615a), [`4aa1b1d`](https://github.com/assistant-ui/assistant-ui/commit/4aa1b1d1b9368f4812b55a33d6f09bb3dcd71949), [`bd4c0ad`](https://github.com/assistant-ui/assistant-ui/commit/bd4c0ad3d41a65d0a2caea921f82c6502011615a)]:
  - @assistant-ui/core@0.3.7
  - @assistant-ui/store@0.3.5

## 0.1.4

### Patch Changes

- [#5430](https://github.com/assistant-ui/assistant-ui/pull/5430) [`dcacd9b`](https://github.com/assistant-ui/assistant-ui/commit/dcacd9bc45117f9beca698006fd67616d2c1ca61) - feat: AuiProvider extends/config grammar. `config={AuiConfig({...})}` alone creates a top-level root client; nested providers must pass `extends` — a client to extend, or `null` to isolate (dev-enforced). An empty config creates a client extending the `extends` client; `ref` exposes the resulting client. The `config` prop only accepts configs built with `AuiConfig(...)` (branded type). AssistantRuntimeProvider gains an optional `config` prop whose scopes are provided alongside the runtime scope. The `useAui({...})` extension overload and the AuiProvider `value` prop are deprecated; `value={client}` now exposes a client extending the given one (same scopes, new identity) rather than the exact instance. `useAui({})` with an empty scope object now mounts a rooted host (so the scope set can grow across renders) instead of a passthrough derived-only client. `useAuiState` state enumeration (`Object.keys`/spread) now includes scopes inherited from parent clients, matching `in`-operator behavior. Clients derived from a hand-built parent (a plain object with `subscribe`/`on`) forward scoped `on(...)` listeners to the parent's `on` instead of throwing for scopes the parent does not expose. ([@Yonom](https://github.com/Yonom))

- [#5587](https://github.com/assistant-ui/assistant-ui/pull/5587) [`09b92c3`](https://github.com/assistant-ui/assistant-ui/commit/09b92c3f2cb625460576218e4f3421a7ab88ee08) - fix: handle rejected MCP server removal actions ([@Kinfe123](https://github.com/Kinfe123))

- [#5591](https://github.com/assistant-ui/assistant-ui/pull/5591) [`4dccebc`](https://github.com/assistant-ui/assistant-ui/commit/4dccebc92335a6245f2c9d22e60800afdf6c6221) - fix: serialize custom server persistence updates ([@Kinfe123](https://github.com/Kinfe123))

- Updated dependencies [[`dcacd9b`](https://github.com/assistant-ui/assistant-ui/commit/dcacd9bc45117f9beca698006fd67616d2c1ca61), [`d52928d`](https://github.com/assistant-ui/assistant-ui/commit/d52928db2c83a3ba6f25bf8c6b21934571dd4622), [`d8a59ad`](https://github.com/assistant-ui/assistant-ui/commit/d8a59ad5d75f220e76e689d4191855c244ddc20a), [`e70da91`](https://github.com/assistant-ui/assistant-ui/commit/e70da91866a5ac880472fbcf23039909270f7623), [`aac3a8c`](https://github.com/assistant-ui/assistant-ui/commit/aac3a8cb8824472f694226a4c53829a0a693072e), [`aa302ee`](https://github.com/assistant-ui/assistant-ui/commit/aa302eeaacd399f58b74b64eb3a1e17d9ea97e03), [`aa302ee`](https://github.com/assistant-ui/assistant-ui/commit/aa302eeaacd399f58b74b64eb3a1e17d9ea97e03), [`71cf74e`](https://github.com/assistant-ui/assistant-ui/commit/71cf74eaa7fb3bcf1cc7af346637b51f99e3fc33), [`34cec64`](https://github.com/assistant-ui/assistant-ui/commit/34cec64fcfbdef0e101d731f5518e9075d989e2f)]:
  - @assistant-ui/store@0.3.4
  - @assistant-ui/core@0.3.6
  - assistant-stream@0.3.34
  - @assistant-ui/tap@0.9.10

## 0.1.3

### Patch Changes

- Updated dependencies [[`7f7f8a2`](https://github.com/assistant-ui/assistant-ui/commit/7f7f8a24f87bd7eb745675fa2644a5cca2f69372), [`78943a3`](https://github.com/assistant-ui/assistant-ui/commit/78943a37b1006bfbee42596f838850cd96ab4566)]:
  - @assistant-ui/core@0.3.5
  - assistant-stream@0.3.33

## 0.1.2

### Patch Changes

- Updated dependencies [[`b19c2f5`](https://github.com/assistant-ui/assistant-ui/commit/b19c2f5efd37e1203502c76d92e0554b63020952), [`01140bd`](https://github.com/assistant-ui/assistant-ui/commit/01140bde14fbfa89af9bdd080bbf79b3a509b524), [`8c99934`](https://github.com/assistant-ui/assistant-ui/commit/8c99934ca7fe9a8ffea0aa972e3579ff74e18553), [`ece5a54`](https://github.com/assistant-ui/assistant-ui/commit/ece5a5422e8b45429e1681b7a845d68be2879834), [`2fdff87`](https://github.com/assistant-ui/assistant-ui/commit/2fdff878211979b1f24d746bf2f16d8b6254102d), [`90b3003`](https://github.com/assistant-ui/assistant-ui/commit/90b3003b943e083fa6cd81e30181bf5b88904361), [`4c313cf`](https://github.com/assistant-ui/assistant-ui/commit/4c313cfabe9802a7e59362c323ec926a24d089d4), [`55b2824`](https://github.com/assistant-ui/assistant-ui/commit/55b282476bf3075beff391978a72a13968b6418a), [`22b05a4`](https://github.com/assistant-ui/assistant-ui/commit/22b05a43ec921a6dd7015692a77a746656a61f5f), [`f913c21`](https://github.com/assistant-ui/assistant-ui/commit/f913c2142708d8cd1f4ac63bd801e5b6defcb74e), [`c868710`](https://github.com/assistant-ui/assistant-ui/commit/c8687104b0407f424d55dd0a369d692fe7a4c708), [`011e275`](https://github.com/assistant-ui/assistant-ui/commit/011e275c4df5cd85942b5fd545a74d9c7cf549a6), [`da32fe0`](https://github.com/assistant-ui/assistant-ui/commit/da32fe0b2f51c8a340935c5f4d2e31e747d39460), [`f913c21`](https://github.com/assistant-ui/assistant-ui/commit/f913c2142708d8cd1f4ac63bd801e5b6defcb74e), [`5bb2573`](https://github.com/assistant-ui/assistant-ui/commit/5bb25733674396d496046b7c5443366171d0e8cf), [`5ececc1`](https://github.com/assistant-ui/assistant-ui/commit/5ececc1df536e098f8ee252addd2e62be7d61a7a)]:
  - @assistant-ui/core@0.3.4
  - assistant-stream@0.3.32
  - @assistant-ui/store@0.3.3

## 0.1.1

### Patch Changes

- Updated dependencies [[`aa74b0d`](https://github.com/assistant-ui/assistant-ui/commit/aa74b0d7c5e334385fabbe48ed79e90b36f63029), [`6e5c450`](https://github.com/assistant-ui/assistant-ui/commit/6e5c450d71242acda30b41c8601b7edb6ed5c701), [`59ec21b`](https://github.com/assistant-ui/assistant-ui/commit/59ec21b5f610aaf7c0082508b3a6cbf950ffc1db), [`4fd698b`](https://github.com/assistant-ui/assistant-ui/commit/4fd698ba5a3b23ea57b667a02c6f784147f5c42d), [`b8daa96`](https://github.com/assistant-ui/assistant-ui/commit/b8daa967f4e5cb181c3e9ed065ab6949ee848fa4)]:
  - @assistant-ui/core@0.3.3
  - @assistant-ui/tap@0.9.9
  - @assistant-ui/store@0.3.2

## 0.1.0

### Minor Changes

- [#5316](https://github.com/assistant-ui/assistant-ui/pull/5316) [`b5f20a9`](https://github.com/assistant-ui/assistant-ui/commit/b5f20a9607af038a10e99e237a4e2ea3f5d31875) - feat: migrate to MCP TypeScript SDK v2 scoped packages (`@modelcontextprotocol/client`, `@modelcontextprotocol/core`, `@modelcontextprotocol/server`), replacing the monolithic `@modelcontextprotocol/sdk` 1.x dependency ([@okisdev](https://github.com/okisdev))

### Patch Changes

- [#5377](https://github.com/assistant-ui/assistant-ui/pull/5377) [`3b98b89`](https://github.com/assistant-ui/assistant-ui/commit/3b98b8922701465deffb109cac910fd1ab1bd606) - fix(react-mcp): resolve empty elicitation drafts to the unanswered state ([@okisdev](https://github.com/okisdev))

  a cleared `enum` field kept `""` as a candidate value, so the accept gate flagged it invalid with no way back to unanswered, and the gate's own required rule counted `""` as missing while the response validator counted it as present. an empty-string draft is now a field's blank state unless the schema names `""` as a legal value (an `enum` member or a `""` default), and the gate reports missing required properties from the response validator alone instead of adding a second rule.

- [#5334](https://github.com/assistant-ui/assistant-ui/pull/5334) [`8b0f53f`](https://github.com/assistant-ui/assistant-ui/commit/8b0f53fa9115502b2319f8e649f77a3361187fde) - feat: form-mode MCP elicitation (pending state, `answerElicitation`, unstyled `McpElicitationPrimitive` namespace), tool list-change auto-refresh, and `cache.defaultTtlMs` response cache configuration ([@okisdev](https://github.com/okisdev))

- [#5341](https://github.com/assistant-ui/assistant-ui/pull/5341) [`c26ef59`](https://github.com/assistant-ui/assistant-ui/commit/c26ef59424f203472e2edee783c5710fc79168ae) - fix: honor boolean schema defaults in elicitation seeding, flag mistyped boolean drafts as invalid, and add an `elicitation: false` opt-out ([@okisdev](https://github.com/okisdev))

- [#5342](https://github.com/assistant-ui/assistant-ui/pull/5342) [`647a81e`](https://github.com/assistant-ui/assistant-ui/commit/647a81e6842f7f0106246ed79ff8d2d412898015) - fix: surface elicitation validation on the pending item (stay-pending accept errors and `McpElicitationPrimitive.Error`), seed drafts from schema defaults ([@okisdev](https://github.com/okisdev))

- [#5347](https://github.com/assistant-ui/assistant-ui/pull/5347) [`2efad15`](https://github.com/assistant-ui/assistant-ui/commit/2efad157f4128eb72646044a53528b04a10ddaf6) - fix: handle custom MCP server storage failures ([@Kinfe123](https://github.com/Kinfe123))

- Updated dependencies [[`d2e7a4a`](https://github.com/assistant-ui/assistant-ui/commit/d2e7a4a1c71c214fd8c4363ec16e879d1122639e), [`ecd7c87`](https://github.com/assistant-ui/assistant-ui/commit/ecd7c879cace69d6371b3f673c52a80669377fc0), [`2daf2d5`](https://github.com/assistant-ui/assistant-ui/commit/2daf2d5dfcb77938f6deb63d048575540e1806a2), [`a5bdbed`](https://github.com/assistant-ui/assistant-ui/commit/a5bdbed993d8f14c919b692b40d51f5cd64467b9), [`fb993c3`](https://github.com/assistant-ui/assistant-ui/commit/fb993c34ca1623bac373137c5ab207dd79cb500c), [`3ae058c`](https://github.com/assistant-ui/assistant-ui/commit/3ae058c5d275e2444701da70a6513528439ecb3e), [`f30b54c`](https://github.com/assistant-ui/assistant-ui/commit/f30b54c9856d50a18f738c4d485c02bcd039151c), [`936c52c`](https://github.com/assistant-ui/assistant-ui/commit/936c52c4301b89242572d9890c870050f63cbe93), [`ee87dd9`](https://github.com/assistant-ui/assistant-ui/commit/ee87dd9fef1389165bbfe0019be2a6995b2cfb24), [`e41734c`](https://github.com/assistant-ui/assistant-ui/commit/e41734c102a192ab772703899d7980bb5c055d07), [`1c5266c`](https://github.com/assistant-ui/assistant-ui/commit/1c5266c1fb32bc71647fedc485372f6ffa25171f), [`cdcdbd0`](https://github.com/assistant-ui/assistant-ui/commit/cdcdbd0a9354483a72edbc01f51a850a1d6b5dc5), [`42dbc69`](https://github.com/assistant-ui/assistant-ui/commit/42dbc697642c0fa327728860f78a8ce5270bf32d), [`25f1e4f`](https://github.com/assistant-ui/assistant-ui/commit/25f1e4f9d33073216458d3c5a05e8d79845d4b3b), [`d16e62d`](https://github.com/assistant-ui/assistant-ui/commit/d16e62d25b5c1e7e2bc1504fb4a5e97c3c25b6e3), [`60d049e`](https://github.com/assistant-ui/assistant-ui/commit/60d049eeadf681f4235157c903543493c98cc258), [`feef8fd`](https://github.com/assistant-ui/assistant-ui/commit/feef8fda65e999a90d283dca23ff656b56456803), [`c02680a`](https://github.com/assistant-ui/assistant-ui/commit/c02680a16425669589db74ba1a601a8f6c4bf8e6), [`e6045bb`](https://github.com/assistant-ui/assistant-ui/commit/e6045bbb1cfc0d63ef75f46cf2de7fa010183451), [`04c070e`](https://github.com/assistant-ui/assistant-ui/commit/04c070e63c5dd1c51355037e42cf24c77c56da6e), [`d7afb3d`](https://github.com/assistant-ui/assistant-ui/commit/d7afb3dbd2dbc76ed90f9091b599ea81bfd6e363), [`8643393`](https://github.com/assistant-ui/assistant-ui/commit/8643393490ebe1aa86661f705bb9ac907bfb4eac), [`2eca438`](https://github.com/assistant-ui/assistant-ui/commit/2eca4386778618f555258855ee6612eb44d89bb2), [`23ee5db`](https://github.com/assistant-ui/assistant-ui/commit/23ee5dbb60e6ac7993b8ce4023fb63a5f7eea713)]:
  - @assistant-ui/store@0.3.2
  - @assistant-ui/core@0.3.2
  - assistant-stream@0.3.31
  - @assistant-ui/tap@0.9.8

## 0.0.22

### Patch Changes

- Updated dependencies [[`1bbaa46`](https://github.com/assistant-ui/assistant-ui/commit/1bbaa467b209986be5dff004be7bc83b27424e2c), [`3a762ed`](https://github.com/assistant-ui/assistant-ui/commit/3a762edd7e4645ea4aa50691bab680af73e5cff6), [`9aac054`](https://github.com/assistant-ui/assistant-ui/commit/9aac05421576813847c4bb0a9d9e864727725800), [`a8cd1c9`](https://github.com/assistant-ui/assistant-ui/commit/a8cd1c9ff95bae0921cbd7f7930c05be6d6192a0)]:
  - @assistant-ui/core@0.3.1
  - @assistant-ui/store@0.3.1
  - assistant-stream@0.3.30

## 0.0.21

### Patch Changes

- [#5285](https://github.com/assistant-ui/assistant-ui/pull/5285) [`d72c2b6`](https://github.com/assistant-ui/assistant-ui/commit/d72c2b6b5fd0e0158b07ecf00bfe4c8ac5b3e861) - refactor: migrate to aui property accessors ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`9a7e776`](https://github.com/assistant-ui/assistant-ui/commit/9a7e77603d59b5e091ee922e2e087f0101679321), [`ae5f831`](https://github.com/assistant-ui/assistant-ui/commit/ae5f83129b20edb38b7f9e7f92b6c60f3c8fe8d9), [`a196711`](https://github.com/assistant-ui/assistant-ui/commit/a1967113d52c6e5751af7ae4109c13b6a322fe23), [`f78e579`](https://github.com/assistant-ui/assistant-ui/commit/f78e5794d8d9d2f1c815485cb39a56f1072ed795), [`dcc41bb`](https://github.com/assistant-ui/assistant-ui/commit/dcc41bb50948f64744a052b22720f0f8dffa510e), [`d72c2b6`](https://github.com/assistant-ui/assistant-ui/commit/d72c2b6b5fd0e0158b07ecf00bfe4c8ac5b3e861), [`2f5d0d4`](https://github.com/assistant-ui/assistant-ui/commit/2f5d0d441caf6a152bf4eef13566a2f9a161541c)]:
  - @assistant-ui/store@0.3.0
  - @assistant-ui/core@0.3.0
  - assistant-stream@0.3.29
  - @assistant-ui/tap@0.9.7

## 0.0.20

### Patch Changes

- Updated dependencies [[`f9c1b0f`](https://github.com/assistant-ui/assistant-ui/commit/f9c1b0fec5ac4cae09c1c9da77f901c0799140ad), [`235c17e`](https://github.com/assistant-ui/assistant-ui/commit/235c17e22acae8a643c583905f3bf90955651794), [`6225d6a`](https://github.com/assistant-ui/assistant-ui/commit/6225d6a6e1bc1be99983e19441e62d0bbd849ac5), [`801781c`](https://github.com/assistant-ui/assistant-ui/commit/801781c18b8097e0cd968f1421a43beaf41fdf24), [`d4bdf2c`](https://github.com/assistant-ui/assistant-ui/commit/d4bdf2c50f741912c1c165bd65441ff91bc632dc), [`a0ddc86`](https://github.com/assistant-ui/assistant-ui/commit/a0ddc862b0c506bd791238ebf800868e4836820a), [`cee74f1`](https://github.com/assistant-ui/assistant-ui/commit/cee74f1302299f0cf662ee7ad83ea552a1a3ac2d), [`cf839ff`](https://github.com/assistant-ui/assistant-ui/commit/cf839ff72efe8852072a1323b902e540f0a1d9d2), [`396ea1f`](https://github.com/assistant-ui/assistant-ui/commit/396ea1fda2cbee9a254daba7531a50d5ac62b961), [`e1f27d8`](https://github.com/assistant-ui/assistant-ui/commit/e1f27d8ca87443569aede02ceba0ca99e1a9e4a3), [`3e8f59e`](https://github.com/assistant-ui/assistant-ui/commit/3e8f59e1e0732f473cb190c9fcc423503ca4d32d), [`8c97501`](https://github.com/assistant-ui/assistant-ui/commit/8c97501892c5e76a0b10232835818c4be5da37eb), [`7e871ef`](https://github.com/assistant-ui/assistant-ui/commit/7e871efe16f1ab0dc3b0e6b21e04728835dbb6da), [`06f5266`](https://github.com/assistant-ui/assistant-ui/commit/06f5266bf8d7d347020c113c089b199b182a0099), [`d319637`](https://github.com/assistant-ui/assistant-ui/commit/d319637df1297b7aa589a77ff268467270a85386)]:
  - assistant-stream@0.3.28
  - @assistant-ui/core@0.2.23
  - @assistant-ui/store@0.2.22
  - @assistant-ui/tap@0.9.6

## 0.0.19

### Patch Changes

- [#5150](https://github.com/assistant-ui/assistant-ui/pull/5150) [`8615a0c`](https://github.com/assistant-ui/assistant-ui/commit/8615a0cb36034699c7a4fdadaa4fe1643f8542bb) - fix: close pending MCP connections when their resource is disposed ([@Kinfe123](https://github.com/Kinfe123))

- [#5029](https://github.com/assistant-ui/assistant-ui/pull/5029) [`908157b`](https://github.com/assistant-ui/assistant-ui/commit/908157b2e403ebec4c2009a92c06a16d1730446b) - fix: ignore malformed persisted MCP connection timeout values ([@Kinfe123](https://github.com/Kinfe123))

- [#5079](https://github.com/assistant-ui/assistant-ui/pull/5079) [`390e417`](https://github.com/assistant-ui/assistant-ui/commit/390e4177ca47f7ece839613ad0f076add9313328) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`8630186`](https://github.com/assistant-ui/assistant-ui/commit/8630186c86f651bd5e3db9901de14b3feff073ec), [`908ec91`](https://github.com/assistant-ui/assistant-ui/commit/908ec91a15b247b629fbcee6fd8b7af620af6632), [`0d0834d`](https://github.com/assistant-ui/assistant-ui/commit/0d0834d77967eb3f68198c48597a3bb9c6f474cb), [`3355098`](https://github.com/assistant-ui/assistant-ui/commit/33550987bbed0ffaa424218e4d415cb8a4191f72), [`79034bb`](https://github.com/assistant-ui/assistant-ui/commit/79034bbfe8da82c3739969bf7b4cc744910d203a), [`7207b19`](https://github.com/assistant-ui/assistant-ui/commit/7207b19041c4ceed31acc1b28d39836f99d4eae6), [`446a118`](https://github.com/assistant-ui/assistant-ui/commit/446a1187d38f3ca8ce12b1f0ac739400cb32d63e), [`a081656`](https://github.com/assistant-ui/assistant-ui/commit/a0816568bcb0632a67f6e09dc0c90e76cc2b50cc), [`25a5be0`](https://github.com/assistant-ui/assistant-ui/commit/25a5be0c8b7101a382ee7fc31102bdf4fb7ad114), [`b17d392`](https://github.com/assistant-ui/assistant-ui/commit/b17d3929d785cb418615d18b739fb9e3b7b53728), [`20643e2`](https://github.com/assistant-ui/assistant-ui/commit/20643e299a3d9eeb73d73dca72d4b70220f4dc0b), [`47562fd`](https://github.com/assistant-ui/assistant-ui/commit/47562fd231b35fe41c61b437ff66021f9cf0e554), [`afacb10`](https://github.com/assistant-ui/assistant-ui/commit/afacb1081447b899e6e84df969ec1ac9b6d8609f), [`af6c945`](https://github.com/assistant-ui/assistant-ui/commit/af6c9450f0242c4eee3d9e03f82f20efe8c9a89b), [`33924df`](https://github.com/assistant-ui/assistant-ui/commit/33924df40ad3463f4e589617876d2496f48936ec), [`19cfdcd`](https://github.com/assistant-ui/assistant-ui/commit/19cfdcdfdc6778a3ed3f607f694787fe1ef54612), [`044def8`](https://github.com/assistant-ui/assistant-ui/commit/044def8b0c6173dbed5a888993c55933d6a81177), [`039b75f`](https://github.com/assistant-ui/assistant-ui/commit/039b75f91f189a8cb391bb6ea75c87cddefaaebb), [`5e4dd9f`](https://github.com/assistant-ui/assistant-ui/commit/5e4dd9fd00161fd79df60821d2b9af0cd7ebcefd), [`5da0d93`](https://github.com/assistant-ui/assistant-ui/commit/5da0d93808089b9fca35667ab442dff196de46b8), [`85d4976`](https://github.com/assistant-ui/assistant-ui/commit/85d49764ca3585fc553257dafa00a47830727e36), [`5135400`](https://github.com/assistant-ui/assistant-ui/commit/5135400d054297889312b9ae03fe803443ee2fae), [`fc6b4ad`](https://github.com/assistant-ui/assistant-ui/commit/fc6b4ad0c77d195bb69148536e52759d13df2a99), [`121ee83`](https://github.com/assistant-ui/assistant-ui/commit/121ee830d7d26a7db0a8007c0394ffa86c7d56d9), [`2b2587a`](https://github.com/assistant-ui/assistant-ui/commit/2b2587ac09bfe09d552915300b8dcf5b5bb7107d), [`ca80153`](https://github.com/assistant-ui/assistant-ui/commit/ca801537e02bbab09532d0f505992778d282dddb), [`e4ce1a2`](https://github.com/assistant-ui/assistant-ui/commit/e4ce1a2a59faaa117cd8bd819a7c2a5c3bc9c6a6), [`f2f5e83`](https://github.com/assistant-ui/assistant-ui/commit/f2f5e8361fa5cee5c67ede5b5dac239416aa32ac), [`ec8ee6a`](https://github.com/assistant-ui/assistant-ui/commit/ec8ee6a84975632c2ec28f20e7d9cb8a16573495), [`9a343db`](https://github.com/assistant-ui/assistant-ui/commit/9a343db871ceab7e574bfcec9ab22af0ddaf1841), [`666aaab`](https://github.com/assistant-ui/assistant-ui/commit/666aaab6ac3a64ec0f58c3ae958186a9880d8764), [`c1b1750`](https://github.com/assistant-ui/assistant-ui/commit/c1b175040e49ecb82b43d2713536aef7a1f2300e), [`f263c9e`](https://github.com/assistant-ui/assistant-ui/commit/f263c9e827f3ed96f6773b3d8d14f573e53ee941), [`475fca3`](https://github.com/assistant-ui/assistant-ui/commit/475fca35d81a2f30909566e2b3703f5fbce76869), [`8faad07`](https://github.com/assistant-ui/assistant-ui/commit/8faad07801875f2877635380179a18a7fd4f3193), [`61518b9`](https://github.com/assistant-ui/assistant-ui/commit/61518b99c11c49f439fc9411187b1cb148777b79), [`ecd2280`](https://github.com/assistant-ui/assistant-ui/commit/ecd22809f0c1001c1718b53b65e44630cb21414b), [`83d7b42`](https://github.com/assistant-ui/assistant-ui/commit/83d7b4273596c6950f3e9548ce3c537b534d804a), [`5c54141`](https://github.com/assistant-ui/assistant-ui/commit/5c54141d4569796a7de9922285e3447ea4604374), [`5412099`](https://github.com/assistant-ui/assistant-ui/commit/541209975bdc380edf7b34ecc270c201abd14788), [`99da4af`](https://github.com/assistant-ui/assistant-ui/commit/99da4afc5d96a6b3ca6e91fe756f0c7b0c2123a0), [`1eb7275`](https://github.com/assistant-ui/assistant-ui/commit/1eb72757257d1919b2c198c8700deb79ff280253), [`c47bdf4`](https://github.com/assistant-ui/assistant-ui/commit/c47bdf475381d2b79abed6201157984afa1e22c4), [`ba948d8`](https://github.com/assistant-ui/assistant-ui/commit/ba948d8192b8c4bf12cbe60ece4d0f2d11506aa6), [`de54334`](https://github.com/assistant-ui/assistant-ui/commit/de54334ab8416be1a5ec9ebcebc58258bb80cbd5), [`44aac58`](https://github.com/assistant-ui/assistant-ui/commit/44aac5834cff3a4f985b3b0aefe31c8b7951732f), [`9402648`](https://github.com/assistant-ui/assistant-ui/commit/94026488709d1fcc4ed446f39e2dcb78f9eb1daf), [`4651ea5`](https://github.com/assistant-ui/assistant-ui/commit/4651ea5b003bcd56d82e0bb3de16f918d6722906), [`2f69f68`](https://github.com/assistant-ui/assistant-ui/commit/2f69f682d2490c945acb378cdf33052e69d40790), [`390e417`](https://github.com/assistant-ui/assistant-ui/commit/390e4177ca47f7ece839613ad0f076add9313328), [`2bc6798`](https://github.com/assistant-ui/assistant-ui/commit/2bc6798346378fd6c1f8b7e8423fda162d7f3a27)]:
  - assistant-stream@0.3.27
  - @assistant-ui/core@0.2.22
  - @assistant-ui/tap@0.9.5
  - @assistant-ui/store@0.2.21

## 0.0.18

### Patch Changes

- [#4690](https://github.com/assistant-ui/assistant-ui/pull/4690) [`35f9678`](https://github.com/assistant-ui/assistant-ui/commit/35f9678009be221c738ee554702cb4efc2540612) - fix: ignore malformed persisted MCP custom servers ([@Kinfe123](https://github.com/Kinfe123))

- [#4718](https://github.com/assistant-ui/assistant-ui/pull/4718) [`527bad3`](https://github.com/assistant-ui/assistant-ui/commit/527bad3091c3edbcf48b6d424dc885a7930847e3) - fix: clarify MCP OAuth callback failures ([@Kinfe123](https://github.com/Kinfe123))

- [#4746](https://github.com/assistant-ui/assistant-ui/pull/4746) [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4845](https://github.com/assistant-ui/assistant-ui/pull/4845) [`10abdc5`](https://github.com/assistant-ui/assistant-ui/commit/10abdc5d044b3a51484df5a36dddf05d48aa819c) - fix: ignore malformed persisted MCP auth state ([@Kinfe123](https://github.com/Kinfe123))

- [#4699](https://github.com/assistant-ui/assistant-ui/pull/4699) [`1e8c03e`](https://github.com/assistant-ui/assistant-ui/commit/1e8c03e237a79baae8760205082997bd26107af0) - feat: expose MCP resource listing on connected servers ([@Kinfe123](https://github.com/Kinfe123))

- [#4970](https://github.com/assistant-ui/assistant-ui/pull/4970) [`8c8b680`](https://github.com/assistant-ui/assistant-ui/commit/8c8b6807d1bfc6c0f8109224ad34ecb2f7188534) - feat: support cursor pagination when listing MCP resources ([@Kinfe123](https://github.com/Kinfe123))

- [#4815](https://github.com/assistant-ui/assistant-ui/pull/4815) [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`43b8ce8`](https://github.com/assistant-ui/assistant-ui/commit/43b8ce862520e1f53d837407c5fcd7106c9ffd7c), [`1e926b6`](https://github.com/assistant-ui/assistant-ui/commit/1e926b68a8f61d5d099a53c89ad25b168872b853), [`d6c7571`](https://github.com/assistant-ui/assistant-ui/commit/d6c757149df4cc66aa3261a3bd3beb041cac6c49), [`4d7a447`](https://github.com/assistant-ui/assistant-ui/commit/4d7a4479b2dd673e3f5a356c4dd763f3aa72053d), [`ca751f4`](https://github.com/assistant-ui/assistant-ui/commit/ca751f41905a82e9b1622d100af62b8b31314a5c), [`2aca5e0`](https://github.com/assistant-ui/assistant-ui/commit/2aca5e09337b5b867562e6280b8cc6d49763e845), [`908af6d`](https://github.com/assistant-ui/assistant-ui/commit/908af6d6104b355c3097fcf77367bed1bf5541b8), [`1b46551`](https://github.com/assistant-ui/assistant-ui/commit/1b465515f38be1d7d4e844ab5d95c90537745d15), [`7865f67`](https://github.com/assistant-ui/assistant-ui/commit/7865f6730d0a98e43bc27d5a0482bc43f2678de5), [`438ecd3`](https://github.com/assistant-ui/assistant-ui/commit/438ecd350d5f14e5c5d329d6f4c0689b491c0845), [`5a34e8c`](https://github.com/assistant-ui/assistant-ui/commit/5a34e8c2721b02e7a115d085bc09a447e0d3caa9), [`5dbbac4`](https://github.com/assistant-ui/assistant-ui/commit/5dbbac4f49b6269c1017f11c9bf6da2909fa6c96), [`d3bd0ed`](https://github.com/assistant-ui/assistant-ui/commit/d3bd0ede457f50043ff59f8987f59b16c675ef01), [`84e8ddf`](https://github.com/assistant-ui/assistant-ui/commit/84e8ddf548d808d74d84b6be5a8ed28642baad3d), [`8282269`](https://github.com/assistant-ui/assistant-ui/commit/8282269f0864bc43c999cd209fbbee035ee53641), [`03ffe44`](https://github.com/assistant-ui/assistant-ui/commit/03ffe44808f4898a2862e608db7258682cf12383), [`38bf104`](https://github.com/assistant-ui/assistant-ui/commit/38bf1045406da7eff1b9c5847e4e7db96d327c2c), [`19b2a00`](https://github.com/assistant-ui/assistant-ui/commit/19b2a00add7f1900bc3fed579759400fc241747c), [`77c7b26`](https://github.com/assistant-ui/assistant-ui/commit/77c7b269795c7aad03ce83e7e574425c3e0f26c8), [`026a7ae`](https://github.com/assistant-ui/assistant-ui/commit/026a7aeabc8134d3ecb26127225ebf0070267261), [`160b0af`](https://github.com/assistant-ui/assistant-ui/commit/160b0afa773b13a5e0f462cf05b7661baa1627f5), [`c814c9c`](https://github.com/assistant-ui/assistant-ui/commit/c814c9cf562a66ab3864ca0472d667902ebc131b), [`6be3b67`](https://github.com/assistant-ui/assistant-ui/commit/6be3b6781b3ddd178208bc9de15326ab35d496d4), [`c590a21`](https://github.com/assistant-ui/assistant-ui/commit/c590a21a63405f5a52a6d372e003afca06cf4a1e), [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98), [`a84cf6d`](https://github.com/assistant-ui/assistant-ui/commit/a84cf6ddc37ba7a7ea7244eb73e5d40a00ea5e24), [`9f99c46`](https://github.com/assistant-ui/assistant-ui/commit/9f99c46ca1ca724081466f97c7e17eda316e8fb3), [`c2d2271`](https://github.com/assistant-ui/assistant-ui/commit/c2d2271b9709c235da18036a0edd5283ce279916), [`e3aba86`](https://github.com/assistant-ui/assistant-ui/commit/e3aba86b7a788261d25921e4a58cebbe7a59fb44), [`25f9eb2`](https://github.com/assistant-ui/assistant-ui/commit/25f9eb2caacade2e5522f92e3221ee8173da0608), [`84e8ddf`](https://github.com/assistant-ui/assistant-ui/commit/84e8ddf548d808d74d84b6be5a8ed28642baad3d), [`d03e5cf`](https://github.com/assistant-ui/assistant-ui/commit/d03e5cf0e6efada832503fedc565a1fb8f14676a), [`e02b21b`](https://github.com/assistant-ui/assistant-ui/commit/e02b21b23cc94f6eba692fbb285b5b27faea9ad0), [`7e28a72`](https://github.com/assistant-ui/assistant-ui/commit/7e28a726e67296b813c43859e45bfd9d1572794a), [`ef81c86`](https://github.com/assistant-ui/assistant-ui/commit/ef81c869a3292175a32f0d924e911564a07d439b), [`5ade3a5`](https://github.com/assistant-ui/assistant-ui/commit/5ade3a500498b59a4449f46d443ced8a1e3136be), [`1f284ac`](https://github.com/assistant-ui/assistant-ui/commit/1f284ac2f4e20b0daebfdb6829a44ba0a56033b3), [`65ba32a`](https://github.com/assistant-ui/assistant-ui/commit/65ba32a956661804203450cfb9a2b0285450da9d), [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac)]:
  - assistant-stream@0.3.26
  - @assistant-ui/core@0.2.21
  - @assistant-ui/tap@0.9.4
  - @assistant-ui/store@0.2.20

## 0.0.17

### Patch Changes

- [#4700](https://github.com/assistant-ui/assistant-ui/pull/4700) [`9ae141c`](https://github.com/assistant-ui/assistant-ui/commit/9ae141ce1ddeeae9b3f23724d902cc93e4b90d7a) - fix: validate duplicate MCP server ids in the React MCP manager ([@Kinfe123](https://github.com/Kinfe123))

- [#4684](https://github.com/assistant-ui/assistant-ui/pull/4684) [`4092037`](https://github.com/assistant-ui/assistant-ui/commit/4092037da30e6b04d985dc807a53323daa66a4f4) - feat: support MCP connection timeouts ([@Kinfe123](https://github.com/Kinfe123))

- Updated dependencies [[`523e0b5`](https://github.com/assistant-ui/assistant-ui/commit/523e0b563a71a656f050473c42c414b26c2d5ab4), [`f833bc1`](https://github.com/assistant-ui/assistant-ui/commit/f833bc118b49641f3f6e0ab22bcfc63bf0a04408)]:
  - @assistant-ui/core@0.2.20
  - assistant-stream@0.3.25

## 0.0.16

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`ddc40b7`](https://github.com/assistant-ui/assistant-ui/commit/ddc40b7791563057749ecf1121e15d19574479ff), [`ea52de0`](https://github.com/assistant-ui/assistant-ui/commit/ea52de06368853b7af7ac6755b157ec5305a8494), [`29c6fdb`](https://github.com/assistant-ui/assistant-ui/commit/29c6fdbc8ede04fb2647b0a47184003ee3c2f090), [`d0987a3`](https://github.com/assistant-ui/assistant-ui/commit/d0987a32540880e5058ee529fd52a3efb4298706), [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff), [`0c51b90`](https://github.com/assistant-ui/assistant-ui/commit/0c51b905d22418b93532636b1028c080ecc819e0), [`3a8f685`](https://github.com/assistant-ui/assistant-ui/commit/3a8f685e23a3e7ad76ac41e3ce6fff05714e04d3), [`ec6adf4`](https://github.com/assistant-ui/assistant-ui/commit/ec6adf4adc91fe12c7de47fc93adcc347ece8245), [`4acd4c0`](https://github.com/assistant-ui/assistant-ui/commit/4acd4c0f608da1c62bf23a666bc0fec870a27dca)]:
  - @assistant-ui/core@0.2.19
  - assistant-stream@0.3.24
  - @assistant-ui/store@0.2.19
  - @assistant-ui/tap@0.9.3

## 0.0.15

### Patch Changes

- Updated dependencies [[`68dfbaa`](https://github.com/assistant-ui/assistant-ui/commit/68dfbaa348fba7ccec251c63d0c5cc8765e42a64), [`fe24ad6`](https://github.com/assistant-ui/assistant-ui/commit/fe24ad645e292cc77d9bdda6b0c18ccd8be23096)]:
  - @assistant-ui/core@0.2.18

## 0.0.14

### Patch Changes

- Updated dependencies [[`344f737`](https://github.com/assistant-ui/assistant-ui/commit/344f7370511f7238db17e1982f2a43a10829604c), [`a2e21ee`](https://github.com/assistant-ui/assistant-ui/commit/a2e21ee797761907db9b7e4559da2a41afd00fc9)]:
  - @assistant-ui/core@0.2.17

## 0.0.13

### Patch Changes

- Updated dependencies [[`8d3b0e8`](https://github.com/assistant-ui/assistant-ui/commit/8d3b0e8aade47116d9616d8dac2328e0bb73f296)]:
  - @assistant-ui/tap@0.9.2
  - @assistant-ui/core@0.2.16
  - @assistant-ui/store@0.2.18
  - assistant-stream@0.3.23

## 0.0.12

### Patch Changes

- Updated dependencies [[`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d), [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668), [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda), [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda)]:
  - assistant-stream@0.3.23
  - @assistant-ui/core@0.2.16
  - @assistant-ui/tap@0.9.1
  - @assistant-ui/store@0.2.18

## 0.0.11

### Patch Changes

- [#4385](https://github.com/assistant-ui/assistant-ui/pull/4385) [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff) - feat: precompile packages with React Compiler ([@Yonom](https://github.com/Yonom))
  - aui-build runs React Compiler over packages that depend on tap and remaps `react/compiler-runtime` to the tap shim subpath, so compiled hooks and components work both in React components and inside tap resource renders
  - `@assistant-ui/tap/react-shim` exports `useMemoCache` (tap inside a resource render, `React.__COMPILER_RUNTIME.c` otherwise, with a React 18 polyfill); new `@assistant-ui/tap/react-shim/compiler-runtime` subpath mirrors `react/compiler-runtime`'s `c` export
  - tap implements `useSyncExternalStore` and a no-op `useDebugValue`; `useSubscribable` now builds on `useSyncExternalStore` so its store reads stay visible to the compiler
  - `AssistantProviderBase` opts out via `"use no memo"` because the runtime receives options through an effect inside a re-rendered child element

- Updated dependencies [[`c207bcd`](https://github.com/assistant-ui/assistant-ui/commit/c207bcda24468c1ae6e5adb61054a3682d3ff1d8), [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff), [`9f13fdb`](https://github.com/assistant-ui/assistant-ui/commit/9f13fdb22d0bc1bf2ad001147b8acc0df4844302), [`4583ca7`](https://github.com/assistant-ui/assistant-ui/commit/4583ca7477c834ef0906e7268005b469c7300cbe), [`94cc028`](https://github.com/assistant-ui/assistant-ui/commit/94cc02875b4e813e1af7020709511bb5f61e6067)]:
  - @assistant-ui/core@0.2.15
  - @assistant-ui/tap@0.8.1
  - @assistant-ui/store@0.2.17
  - assistant-stream@0.3.22

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
