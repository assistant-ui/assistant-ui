---
"@assistant-ui/react-langgraph": patch
---

fix: `cancelRun` now settles a run whose stream hangs instead of yielding

`sendMessage` consumed the caller's stream with `for await`, so a stream that ignores its `abortSignal` and then parks awaiting its own work left the loop waiting on `next()` with nothing to wake it. The run never settled, `isRunning` stayed on, and anything serialized behind it never started. #5525 stopped such a stream from being applied after cancellation, but only once it yielded again.

The stream is now consumed through a wrapper that reports it as exhausted at cancellation, and finalizes it without waiting for a source that would not settle either. The await that opens the stream is raced against cancellation too, since a stream that parks before handing the iterable over stranded the run the same way.
