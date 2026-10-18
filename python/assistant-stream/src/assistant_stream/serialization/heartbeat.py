import asyncio
import math
from anyio import CancelScope, move_on_after
from assistant_stream.create_run import _EARLY_CLOSE_GRACE_SECONDS
from typing import AsyncGenerator, Optional, Union

DEFAULT_HEARTBEAT_INTERVAL = 15.0

SSE_HEARTBEAT_LINE = ": heartbeat\n\n"

DATA_STREAM_KEEPALIVE_LINE = "\n"

HeartbeatOption = Union[float, int, bool, None]


def _retrieve_task_exception(task: asyncio.Task) -> None:
    if not task.cancelled():
        task.exception()


def resolve_heartbeat_interval(
    heartbeat: HeartbeatOption,
) -> Optional[float]:
    """
    Normalize a heartbeat option to an interval in seconds.

    True enables the default interval; a positive number is used as-is;
    0, False, and None disable heartbeats.
    """
    if heartbeat is True:
        return DEFAULT_HEARTBEAT_INTERVAL
    if not heartbeat:
        return None
    interval = float(heartbeat)
    if not math.isfinite(interval) or interval <= 0:
        raise ValueError(f"heartbeat interval must be a positive finite number, got {heartbeat!r}")
    return interval


async def add_keepalive(
    stream: AsyncGenerator[str, None],
    interval: float,
    token: str,
) -> AsyncGenerator[str, None]:
    """
    Yield `token` as a keepalive whenever the encoded stream is idle for
    `interval` seconds. Any real chunk resets the timer.
    """
    task: Optional[asyncio.Task] = None
    try:
        while True:
            if task is None:
                task = asyncio.create_task(stream.__anext__())
            done, _ = await asyncio.wait({task}, timeout=interval)
            if not done:
                yield token
                continue
            try:
                item = task.result()
            except StopAsyncIteration:
                task = None
                return
            task = None
            yield item
    finally:
        with CancelScope(shield=True):
            if task is not None:
                task.cancel()
                try:
                    with move_on_after(_EARLY_CLOSE_GRACE_SECONDS):
                        await asyncio.wait({task})
                finally:
                    if task.done():
                        _retrieve_task_exception(task)
                    else:
                        task.add_done_callback(_retrieve_task_exception)
            if task is None or task.done():
                await stream.aclose()


def add_sse_heartbeat(
    stream: AsyncGenerator[str, None],
    interval: float,
) -> AsyncGenerator[str, None]:
    """
    Deprecated alias for `add_keepalive` with the SSE comment token,
    kept for compatibility with assistant-stream <= 0.0.35.
    """
    return add_keepalive(stream, interval, SSE_HEARTBEAT_LINE)
