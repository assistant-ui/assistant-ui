# setup-agent

## 0.2.0

### Minor Changes

- [#10566](https://github.com/assistant-ui/assistant-ui/pull/10566) [`4254c59`](https://github.com/assistant-ui/assistant-ui/commit/4254c59e520629b51f4278b9e93315fab40a30da) - Fetch the agent's instructions from the setup server. Commands that print guidance get the briefing, the stream's messages, the next-command hints and the relayed questions from `<setup-url>/guide`. A wording fix now ships with a server deploy instead of waiting for people to upgrade. Setup is online-only: without the guide a command fails with `Setup needs internet access to <url>`. The guide is data. The CLI strips control characters, fills placeholders itself, refuses redirects and guides over 256 KB, and runs only the `print`, `print-status` and `announce-agent` steps. ([@Yonom](https://github.com/Yonom))
  
  <!-- caret-break: intended -->
  Removed `agentInstructions`, `INSTRUCTIONS` and `AgentInstructionsOptions` from `setup-agent/cli`, since the text now lives on the server. `diffEvents` and `followSetup` take the guide.

## 0.1.2

### Patch Changes

- [#10561](https://github.com/assistant-ui/assistant-ui/pull/10561) [`c9cc1b7`](https://github.com/assistant-ui/assistant-ui/commit/c9cc1b7d292eda5c2131de9e7c5b0d74a402426f) - Keep the coding agent working until the setup is done. The briefing and the stream's `browser.opened` and `input.needed` messages now tell the agent that nothing wakes it once it ends its turn, so it blocks on answers with `wait` instead of stopping to wait for the browser. `wait <input-id>`, `wait plan` and `--wait` return after 100 seconds with `{"ok":false,"status":"waiting","next":"<command>"}` so an agent shell's own time limit does not kill them; `--timeout <seconds>` sets another limit and `0` waits as long as it takes. ([@Yonom](https://github.com/Yonom))

## 0.1.1

### Patch Changes

- [#10489](https://github.com/assistant-ui/assistant-ui/pull/10489) [`d7bac9e`](https://github.com/assistant-ui/assistant-ui/commit/d7bac9e32c9195dd5a414524fb684b450f90faa7) - `setup` now suggests the prompt "install and set up assistant-ui", the agent hint says to run `npx -y --prefer-online assistant-ui@latest setup` when `setup` is unknown, and the framework help links to the manual installation guide. ([@Yonom](https://github.com/Yonom))

## 0.1.0

### Minor Changes

- [#10492](https://github.com/assistant-ui/assistant-ui/pull/10492) [`7442ba1`](https://github.com/assistant-ui/assistant-ui/commit/7442ba18351d111572d8565093d9e6caaae292fa) - <!-- caret-break: intended --> ([@Yonom](https://github.com/Yonom))
  
  Add `setup-agent/sdk` with `runAgentSetup`, which a CLI embeds to offer `<tool> setup` to coding agents: it starts a session, prints the briefing and keeps running as the stream. Route `<tool> setup <url> <command>` to `runSetupCommand` from `setup-agent/cli`, which the `setup-agent` bin now runs through.
  
  The stream opens the setup page only when the setup waits on the user, reopens it for the next question once the user closed it, and never opens a second tab within 30 seconds. When the browser cannot take a question it prints `input.needed` with the question, its options and the command that answers it, and the new `answer` command (`answer <input-id> <answer>`, `answer plan approve`, `answer plan revise --feedback <text>`, `answer finish close`) answers it from the agent's side. `stream --setup-app-url <url>` turns this on for the bin.
  
  The setup page reports itself with the new `browser/heartbeat` and `browser/bye` commands (`state.browser`, `isBrowserPresent`). Both are additive: older clients ignore them, and newer clients fall back when a host lacks them.

## 0.0.9

### Patch Changes

- [#10477](https://github.com/assistant-ui/assistant-ui/pull/10477) [`316fb06`](https://github.com/assistant-ui/assistant-ui/commit/316fb0626ff487fbebc00e84f997dd7982c5240b) - Export the coding agents a setup can be handed to, with the commands that start them, and detect more agents from their environment, including `AI_AGENT`. `agentInstructions` takes `startedByAgent` for a setup the agent opened itself, which skips the Begin plan handoff, and tells the agent to ask what to set up when a setup lists no products. ([@Yonom](https://github.com/Yonom))
  
  `@assistant-ui/tap` is now an optional peer dependency, needed only by `setup-agent/host`, so the CLI and other clients no longer install it.
  
  The agent registry and launcher (`CODING_AGENTS`, `detectAgentKind`, `findCommand`, `isDirectInvocation`, `runCodingAgent`) live on `setup-agent/cli`, so the root entry stays free of Node built-ins. Agents start through `cross-spawn`, so Windows `.cmd` shims work.

## 0.0.8

### Patch Changes

- [#10393](https://github.com/assistant-ui/assistant-ui/pull/10393) [`b7fc2d3`](https://github.com/assistant-ui/assistant-ui/commit/b7fc2d3e1f8399b8ea6f877430ef4611b6279b1a) - fix: refuse a setup URL that is not https (http only on localhost) or holds characters a shell treats as code, quote it in printed commands, and refuse a deposited key that would write extra lines to the env file ([@Yonom](https://github.com/Yonom))
- Updated dependencies [[`8328f46`](https://github.com/assistant-ui/assistant-ui/commit/8328f46f6f8f56c74e3cd06fbb6e1c7f552c8e63)]:
  - @assistant-ui/tap@0.9.25

## 0.0.7

### Patch Changes

- [#10098](https://github.com/assistant-ui/assistant-ui/pull/10098) [`7e2d6dc`](https://github.com/assistant-ui/assistant-ui/commit/7e2d6dc0d61f2fc8e054db2352cddaa94ea38289) - fix: reject plan decisions scoped to a superseded setup or plan revision ([@Kinfe123](https://github.com/Kinfe123))

- [#10066](https://github.com/assistant-ui/assistant-ui/pull/10066) [`bfd98a8`](https://github.com/assistant-ui/assistant-ui/commit/bfd98a80c51a766201a350b77acbf62c4b5499ee) - fix: bind model key redemption to the asking CLI. ([@okisdev](https://github.com/okisdev))

- [#10063](https://github.com/assistant-ui/assistant-ui/pull/10063) [`297b607`](https://github.com/assistant-ui/assistant-ui/commit/297b6077eacb2ccebb37386dc1f9d9e2a61cc8ca) - fix: refuse symbolic links and project paths that resolve outside the project when writing configuration. ([@okisdev](https://github.com/okisdev))

- [#10128](https://github.com/assistant-ui/assistant-ui/pull/10128) [`8e4a469`](https://github.com/assistant-ui/assistant-ui/commit/8e4a46935e30207121b192885fcdaef31c437b41) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.6

### Patch Changes

- [#9869](https://github.com/assistant-ui/assistant-ui/pull/9869) [`0a6d4cb`](https://github.com/assistant-ui/assistant-ui/commit/0a6d4cb49bd7749e7e708448708e325c88752531) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.0.5

### Patch Changes

- [#9200](https://github.com/assistant-ui/assistant-ui/pull/9200) [`61d8f4e`](https://github.com/assistant-ui/assistant-ui/commit/61d8f4ecf002c2016c8ac3ec560b2991cc823fcb) - fix(setup-agent): `checkout/cancel` takes an optional checkout `id`, and the host ignores a cancel that names another checkout than the current one ([@Yonom](https://github.com/Yonom))

- [#8731](https://github.com/assistant-ui/assistant-ui/pull/8731) [`c0b41de`](https://github.com/assistant-ui/assistant-ui/commit/c0b41de73756e153b6b0b09961e9620bbbc28c29) - feat(setup-agent): add contextual assistant entry-point questions with validated options and stable selection answers, treat selected product names as starting goals for setup discovery, let installation steps name products outside the starting list, and keep the existing CLI exports and legacy session behavior ([@Yonom](https://github.com/Yonom))

## 0.0.4

### Patch Changes

- [#8730](https://github.com/assistant-ui/assistant-ui/pull/8730) [`8199e65`](https://github.com/assistant-ui/assistant-ui/commit/8199e6533d23b1cb78d66a83d5ada03c6aa3e988) - fix(setup-agent): keep a finished setup done when a late cancel arrives, create `.env.local` owner-only and open it before taking the one-time key, stop counting acknowledged follow-ups, refuse duplicate or `:`-containing option ids, restrict an existing `.env.local` to its owner, lock a preset to `--only` even with `--choices`, refuse duplicate variant ids, and dispose a client whose first connection fails ([@Yonom](https://github.com/Yonom))

- [#8730](https://github.com/assistant-ui/assistant-ui/pull/8730) [`8199e65`](https://github.com/assistant-ui/assistant-ui/commit/8199e6533d23b1cb78d66a83d5ada03c6aa3e988) - chore(setup-agent): move setup-agent into the assistant-ui workspace and keep its published CLI, host, and protocol entry points ([@Yonom](https://github.com/Yonom))

- [#8730](https://github.com/assistant-ui/assistant-ui/pull/8730) [`8199e65`](https://github.com/assistant-ui/assistant-ui/commit/8199e6533d23b1cb78d66a83d5ada03c6aa3e988) - fix(setup-agent): validate environment variable names inside the exported dotenv helper and scope CLI secret retrieval to the current setup and model input ([@Yonom](https://github.com/Yonom))
- Updated dependencies [[`14ba56e`](https://github.com/assistant-ui/assistant-ui/commit/14ba56ee6fb868446552670b558b456abe67252c), [`9121416`](https://github.com/assistant-ui/assistant-ui/commit/9121416f70e5fed68eaf7f8922a726e289e98aa5), [`039d048`](https://github.com/assistant-ui/assistant-ui/commit/039d0489ef5cc21608891e9a92f1ecbd5c9ab201)]:
  - @assistant-ui/tap@0.9.22
