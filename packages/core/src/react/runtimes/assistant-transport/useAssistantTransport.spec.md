useAssistantTransport

Overview

- Similar API as `useDataStreamRuntime`.
- Built on an external-store runtime; the external store issues "commands".
- Exactly one run is active at a time (single-flight).
- Runs take queued commands as input and consume an assistant stream that yields state snapshots.
- Every run flushes the entire command queue; a single run processes all pending commands.

Command Scheduling

- When commands are enqueued:
  - If a run is in progress: do not start another; mark that a follow-up run is pending.
  - When the current run ends: if commands were scheduled during the run, start a new run and publish them.
  - If no run is in progress: start a run immediately and flush commands to the server.
- A follow-up run that finds an empty queue is a no-op: no request is sent and no error is surfaced.
- A resume run sends no commands; commands enqueued while it is pending or active are flushed in a follow-up run after it settles.

Resume State

- With `resumeStateApi` configured, a resume first posts `{ threadId }` there; the endpoint returns `{ runId, state }`, the state that started the active run.
- The resume request carries `runId` and no `state`: the server replays from the snapshot it retained for that run, so neither `body` overrides nor a `prepareSendCommandsRequest` rebuild can substitute a different base. `runId` takes precedence over `body` fields and is re-attached after `prepareSendCommandsRequest` so a rebuilt body cannot drop it. The local base is replaced by the snapshot only after the resume stream responds OK, so a rejected resume keeps the local state.
- A 204 response means no active run: the resume is skipped without error, and queued commands are flushed in a follow-up run.
- A malformed snapshot response fails the resume before the replay request is sent.
- If a pending resume is dropped by an error or cancellation, later commands start normal runs.
- Runs execute on a `queueMicrotask`, so multiple synchronous enqueues coalesce into a single request: the first run's flush takes all of them, and the coalesced follow-up run no-ops.

Command Queue

`useCommandQueue({ onQueue() { runManager.schedule(); } })`

- `enqueue(cmd, { schedule? })`: Adds a command to the queue. Calls `onQueue` unless `schedule: false`.
- `flush(): Command[]`: Returns all queued commands, moves them into `inTransit`, and clears the queue.
- Internal state tracks `inTransit: Command[]` and `queued: Command[]`.

Run Manager

`useRunManager({
async onRun(signal) {
const commands = commandQueue.flush();
setInTransitCommands(commands);

    try {
      const response = await fetch(backendUrl, { signal });
      const stream = response.body
        .pipeThrough(new DataStreamDecoder())
        .pipeThrough(
          new AssistantMessageAccumulator({
            initialMessage: createInitialMessage({
              unstable_state: (state.state as ReadonlyJSONValue) ?? null,
            }),
          }),
        );

      for await (const snapshot of stream) {
        // Clear in-transit commands after the first response chunk.
        // Use a stable empty array to avoid unnecessary re-renders.
        setInTransitCommands(EMPTY_ARRAY);
        setSnapshot(snapshot);
      }

      // A run that completes successfully confirms delivery even when no
      // state-changing chunk was observed — clear in-transit commands here
      // as well.
      setInTransitCommands(EMPTY_ARRAY);
    } catch (error) {
      // Do not restore commands. Surface error to onError for state update.
      callbacks.onError?.({
        error,
        commands: getCurrentInTransitCommands(),
        updateState(updater) {
          setSnapshot((prev) => updater(prev));
        },
      });
    }

},
})`

- `schedule()`: Starts immediately if idle, or schedules at most one follow-up run to start right after the current run.
- `cancel()`: Aborts the active run via `signal` and clears any scheduled follow-up run. Does not restore commands.
- Unmount aborts the active run via `signal`; no callbacks (`onCancel`, `onError`, `onFinish`) are invoked. StrictMode's setup/cleanup/setup effect cycle re-arms the manager.
- `isRunning: boolean`: Indicates whether a run is currently active (internal to scheduling).
  UI-facing `isRunning` is controlled by the converter output (see Converter).
- On cancellation, invoke `callbacks.onCancel?.({ commands, updateState })` where `commands` contains all pending work at the time of cancel: `[...inTransitCommands, ...queuedCommands]`. Note: after the first snapshot arrives, `inTransitCommands` are cleared to `[]`, so cancels after first byte will not include them.
- RunConfig is not supported for now; any provided run configuration is ignored.

Converter

`useConverter({
  converter,
  agentState,
  queuedCommands,
  inTransitCommands,
})`

- Reactive pattern: do not imperatively set converted state. Maintain an `agentState` snapshot variable (updated via stream), and compute the converted UI state with a memoized converter.
  - Example: `const pending = [...inTransitCommands, ...queuedCommands]; const converted = useMemo(() => converter(agentState, { pendingCommands: pending, isSending }), [agentState, pending, isSending])`
  - `isSending` should be sourced from the run manager’s `isRunning` flag.
- Returns `AssistantTransportState` with `{ messages, isRunning }` derived from inputs via `converter`.
- The converter controls UI `isRunning`. Typical mapping: `isRunning = isSending`. Advanced policies are allowed (e.g., extend running while reconciling, or suppress during background tool results).
- Assistant stream deltas are applied by `AssistantMessageAccumulator`, which emits immutable full-state snapshots; no additional delta handling is required in the converter.

Tool Invocations

`useToolInvocations({
  messages,
  onResult(result) { commandQueue.enqueue(result); },
})`

- Uses a ToolCall differ to diff tool calls across successive snapshots (e.g., ToolCallDiffer).
- When a tool call’s argsText transitions from incomplete → complete and `result` is undefined, synthesize a tool-execution event and enqueue an `add-tool-result` command via `onResult`.
- `onResult` is for frontend function calling (client-side tool calls producing results to enqueue).
- No return value.

External Store Runtime Bridge

`useExternalStoreRuntime({
  isRunning,
  messages,
  onNew(command) { commandQueue.enqueue(command); },
  onCancel() { runManager.cancel(); },
  onAddToolResult(result) { commandQueue.enqueue(result); },
})`

- `onAddToolResult` typically reflects userland-triggered results (e.g., human/tool calling) coming from the external store runtime.

Notes

- Use a stable `EMPTY_ARRAY` when clearing in-transit commands to minimize re-renders via referential equality.
- "Assistant stream" refers to the incremental response stream that yields state snapshots.

Callbacks

- `onError({ error, commands, updateState })`: invoked on network/stream errors. Commands are not restored; use `updateState(state => newState)` to reflect the error in state and/or messages. `commands` reflects the current in-transit commands at the moment of error (often `[]` after the first snapshot).
- `onCancel({ commands, updateState })`: invoked after a cancellation. Commands are not restored. `commands` contains all pending work at cancel time (`inTransitCommands` plus queued). Use `updateState` to reflect cancellation in state and/or messages. The last received snapshot remains committed.

Return Value

- `useAssistantTransport` returns the runtime object from `useExternalStoreRuntime` (e.g., `{ isRunning, messages, ... }`), rather than a custom wrapper shape.
