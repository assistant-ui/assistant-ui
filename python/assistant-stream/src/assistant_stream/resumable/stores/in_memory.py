from __future__ import annotations

import asyncio
import time
import uuid
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
    ResumableStreamAcquisition,
    ResumableStreamEntry,
    ResumableStreamLease,
    ResumableStreamRole,
    ResumableStreamStatus,
)

_CURSOR_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"


@dataclass
class _StreamState:
    lease: ResumableStreamLease
    ttl_ms: int
    expires_at: float
    entries: list[ResumableStreamEntry] = field(default_factory=list)
    final: Literal["done", "error"] | None = None
    error: str | None = None
    waiters: list[asyncio.Event] = field(default_factory=list)

    def notify(self) -> None:
        waiters, self.waiters = self.waiters, []
        for event in waiters:
            event.set()


def _cursor_of(seq: int) -> str:
    chars = ""
    while seq:
        seq, rem = divmod(seq, 36)
        chars = _CURSOR_ALPHABET[rem] + chars
    return chars or "0"


def _seq_from_cursor(cursor: str) -> int:
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

    def _enter(self, stream_id: str) -> None:
        interval_ms = self._gc_interval_ms
        if interval_ms is not None and not self._disposed and self._gc_task is None:
            with suppress(RuntimeError):
                loop = asyncio.get_running_loop()
                self._gc_task = loop.create_task(self._gc_loop(interval_ms / 1000.0))
        validate_stream_id(stream_id)

    async def _gc_loop(self, interval_s: float) -> None:
        while True:
            await asyncio.sleep(interval_s)
            self._evict_expired()

    def _evict_expired(self) -> None:
        t = self._now()
        expired = [(k, s) for k, s in self._streams.items() if s.expires_at <= t]
        for stream_id, state in expired:
            del self._streams[stream_id]
            if state.final is None:
                state.final, state.error = "error", "Stream expired"
            state.notify()

    def _get(self, stream_id: str) -> _StreamState | None:
        self._evict_expired()
        return self._streams.get(stream_id)

    def _get_existing(self, stream_id: str) -> _StreamState:
        state = self._get(stream_id)
        if state is None:
            raise RuntimeError(f"Stream not found: {stream_id}")
        return state

    async def acquire(
        self, stream_id: str, *, ttl_ms: int | None = None
    ) -> ResumableStreamRole:
        return (await self.acquire_lease(stream_id, ttl_ms=ttl_ms)).role

    async def acquire_lease(
        self, stream_id: str, *, ttl_ms: int | None = None
    ) -> ResumableStreamAcquisition:
        self._enter(stream_id)
        if self._get(stream_id) is not None:
            return ResumableStreamAcquisition(role="consumer", lease=None)
        if self._max_streams is not None and len(self._streams) >= self._max_streams:
            raise RuntimeError("maxStreams exceeded")
        ttl = ttl_ms if ttl_ms is not None else self._default_ttl_ms
        lease = ResumableStreamLease(token=uuid.uuid4().hex)
        self._streams[stream_id] = _StreamState(
            lease=lease, ttl_ms=ttl, expires_at=self._now() + ttl
        )
        return ResumableStreamAcquisition(role="producer", lease=lease)

    async def append(
        self,
        stream_id: str,
        chunk: bytes,
        lease: ResumableStreamLease | None = None,
    ) -> None:
        self._enter(stream_id)
        if self._max_chunk_bytes is not None and len(chunk) > self._max_chunk_bytes:
            raise RuntimeError(f"Chunk exceeds maxChunkBytes: {len(chunk)}")
        state = self._get_existing(stream_id)
        if lease is not None and state.lease != lease:
            raise ResumableStreamError(
                "missing", f"Stream superseded by a new acquisition: {stream_id}"
            )
        if state.final is not None:
            raise ResumableStreamError(
                "finalized", f"Stream already finalized: {stream_id}"
            )
        if (
            self._max_entries_per_stream is not None
            and len(state.entries) >= self._max_entries_per_stream
        ):
            raise RuntimeError(f"Stream exceeded maxEntriesPerStream: {stream_id}")
        cursor = _cursor_of(len(state.entries) + 1)
        state.entries.append(ResumableStreamEntry(cursor=cursor, chunk=chunk))
        state.expires_at = self._now() + state.ttl_ms
        state.notify()

    async def finalize(
        self,
        stream_id: str,
        status: Literal["done", "error"],
        error: str | None = None,
        lease: ResumableStreamLease | None = None,
    ) -> bool:
        self._enter(stream_id)
        state = self._get_existing(stream_id)
        if (lease is not None and state.lease != lease) or state.final is not None:
            return False
        state.final = status
        if status == "error":
            state.error = error if error is not None else "Stream errored"
        state.expires_at = self._now() + state.ttl_ms
        state.notify()
        return True

    async def read(
        self, stream_id: str, cursor: str, signal: CancellationSignal
    ) -> AsyncIterator[ResumableStreamEntry]:
        self._enter(stream_id)
        state = self._get_existing(stream_id)
        # Cursors are 1-based sequence numbers and entries are never removed.
        idx = min(max(_seq_from_cursor(cursor), 0), len(state.entries))

        while True:
            if signal.is_set():
                return
            while idx < len(state.entries):
                if signal.is_set():
                    return
                yield state.entries[idx]
                idx += 1
            if state.final == "error":
                raise RuntimeError(state.error or "Stream errored")
            if state.final is not None:
                return
            await _wait_for_update(state, signal, state.expires_at - self._now())
            self._evict_expired()

    async def status(self, stream_id: str) -> ResumableStreamStatus:
        self._enter(stream_id)
        state = self._get(stream_id)
        if state is None:
            return "missing"
        return state.final or "streaming"

    async def delete(self, stream_id: str) -> None:
        self._enter(stream_id)
        state = self._streams.pop(stream_id, None)
        if state is None:
            return
        if state.final is None:
            state.final = "done"
        state.notify()

    def dispose(self) -> None:
        self._disposed = True
        if self._gc_task is not None:
            self._gc_task.cancel()
            self._gc_task = None


async def _wait_for_update(
    state: _StreamState, signal: CancellationSignal, wake_by_ms: float
) -> None:
    if signal.is_set() or wake_by_ms <= 0:
        return
    event = asyncio.Event()
    state.waiters.append(event)
    tasks = {
        asyncio.create_task(event.wait()),
        asyncio.create_task(signal.wait()),
    }
    try:
        await asyncio.wait(
            tasks, timeout=wake_by_ms / 1000.0, return_when=asyncio.FIRST_COMPLETED
        )
    finally:
        for task in tasks:
            task.cancel()
        for task in tasks:
            with suppress(asyncio.CancelledError):
                await task
        with suppress(ValueError):
            state.waiters.remove(event)


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
