import asyncio
from typing import Any, AsyncGenerator
from assistant_stream.identifiers import generate_prefixed_id
from assistant_stream.queue_stream import enqueue_threadsafe, queue_stream
from assistant_stream.assistant_stream_chunk import (
    AssistantStreamChunk,
    ToolCallBeginChunk,
    ToolCallArgsTextFinishChunk,
    ToolCallDeltaChunk,
    ToolResultChunk,
)


def generate_openai_style_tool_call_id():
    return generate_prefixed_id("call_")


class ToolCallController:
    def __init__(self, queue, tool_name: str, tool_call_id: str, parent_id: str = None):
        self.tool_name = tool_name
        self.tool_call_id = tool_call_id
        self.queue = queue
        self.loop = asyncio.get_running_loop()
        self._closed = False

        begin_chunk = ToolCallBeginChunk(
            tool_call_id=self.tool_call_id,
            tool_name=self.tool_name,
            parent_id=parent_id,
        )
        self.queue.put_nowait(begin_chunk)

    def append_args_text(self, args_text_delta: str) -> None:
        """Append an args text delta to the stream."""
        chunk = ToolCallDeltaChunk(
            tool_call_id=self.tool_call_id,
            args_text_delta=args_text_delta,
        )
        enqueue_threadsafe(self.loop, self.queue, chunk)

    def set_result(self, result: Any) -> None:
        """
        Set the result of the tool call.

        Deprecated: Use set_response() instead.
        """
        import warnings

        warnings.warn(
            "set_result() is deprecated. Use set_response() instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.set_response(result)

    def set_response(
        self, result: Any, *, artifact: Any | None = None, is_error: bool = False
    ) -> None:
        """Set the result of the tool call."""

        chunk = ToolResultChunk(
            tool_call_id=self.tool_call_id,
            result=result,
            artifact=artifact,
            is_error=is_error,
        )
        enqueue_threadsafe(self.loop, self.queue, chunk)
        self.close()

    def close(self) -> None:
        """Close the stream."""
        if self._closed:
            return
        self._closed = True
        enqueue_threadsafe(
            self.loop,
            self.queue,
            ToolCallArgsTextFinishChunk(tool_call_id=self.tool_call_id),
        )
        enqueue_threadsafe(self.loop, self.queue, None)


async def create_tool_call(
    tool_name: str,
    tool_call_id: str,
    parent_id: str = None,
) -> tuple[AsyncGenerator[AssistantStreamChunk, None], ToolCallController]:
    queue = asyncio.Queue()
    controller = ToolCallController(queue, tool_name, tool_call_id, parent_id)

    return queue_stream(controller.queue), controller
