import json
from typing import Any, AsyncGenerator, Sequence

from assistant_stream.gorp import GorpOperation
from assistant_stream.serialization.assistant_stream_response import (
    AssistantStreamResponse,
)
from assistant_stream.serialization.heartbeat import HeartbeatOption
from assistant_stream.serialization.stream_encoder import StreamEncoder

ASSISTANT_STREAM_FORMAT_HEADER = "Assistant-Stream-Format"
GORP_STREAM_FORMAT = "object-stream/v0"


def _has_content(snapshot: Any) -> bool:
    if isinstance(snapshot, (dict, list, str)):
        return len(snapshot) > 0
    return False


class GorpStreamEncoder(StreamEncoder):
    """Encodes gorp operation batches as SSE frames.

    Each frame carries a JSON array of operations. A non-empty initial
    snapshot is prepended to the first frame as a root set operation,
    matching the TS GorpStreamEncoder wire format.
    """

    def __init__(self, snapshot: Any = None):
        self._snapshot = snapshot

    def get_media_type(self) -> str:
        return "text/event-stream"

    async def encode_stream(
        self, stream: AsyncGenerator[Sequence[GorpOperation], None]
    ) -> AsyncGenerator[str, None]:
        is_first = True
        async for batch in stream:
            operations = list(batch)
            if is_first and _has_content(self._snapshot):
                operations = [
                    {"type": "set", "path": [], "value": self._snapshot},
                    *operations,
                ]
            is_first = False
            payload = json.dumps(
                operations, separators=(",", ":"), ensure_ascii=False
            )
            yield f"data: {payload}\n\n"


class GorpStreamResponse(AssistantStreamResponse):
    """SSE response streaming gorp operation batches.

    Byte-compatible with the TS fromGorpStreamResponse decoder: SSE frames
    each carrying a JSON array of operations, an optional first-frame
    snapshot prepend, and the object-stream/v0 format header. Idle-time
    heartbeats apply as for any SSE assistant stream response.
    """

    def __init__(
        self,
        stream: AsyncGenerator[Sequence[GorpOperation], None],
        snapshot: Any = None,
        heartbeat: HeartbeatOption = True,
    ):
        super().__init__(stream, GorpStreamEncoder(snapshot), heartbeat=heartbeat)
        self.headers["Cache-Control"] = "no-cache"
        self.headers[ASSISTANT_STREAM_FORMAT_HEADER] = GORP_STREAM_FORMAT
