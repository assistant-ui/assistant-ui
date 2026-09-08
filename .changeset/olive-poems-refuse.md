---
"@assistant-ui/react-ag-ui": patch
---

feat(react-ag-ui): add `resumeTranscript` to control what a resume run sends

the AG-UI interrupt spec never says what `messages` carries on a run that also carries `resume`, so hosts disagree and both readings are conformant. the default stays `"full"`, matching `@ag-ui/client`. set `resumeTranscript: "appended"` for a host that seeds a resume request from its own stored thread snapshot (Microsoft Agent Framework is one) and would otherwise append the re-sent transcript to that snapshot, duplicating the interrupted turn.
