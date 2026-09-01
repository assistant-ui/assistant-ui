---
"@assistant-ui/core": patch
"@assistant-ui/store": patch
"@assistant-ui/react-devtools": patch
"@assistant-ui/react-lexical": patch
---

fix: peer ranges on the packages this workspace releases now track the release train

changesets rewrites a peer range only when the new version falls outside it, so the hand-written floors had drifted below the code they describe. core declared `@assistant-ui/store: ^0.3.0` while importing `@assistant-ui/store/internal`, a subpath store did not export until 0.3.10, and react-lexical declared `*`. these peers are now `workspace:^`, which publishes as the version released alongside them.
