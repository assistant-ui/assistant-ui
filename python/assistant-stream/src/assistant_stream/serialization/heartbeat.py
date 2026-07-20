import asyncio
import math
from typing import AsyncGenerator, Optional, Union

DEFAULT_HEARTBEAT_INTERVAL = 15.0

SSE_HEARTBEAT_LINE = ": heartbeat\n\n"


def resolve_heartbeat_interval(
    heartbeat: Union[float, int, bool, None],
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


async def add_sse_heartbeat(
    stream: AsyncGenerator[str, None],
    interval: float,
) -> AsyncGenerator[str, None]:
    """
    Yield SSE comment heartbeats whenever the encoded stream is idle for
    `interval` seconds. Any real chunk resets the timer.
    """
    task: Optional[asyncio.Task] = None
    try:
        while True:
            if task is None:
                task = asyncio.create_task(stream.__anext__())
            done, _ = await asyncio.wait({task}, timeout=interval)
            if not done:
                yield SSE_HEARTBEAT_LINE
                continue
            try:
                item = task.result()
            except StopAsyncIteration:
                task = None
                return
            task = None
            yield item
    finally:
        if task is not None:
            task.cancel()
            await asyncio.wait({task})
            if not task.cancelled():
                task.exception()
        await stream.aclose()
