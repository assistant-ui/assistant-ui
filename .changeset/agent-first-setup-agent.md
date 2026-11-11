---
"setup-agent": patch
---

Export the coding agents a setup can be handed to, with the commands that start them, and detect more agents from their environment, including `AI_AGENT`. `agentInstructions` takes `startedByAgent` for a setup the agent opened itself, which skips the Begin plan handoff, and tells the agent to ask what to set up when a setup lists no products.

`@assistant-ui/tap` is now an optional peer dependency, needed only by `setup-agent/host`, so the CLI and other clients no longer install it.
