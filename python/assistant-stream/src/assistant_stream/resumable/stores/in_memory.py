from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncIterator, Callable
from contextlib import suppress
from dataclasses import dataclass, field
from typing import Literal

from assistant_stream.resumable.errors import (
    DEFAULT_TTL_MS,
    ResumableStreamError,
    validate_stream_id,
)
from assistant_stream.resumable.types import (
    CancellationSignal,
    ResumableStreamEntry,
    ResumableStreamRole,
    ResumableStreamStatus,
)


@dataclass
class _FinalizeMarker:
    kind: Literal["done", "error"]
    error: str | None = None


@dataclass
class _StreamState:
    entries: list[ResumableStreamEntry] = field(default_factory=list)
    next_seq: int = 1
    expires_at: float = 0.0
    ttl_ms: int = 0
    final: _FinalizeMarker | None = None
    waiters: list[asyncio.Event] = field(default_factory=list)


def _cursor_of(seq: int) -> str:
    if seq == 0:
        return "0"
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    n = seq
    chars: list[str] = []
    while n:
        n, rem = divmod(n, 36)
        chars.append(alphabet[rem])
    return "".join(reversed(chars))


def _seq_from_cursor(cursor: str) -> int:
    if cursor == "":
        return 0
    try:
        return int(cursor, 36)
    except ValueError:
        return 0


class _InMemoryResumableStreamStore:
    def __init__(
        self,
        *,
        default_ttl_ms: int,
        now: Callable[[], float],
        max_chunk_bytes: int | None,
        max_entries_per_stream: int | None,
        max_streams: int | None,
        gc_interval_ms: int | None,
    ) -> None:
        self._streams: dict[str, _StreamState] = {}
        self._default_ttl_ms = default_ttl_ms
        self._now = now
        self._max_chunk_bytes = max_chunk_bytes
        self._max_entries_per_stream = max_entries_per_stream
        self._max_streams = max_streams
        self._gc_interval_ms = gc_interval_ms
        self._gc_task: asyncio.Task[None] | None = None
        self._disposed = False

    def _ensure_gc(self) -> None:
        if (
            self._gc_interval_ms is None
            or self._disposed
            or self._gc_task is not None
        ):
            return
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return

        interval_s = self._gc_interval_ms / 1000.0

        async def _gc_loop() -> None:
            while True:
                await asyncio.sleep(interval_s)
                self._evict_expired()

        self._gc_task = loop.create_task(_gc_loop())

    def _evict_expired(self) -> None:
        t = self._now()
        expired: list[tuple[str, _StreamState]] = []
        for stream_id, state in self._streams.items():
            if state.expires_at <= t:
                expired.append((stream_id, state))
        for stream_id, state in expired:
            del self._streams[stream_id]
            if state.final is None:
                state.final = _FinalizeMarker(kind="error", error="Stream expired")
            self._notify(state)

    def _notify(self, state: _StreamState) -> None:
        waiters = state.waiters
        state.waiters = []
        for event in waiters:
            event.set()

    def _find_start_index(self, state: _StreamState, cursor: str) -> int:
        if cursor == "":
            return 0
        after = _seq_from_cursor(cursor)
        lo = 0
        hi = len(state.entries)
        while lo < hi:
            mid = (lo + hi) // 2
            seq = _seq_from_cursor(state.entries[mid].cursor)
            if seq <= after:
                lo = mid + 1
            else:
                hi = mid
        return lo

    async def _wait_for_update(
        self,
        state: _StreamState,
        signal: CancellationSignal,
        wake_by: float | None,
    ) -> None:
        if signal.is_set():
            return
        if wake_by is not None and wake_by <= 0:
            return

        event = asyncio.Event()
        state.waiters.append(event)

        notify_task = asyncio.create_task(event.wait())
        signal_task = asyncio.create_task(signal.wait())
        tasks: set[asyncio.Task[object]] = {notify_task, signal_task}
        if wake_by is not None:
            tasks.add(asyncio.create_task(asyncio.sleep(wake_by / 1000.0)))

        try:
            await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        finally:
            for task in tasks:
                if not task.done():
                    task.cancel()
            for task in tasks:
                with suppress(asyncio.CancelledError):
                    await task
            with suppress(ValueError):
                state.waiters.remove(event)

    def _require_active(self, stream_id: str) -> _StreamState:
        self._evict_expired()
        state = self._streams.get(stream_id)
        if state is None:
            raise RuntimeError(f"Stream not found: {stream_id}")
        if state.final is not None:
            raise ResumableStreamError(
                "finalized",
                f"Stream already finalized: {stream_id}",
            )
        return state

    async def acquire(
        self, stream_id: str, *, ttl_ms: int | None = None
    ) -> ResumableStreamRole:
        self._ensure_gc()
        validate_stream_id(stream_id)
        self._evict_expired()
        if stream_id in self._streams:
            return "consumer"

        if self._max_streams is not None and len(self._streams) >= self._max_streams:
            raise RuntimeError("maxStreams exceeded")

        resolved_ttl = ttl_ms if ttl_ms is not None else self._default_ttl_ms
        self._streams[stream_id] = _StreamState(
            entries=[],
            next_seq=1,
            expires_at=self._now() + resolved_ttl,
            ttl_ms=resolved_ttl,
            final=None,
            waiters=[],
        )
        return "producer"

    async def append(self, stream_id: str, chunk: bytes) -> None:
        self._ensure_gc()
        validate_stream_id(stream_id)
        if (
            self._max_chunk_bytes is not None
            and len(chunk) > self._max_chunk_bytes
        ):
            raise RuntimeError(f"Chunk exceeds maxChunkBytes: {len(chunk)}")
        state = self._require_active(stream_id)
        if (
            self._max_entries_per_stream is not None
            and len(state.entries) >= self._max_entries_per_stream
        ):
            raise RuntimeError(f"Stream exceeded maxEntriesPerStream: {stream_id}")
        seq = state.next_seq
        state.next_seq += 1
        state.entries.append(ResumableStreamEntry(cursor=_cursor_of(seq), chunk=chunk))
        state.expires_at = self._now() + state.ttl_ms
        self._notify(state)

    async def finalize(
        self,
        stream_id: str,
        status: Literal["done", "error"],
        error: str | None = None,
    ) -> None:
        self._ensure_gc()
        validate_stream_id(stream_id)
        self._evict_expired()
        state = self._streams.get(stream_id)
        if state is None:
            raise RuntimeError(f"Stream not found: {stream_id}")
        if state.final is not None:
            return
        if status == "done":
            state.final = _FinalizeMarker(kind="done")
        else:
            state.final = _FinalizeMarker(
                kind="error", error=error if error is not None else "Stream errored"
            )
        state.expires_at = self._now() + state.ttl_ms
        self._notify(state)

    async def read(
        self, stream_id: str, cursor: str, signal: CancellationSignal
    ) -> AsyncIterator[ResumableStreamEntry]:
        self._ensure_gc()
        validate_stream_id(stream_id)
        self._evict_expired()
        state = self._streams.get(stream_id)
        if state is None:
            raise RuntimeError(f"Stream not found: {stream_id}")

        idx = self._find_start_index(state, cursor)

        while True:
            if signal.is_set():
                return

            while idx < len(state.entries):
                if signal.is_set():
                    return
                yield state.entries[idx]
                idx += 1

            if state.final is not None:
                if state.final.kind == "error":
                    raise RuntimeError(state.final.error or "Stream errored")
                return

            wake_by = state.expires_at - self._now()
            await self._wait_for_update(state, signal, wake_by)
            self._evict_expired()

    async def status(self, stream_id: str) -> ResumableStreamStatus:
        self._ensure_gc()
        validate_stream_id(stream_id)
        self._evict_expired()
        state = self._streams.get(stream_id)
        if state is None:
            return "missing"
        if state.final is None:
            return "streaming"
        return "error" if state.final.kind == "error" else "done"

    async def delete(self, stream_id: str) -> None:
        self._ensure_gc()
        validate_stream_id(stream_id)
        state = self._streams.get(stream_id)
        if state is None:
            return
        del self._streams[stream_id]
        if state.final is None:
            state.final = _FinalizeMarker(kind="done")
        self._notify(state)

    def dispose(self) -> None:
        self._disposed = True
        if self._gc_task is not None:
            self._gc_task.cancel()
            self._gc_task = None


def create_in_memory_resumable_stream_store(
    *,
    default_ttl_ms: int = DEFAULT_TTL_MS,
    now: Callable[[], float] | None = None,
    max_chunk_bytes: int | None = None,
    max_entries_per_stream: int | None = None,
    max_streams: int | None = None,
    gc_interval_ms: int | None = None,
) -> _InMemoryResumableStreamStore:
    return _InMemoryResumableStreamStore(
        default_ttl_ms=default_ttl_ms,
        now=now if now is not None else (lambda: time.time() * 1000),
        max_chunk_bytes=max_chunk_bytes,
        max_entries_per_stream=max_entries_per_stream,
        max_streams=max_streams,
        gc_interval_ms=gc_interval_ms,
    )
