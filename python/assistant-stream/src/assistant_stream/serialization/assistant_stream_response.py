from assistant_stream.assistant_stream_chunk import AssistantStreamChunk
from assistant_stream.serialization.stream_encoder import StreamEncoder
from typing import AsyncGenerator

from starlette.responses import StreamingResponse


class AssistantStreamResponse(StreamingResponse):
    def __init__(
        self,
        stream: AsyncGenerator[AssistantStreamChunk, None],
        stream_encoder: StreamEncoder,
    ):
        super().__init__(
            stream_encoder.encode_stream(stream),
            media_type=stream_encoder.get_media_type(),
        )
