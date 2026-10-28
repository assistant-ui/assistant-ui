---
"@assistant-ui/eve": patch
---

feat: support eve 0.84 and require it as the peer. the runtime reads eve's top level `messages`, answers interactions with `Answer`, and forwards `baseUrl`, `followWhile`, and `followAgents`; eve 0.83 and earlier stay on the previous release.
