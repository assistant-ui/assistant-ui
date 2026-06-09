# @assistant-ui/react-pi

Pi coding-agent runtime adapter for [assistant-ui](https://www.assistant-ui.com/).

This package lets assistant-ui render and drive [Pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent)-backed
threads: streaming assistant/reasoning output, tool calls with live streaming
results, mid-run steering and follow-up, per-thread model/thinking controls,
the blocking extension UI (Pi's entire human-in-the-loop/approval surface), and
a multi-thread thread list.

## Package boundary

The package has two entry points:

- `@assistant-ui/react-pi` — **browser-safe**. The runtime hook, the pure event
  reducer, the message projection, and the HTTP `PiClient`. This entry **never**
  imports `@earendil-works/pi-*`; it speaks an RPC-isomorphic, JSON-safe
  contract (`PiClient`) over an arbitrary transport.
- `@assistant-ui/react-pi/node` — **node-only**. `createPiNodeClient`, which
  drives Pi's `AgentSession`/`AgentSessionRuntime` SDK in-process behind a
  process-singleton `PiThreadSupervisor`. Only this entry pulls in Pi's Node
  packages.

HTTP is one implementation of `PiClient`, not the contract — the runtime hook
never bakes in a transport.

See `docs-internal/pi-integration/PI_MVP_PLAN.md` for the full design.

## Status

MVP, under active development. The contract is shaped to Pi's RPC command/event
vocabulary so an `rpc-subprocess` client can drop in later without touching the
React layer.
