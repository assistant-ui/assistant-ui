from assistant_stream.assistant_stream_chunk import AssistantStreamChunk
from assistant_stream.serialization.stream_encoder import (
    StreamEncoder,
    add_sse_heartbeat,
    resolve_heartbeat_interval,
)
from typing import AsyncGenerator, Union

from starlette.responses import StreamingResponse


class AssistantStreamResponse(StreamingResponse):
    def __init__(
        self,
        stream: AsyncGenerator[AssistantStreamChunk, None],
        stream_encoder: StreamEncoder,
        heartbeat: Union[float, int, bool, None] = None,
    ):
        body = stream_encoder.encode_stream(stream)
        heartbeat_interval = resolve_heartbeat_interval(heartbeat)
        if heartbeat_interval is not None:
            body = add_sse_heartbeat(body, heartbeat_interval)
        super().__init__(
            body,
            media_type=stream_encoder.get_media_type(),
        )
