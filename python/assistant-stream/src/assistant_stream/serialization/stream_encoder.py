import asyncio
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional, Union
from assistant_stream.assistant_stream_chunk import AssistantStreamChunk

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
    return float(heartbeat)


async def add_sse_heartbeat(
    stream: AsyncGenerator[str, None],
    interval: float,
) -> AsyncGenerator[str, None]:
    """
    Yield SSE comment heartbeats whenever the encoded stream is idle for
    `interval` seconds. Any real chunk resets the timer.
    """
    iterator = stream.__aiter__()
    task: Optional[asyncio.Task] = None
    try:
        while True:
            if task is None:
                task = asyncio.ensure_future(iterator.__anext__())
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


class StreamEncoder(ABC):
    """
    Abstract base class for stream encoders, requiring an implementation of `encode_stream`.
    """

    @abstractmethod
    def get_media_type(self) -> str:
        """
        Returns the MIME type of the stream.
        """
        pass

    @abstractmethod
    async def encode_stream(
        self, stream: AsyncGenerator[AssistantStreamChunk, None]
    ) -> AsyncGenerator[str, None]:
        """
        Encode the stream of AssistantStreamChunk into a specific format.
        This method must be implemented by subclasses.
        """
        pass
