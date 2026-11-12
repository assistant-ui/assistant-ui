---
"setup-agent": minor
---

<!-- caret-break: intended -->

Add `setup-agent/sdk`, the pieces a CLI embeds to offer `<tool> setup` to coding agents: `runAgentSetup` (start a session, print the briefing, keep running as the stream), `startSetupSession`, `followSetup`, `createBrowserGate`, `pendingNeeds`, `terminalQuestion`, `answerNeed`, `setupBriefing` and `runSetupCommand`. The `setup-agent` bin now runs through `runSetupCommand`.

The stream opens the setup page only when the setup waits on the user, reopens it for the next question once the user closed it, and never opens a second tab within 30 seconds. When the browser cannot take a question it prints `input.needed` with the question, its options and the command that answers it, and the new `answer` command (`answer <input-id> <answer>`, `answer plan approve`, `answer plan revise --feedback <text>`, `answer finish close`) answers it from the agent's side. `stream --setup-app-url <url>` turns this on for the bin.

The setup page reports itself with the new `browser/heartbeat` and `browser/bye` commands (`state.browser`, `isBrowserPresent`). Both are additive: older clients ignore them, and newer clients fall back when a host lacks them.
