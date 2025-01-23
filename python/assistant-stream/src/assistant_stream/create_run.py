import asyncio
from typing import Any, AsyncGenerator, Callable, Coroutine
from assistant_stream.assistant_stream_chunk import (
    AssistantStreamChunk,
    TextDeltaChunk,
    ToolResultChunk,
    DataChunk,
    ErrorChunk,
)
from assistant_stream.modules.tool_call import (
    create_tool_call,
    ToolCallController,
    generate_openai_style_tool_call_id,
)


class RunController:
    def __init__(self, queue):
        self._queue = queue
        self._loop = asyncio.get_event_loop()
        self._dispose_callbacks = []
        self._stream_tasks = []

    def append_text(self, text_delta: str) -> None:
        """Append a text delta to the stream."""
        chunk = TextDeltaChunk(text_delta=text_delta)
        self._loop.call_soon_threadsafe(self._queue.put_nowait, chunk)

    async def add_tool_call(
        self, tool_name: str, tool_call_id: str = generate_openai_style_tool_call_id()
    ) -> ToolCallController:
        """Add a tool call to the stream."""

        stream, controller = await create_tool_call(tool_name, tool_call_id)
        self._dispose_callbacks.append(controller.close)
        self.add_stream(stream)
        return controller

    def add_tool_result(self, tool_call_id: str, result: Any) -> None:
        """Add a tool result to the stream."""

        self._loop.call_soon_threadsafe(
            self._queue.put_nowait,
            ToolResultChunk(
                tool_call_id=tool_call_id,
                result=result,
            ),
        )

    def add_stream(self, stream: AsyncGenerator[AssistantStreamChunk, None]) -> None:
        """Append a substream to the main stream."""

        async def reader():
            async for chunk in stream:
                await self._queue.put(chunk)

        task = asyncio.create_task(reader())
        self._stream_tasks.append(task)

    def add_data(self, data: Any) -> None:
        """Emit an event to the main stream."""

        self._loop.call_soon_threadsafe(
            self._queue.put_nowait,
            DataChunk(data=data),
        )

    def add_error(self, error: str) -> None:
        """Emit an event to the main stream."""

        self._loop.call_soon_threadsafe(
            self._queue.put_nowait,
            ErrorChunk(error=error),
        )


async def create_run(
    callback: Callable[[RunController], Coroutine[Any, Any, None]]
) -> AsyncGenerator[AssistantStreamChunk, None]:
    queue = asyncio.Queue()
    controller = RunController(queue)

    async def background_task():
        try:
            await callback(controller)
        except Exception as e:
            controller.add_error(str(e))
            raise
        finally:
            for dispose in controller._dispose_callbacks:
                dispose()
            try:
                for task in controller._stream_tasks:
                    await task
            finally:
                asyncio.get_event_loop().call_soon_threadsafe(queue.put_nowait, None)

    task = asyncio.create_task(background_task())

    while True:
        chunk = await controller._queue.get()
        if chunk is None:
            break
        yield chunk
        controller._queue.task_done()

    await task
