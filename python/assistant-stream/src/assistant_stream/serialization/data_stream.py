from assistant_stream.assistant_stream_chunk import AssistantStreamChunk
import json
from typing import AsyncGenerator
from assistant_stream.serialization.assistant_stream_response import (
    AssistantStreamResponse,
)
from assistant_stream.serialization.stream_encoder import StreamEncoder


class DataStreamEncoder(StreamEncoder):
    def __init__(self):
        pass

    def encode_chunk(self, chunk: AssistantStreamChunk) -> str:
        if chunk.type == "text-delta":
            return f"0:{json.dumps(chunk.text_delta)}\n"
        elif chunk.type == "tool-call-begin":
            return f'b:{json.dumps({ "toolCallId": chunk.tool_call_id, "toolName": chunk.tool_name })}\n'
        elif chunk.type == "tool-call-delta":
            return f'c:{json.dumps({ "toolCallId": chunk.tool_call_id, "argsTextDelta": chunk.args_text_delta })}\n'
        elif chunk.type == "tool-result":
            return f'a:{json.dumps({ "toolCallId": chunk.tool_call_id, "result": chunk.result })}\n'
        pass

    def get_media_type(self) -> str:
        return "text/plain"

    async def encode_stream(
        self, stream: AsyncGenerator[AssistantStreamChunk, None]
    ) -> AsyncGenerator[str, None]:
        async for chunk in stream:
            yield self.encode_chunk(chunk)


class DataStreamResponse(AssistantStreamResponse):
    def __init__(
        self,
        stream: AsyncGenerator[AssistantStreamChunk, None],
    ):
        super().__init__(stream, DataStreamEncoder())
