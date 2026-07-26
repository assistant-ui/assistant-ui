from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass, field
from typing import Any, Literal

from assistant_stream.resumable.errors import ResumableStreamError
from assistant_stream.resumable.types import (
    ResumableStreamRole,
    ResumableStreamStatus,
    ResumableStreamStore,
)

logger = logging.getLogger(__name__)
_hook_logger = logging.getLogger("assistant_stream.resumable")

MakeStream = Callable[[], AsyncIterator[bytes]]
WaitUntil = Callable[[asyncio.Task[None]], None]
OnAcquire = Callable[[str, ResumableStreamRole], None]
OnAppend = Callable[[str, int], None]
OnFinalize = Callable[[str, Literal["done", "error"], str | None], None]
OnError = Callable[[str, object], None]


def _call_hook(hook: Callable[..., Any] | None, /, *args: Any) -> None:
    if hook is None:
        return
    try:
        hook(*args)
    except Exception:
        _hook_logger.debug("resumable stream hook failed: %r", hook, exc_info=True)


@dataclass
class ResumableStreamContext:
    _store: ResumableStreamStore
    _ttl_ms: int | None
    _wait_until: WaitUntil | None
    _on_acquire: OnAcquire | None
    _on_append: OnAppend | None
    _on_finalize: OnFinalize | None
    _on_error: OnError | None
    _tasks: set[asyncio.Task[None]] = field(default_factory=set, repr=False)

    async def run(
        self, stream_id: str, make_stream: MakeStream
    ) -> AsyncIterator[bytes]:
        role = await self._store.acquire(
            stream_id,
            ttl_ms=self._ttl_ms,
        )
        _call_hook(self._on_acquire, stream_id, role)
        if role == "producer":
            _start_producer_task(
                self._store,
                stream_id,
                make_stream,
                tasks=self._tasks,
                wait_until=self._wait_until,
                on_append=self._on_append,
                on_finalize=self._on_finalize,
                on_error=self._on_error,
            )
        return _read_from_store(self._store, stream_id)

    async def resume(self, stream_id: str) -> AsyncIterator[bytes] | None:
        status = await self._store.status(stream_id)
        if status == "missing":
            return None
        return _read_from_store(self._store, stream_id)

    async def require_resume(self, stream_id: str) -> AsyncIterator[bytes]:
        status = await self._store.status(stream_id)
        if status == "missing":
            raise ResumableStreamError(
                "missing",
                f"resumable stream not found: {stream_id}",
            )
        return _read_from_store(self._store, stream_id)

    async def status(self, stream_id: str) -> ResumableStreamStatus:
        return await self._store.status(stream_id)

    async def delete(self, stream_id: str) -> None:
        await self._store.delete(stream_id)


def create_resumable_stream_context(
    *,
    store: ResumableStreamStore,
    ttl_ms: int | None = None,
    wait_until: WaitUntil | None = None,
    on_acquire: OnAcquire | None = None,
    on_append: OnAppend | None = None,
    on_finalize: OnFinalize | None = None,
    on_error: OnError | None = None,
) -> ResumableStreamContext:
    return ResumableStreamContext(
        _store=store,
        _ttl_ms=ttl_ms,
        _wait_until=wait_until,
        _on_acquire=on_acquire,
        _on_append=on_append,
        _on_finalize=on_finalize,
        _on_error=on_error,
    )


def _start_producer_task(
    store: ResumableStreamStore,
    stream_id: str,
    make_stream: MakeStream,
    *,
    tasks: set[asyncio.Task[None]],
    wait_until: WaitUntil | None,
    on_append: OnAppend | None,
    on_finalize: OnFinalize | None,
    on_error: OnError | None,
) -> None:
    async def _pump() -> None:
        try:
            async for chunk in make_stream():
                await store.append(stream_id, chunk)
                _call_hook(on_append, stream_id, len(chunk))
            await store.finalize(stream_id, "done")
            _call_hook(on_finalize, stream_id, "done", None)
        except Exception as err:
            _call_hook(on_error, stream_id, err)
            message = str(err) if str(err) else repr(err)
            try:
                await store.finalize(stream_id, "error", message)
                _call_hook(on_finalize, stream_id, "error", message)
            except Exception as finalize_err:
                logger.error(
                    "resumable stream finalize failed: %s", finalize_err
                )

    task = asyncio.create_task(_pump())
    tasks.add(task)
    task.add_done_callback(tasks.discard)
    if wait_until is not None:
        wait_until(task)

    def _done_callback(done_task: asyncio.Task[None]) -> None:
        try:
            exc = done_task.exception()
        except asyncio.CancelledError:
            return
        if exc is not None:
            logger.error("resumable producer task failed: %s", exc)

    task.add_done_callback(_done_callback)


async def _read_from_store(
    store: ResumableStreamStore, stream_id: str
) -> AsyncIterator[bytes]:
    signal = asyncio.Event()
    try:
        async for entry in store.read(stream_id, "", signal):
            yield entry.chunk
    finally:
        signal.set()
