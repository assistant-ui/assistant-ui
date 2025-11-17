from assistant_stream.assistant_stream_chunk import AssistantStreamChunk
from assistant_stream.serialization.assistant_stream_response import (
    AssistantStreamResponse,
)
from assistant_stream.serialization.stream_encoder import StreamEncoder
from assistant_stream.state_proxy import StateProxy
from typing import AsyncGenerator, Any
import json


class StateProxyJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that can handle StateProxy objects."""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, StateProxy):
            return obj._get_value()
        return super().default(obj)


class AssistantTransportEncoder(StreamEncoder):
    """
    AssistantTransportEncoder encodes AssistantStreamChunks into SSE format
    and emits [DONE] when the stream completes.
    """

    def get_media_type(self) -> str:
        return "text/event-stream"

    def _chunk_to_dict(self, chunk: AssistantStreamChunk) -> dict[str, Any]:
        """Convert a chunk to a JSON-serializable dictionary."""
        chunk_dict = {"type": chunk.type}

        # Add all attributes from the chunk
        for key, value in vars(chunk).items():
            if key != "type":  # Already added
                chunk_dict[self._snake_to_camel(key)] = value

        return chunk_dict

    def _snake_to_camel(self, snake_str: str) -> str:
        """Convert snake_case to camelCase."""
        components = snake_str.split("_")
        return components[0] + "".join(x.title() for x in components[1:])

    async def encode_stream(
        self, stream: AsyncGenerator[AssistantStreamChunk, None]
    ) -> AsyncGenerator[str, None]:
        async for chunk in stream:
            chunk_dict = self._chunk_to_dict(chunk)
            chunk_json = json.dumps(chunk_dict, cls=StateProxyJSONEncoder)
            yield f"data: {chunk_json}\n\n"

        # Emit [DONE] marker when stream completes
        yield "data: [DONE]\n\n"


class AssistantTransportResponse(AssistantStreamResponse):
    def __init__(
        self,
        stream: AsyncGenerator[AssistantStreamChunk, None],
    ):
        super().__init__(stream, AssistantTransportEncoder())
