from assistant_stream.assistant_stream_chunk import AssistantStreamChunk
from assistant_stream.serialization.heartbeat import (
    HeartbeatOption,
    add_keepalive,
    resolve_heartbeat_interval,
)
from assistant_stream.serialization.stream_encoder import StreamEncoder
from typing import AsyncGenerator

from anyio import CancelScope
from starlette.responses import StreamingResponse
from starlette.types import Send


async def _close_on_exit(
    body: AsyncGenerator[str, None],
    stream: AsyncGenerator[AssistantStreamChunk, None],
) -> AsyncGenerator[str, None]:
    try:
        async for chunk in body:
            yield chunk
    finally:
        with CancelScope(shield=True):
            try:
                close = getattr(body, "aclose", None)
                if close is not None:
                    await close()
            finally:
                close = getattr(stream, "aclose", None)
                if close is not None and not getattr(stream, "ag_running", False):
                    await close()


class AssistantStreamResponse(StreamingResponse):
    """
    Streams an encoded assistant stream. Encoders that declare a keepalive
    token (SSE comment lines for event streams, blank lines for data streams)
    emit it while the stream is idle (15s interval by default) to keep proxies
    from timing out the connection. Pass `heartbeat=<seconds>` to change the
    interval, or `heartbeat=False` to disable heartbeats.
    """

    def __init__(
        self,
        stream: AsyncGenerator[AssistantStreamChunk, None],
        stream_encoder: StreamEncoder,
        heartbeat: HeartbeatOption = True,
    ):
        heartbeat_interval = resolve_heartbeat_interval(heartbeat)
        keepalive_token = stream_encoder.get_keepalive_token()
        body = stream_encoder.encode_stream(stream)
        if heartbeat_interval is not None and keepalive_token is not None:
            body = add_keepalive(body, heartbeat_interval, keepalive_token)
        super().__init__(
            _close_on_exit(body, stream),
            media_type=stream_encoder.get_media_type(),
        )

    async def stream_response(self, send: Send) -> None:
        try:
            await super().stream_response(send)
        finally:
            with CancelScope(shield=True):
                await self.body_iterator.aclose()
