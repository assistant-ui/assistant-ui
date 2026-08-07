---
"@assistant-ui/react-ag-ui": patch
---

fix: send `description: ""` for a tool registered without one, so `RunAgentInput` stays valid against the AG-UI schema. previously the key was dropped from the payload entirely and validating servers rejected the run. also types the `runAgent` call site against the upstream parameters.
