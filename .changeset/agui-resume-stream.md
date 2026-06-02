---
"@assistant-ui/react-ag-ui": patch
---

feat(react-ag-ui): honor `CreateResumeRunConfig.stream` in `AgUiThreadRuntimeCore`

`resume()` previously logged `resume stream is not supported` and fell back to a fresh `agent.runAgent(...)`, re-running the agent on every resume. It now passes the resume generator into `startRun`, which replays each `ChatModelRunResult` into the existing assistant message (no new `runId`, no replayed `agent.runAgent`). On history `load()` with `unstable_resume`, the adapter now feeds `history.resume()` when present (falling back to a fresh run otherwise), and `ResumeRunConfig.stream` is typed as the real `(options: ChatModelRunOptions) => AsyncGenerator<ChatModelRunResult, void, unknown>` instead of `unknown`. This lets apps that persist their own AG-UI event stream re-attach and continue consuming on reload.
