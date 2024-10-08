import asyncio
from typing import Any, AsyncGenerator, Callable, Coroutine
from assistant_stream.assistant_stream_chunk import AssistantStreamChunk, TextDeltaChunk


class RunController:
    def __init__(self, queue):
        self.queue = queue
        self.loop = asyncio.get_event_loop()

    def append_text(self, text_delta: str):
        """Append a text delta to the stream."""
        chunk = TextDeltaChunk(type="text-delta", textDelta=text_delta)
        self.loop.call_soon_threadsafe(self.queue.put_nowait, chunk)

    def append_step(self, stream: AsyncGenerator[AssistantStreamChunk, None]):
        """Append a substream to the main stream."""

        async def reader():
            async for chunk in stream:
                await self.queue.put(chunk)

        return asyncio.create_task(reader())


async def create_assistant_run(
    callback: Callable[[RunController], Coroutine[Any, Any, None]]
) -> AsyncGenerator[AssistantStreamChunk, None]:
    queue = asyncio.Queue()
    controller = RunController(queue)

    async def background_task():
        await callback(controller)
        queue.put_nowait(None)

    task = asyncio.create_task(background_task())

    while True:
        chunk = await controller.queue.get()
        if chunk is None:
            break
        yield chunk

    await task
