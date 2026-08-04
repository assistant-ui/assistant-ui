import asyncio
import json

import pytest

from assistant_stream.assistant_stream_chunk import TextDeltaChunk
from assistant_stream.serialization.assistant_stream_response import (
    AssistantStreamResponse,
)
from assistant_stream.serialization.assistant_transport import (
    AssistantTransportEncoder,
    AssistantTransportResponse,
)
from assistant_stream.serialization.data_stream import (
    DataStreamEncoder,
    DataStreamResponse,
)
from assistant_stream.serialization.heartbeat import (
    DATA_STREAM_KEEPALIVE_LINE,
    DEFAULT_HEARTBEAT_INTERVAL,
    SSE_HEARTBEAT_LINE,
    add_keepalive,
    add_sse_heartbeat,
    resolve_heartbeat_interval,
)
from assistant_stream.serialization.openai_stream import OpenAIStreamResponse
from assistant_stream.serialization.stream_encoder import StreamEncoder


def test_resolve_heartbeat_interval():
    assert resolve_heartbeat_interval(True) == DEFAULT_HEARTBEAT_INTERVAL
    assert resolve_heartbeat_interval(None) is None
    assert resolve_heartbeat_interval(False) is None
    assert resolve_heartbeat_interval(0) is None
    assert resolve_heartbeat_interval(5) == 5.0
    assert resolve_heartbeat_interval(0.5) == 0.5
    for invalid in (-1, -0.5, float("inf"), float("nan")):
        with pytest.raises(ValueError):
            resolve_heartbeat_interval(invalid)


@pytest.mark.anyio
async def test_heartbeat_emitted_when_idle():
    async def stream():
        yield TextDeltaChunk(text_delta="hello")
        await asyncio.sleep(0.55)
        yield TextDeltaChunk(text_delta="world")

    response = AssistantStreamResponse(
        stream(), AssistantTransportEncoder(), heartbeat=0.05
    )
    lines = [line async for line in response.body_iterator]

    heartbeats = [line for line in lines if line == SSE_HEARTBEAT_LINE]
    assert len(heartbeats) >= 2

    data_lines = [line for line in lines if line.startswith("data: ")]
    assert data_lines[-1] == "data: [DONE]\n\n"
    payloads = [json.loads(line[6:-2]) for line in data_lines[:-1]]
    assert [p["textDelta"] for p in payloads if p["type"] == "text-delta"] == [
        "hello",
        "world",
    ]


@pytest.mark.anyio
async def test_heartbeat_false_disables():
    async def stream():
        yield TextDeltaChunk(text_delta="hello")
        await asyncio.sleep(0.15)
        yield TextDeltaChunk(text_delta="world")

    response = AssistantStreamResponse(
        stream(), AssistantTransportEncoder(), heartbeat=False
    )
    lines = [line async for line in response.body_iterator]

    assert all(not line.startswith(":") for line in lines)
    assert lines[-1] == "data: [DONE]\n\n"


@pytest.mark.anyio
async def test_subclass_forwards_heartbeat_kwarg():
    async def stream():
        yield TextDeltaChunk(text_delta="hello")
        await asyncio.sleep(0.15)
        yield TextDeltaChunk(text_delta="world")

    response = AssistantTransportResponse(stream(), heartbeat=False)
    lines = [line async for line in response.body_iterator]

    assert all(not line.startswith(":") for line in lines)
    assert lines[-1] == "data: [DONE]\n\n"


@pytest.mark.anyio
async def test_data_stream_emits_blank_line_keepalives_when_idle():
    async def stream():
        yield TextDeltaChunk(text_delta="hello")
        await asyncio.sleep(0.18)
        yield TextDeltaChunk(text_delta="world")

    response = AssistantStreamResponse(stream(), DataStreamEncoder(), heartbeat=0.05)
    lines = [line async for line in response.body_iterator]

    keepalives = [line for line in lines if line == DATA_STREAM_KEEPALIVE_LINE]
    assert len(keepalives) >= 2
    data_lines = [line for line in lines if line != DATA_STREAM_KEEPALIVE_LINE]
    assert data_lines == ['0:"hello"\n', '0:"world"\n']
    assert lines.index('0:"hello"\n') < lines.index(keepalives[0])
    assert lines.index(keepalives[0]) < lines.index('0:"world"\n')


@pytest.mark.anyio
async def test_data_stream_response_defaults_to_no_keepalives():
    async def stream():
        yield TextDeltaChunk(text_delta="hello")
        await asyncio.sleep(0.15)
        yield TextDeltaChunk(text_delta="world")

    response = DataStreamResponse(stream())
    lines = [line async for line in response.body_iterator]

    assert lines == ['0:"hello"\n', '0:"world"\n']


@pytest.mark.anyio
async def test_data_stream_response_heartbeat_opt_in():
    async def stream():
        yield TextDeltaChunk(text_delta="hello")
        await asyncio.sleep(0.18)
        yield TextDeltaChunk(text_delta="world")

    response = DataStreamResponse(stream(), heartbeat=0.05)
    lines = [line async for line in response.body_iterator]

    assert DATA_STREAM_KEEPALIVE_LINE in lines


class _PassthroughEncoder(StreamEncoder):
    def __init__(self, media_type):
        self._media_type = media_type

    def get_media_type(self):
        return self._media_type

    async def encode_stream(self, stream):
        async for chunk in stream:
            yield f"data: {chunk.text_delta}\n\n"


def test_default_keepalive_token_derives_from_media_type():
    assert (
        _PassthroughEncoder("text/event-stream").get_keepalive_token()
        == SSE_HEARTBEAT_LINE
    )
    assert _PassthroughEncoder("application/json").get_keepalive_token() is None


@pytest.mark.anyio
async def test_custom_sse_encoder_inherits_comment_heartbeats():
    async def stream():
        yield TextDeltaChunk(text_delta="hello")
        await asyncio.sleep(0.18)
        yield TextDeltaChunk(text_delta="world")

    response = AssistantStreamResponse(
        stream(), _PassthroughEncoder("text/event-stream"), heartbeat=0.05
    )
    lines = [line async for line in response.body_iterator]

    assert SSE_HEARTBEAT_LINE in lines


@pytest.mark.anyio
async def test_tokenless_encoder_never_emits_keepalives():
    async def stream():
        yield TextDeltaChunk(text_delta="hello")
        await asyncio.sleep(0.18)
        yield TextDeltaChunk(text_delta="world")

    response = AssistantStreamResponse(
        stream(), _PassthroughEncoder("application/json"), heartbeat=0.05
    )
    lines = [line async for line in response.body_iterator]

    assert lines == ["data: hello\n\n", "data: world\n\n"]


@pytest.mark.anyio
async def test_openai_stream_response_emits_comment_heartbeats():
    async def stream():
        yield TextDeltaChunk(text_delta="hello")
        await asyncio.sleep(0.18)
        yield TextDeltaChunk(text_delta="world")

    response = OpenAIStreamResponse(stream(), heartbeat=0.05)
    lines = [line async for line in response.body_iterator]

    assert SSE_HEARTBEAT_LINE in lines
    assert lines[-1] == "data: [DONE]\n\n"


@pytest.mark.anyio
async def test_add_sse_heartbeat_compat_wrapper():
    async def stream():
        yield "data: 1\n\n"
        await asyncio.sleep(0.18)
        yield "data: 2\n\n"

    lines = [line async for line in add_sse_heartbeat(stream(), 0.05)]

    assert SSE_HEARTBEAT_LINE in lines
    assert [line for line in lines if line != SSE_HEARTBEAT_LINE] == [
        "data: 1\n\n",
        "data: 2\n\n",
    ]


@pytest.mark.anyio
async def test_real_chunk_resets_heartbeat_timer():
    async def stream():
        for i in range(3):
            await asyncio.sleep(0.05)
            yield TextDeltaChunk(text_delta=str(i))

    response = AssistantStreamResponse(
        stream(), AssistantTransportEncoder(), heartbeat=0.5
    )
    lines = [line async for line in response.body_iterator]

    assert SSE_HEARTBEAT_LINE not in lines


@pytest.mark.anyio
async def test_add_keepalive_cancels_pending_read_on_close():
    cancelled = asyncio.Event()

    async def stream():
        yield "data: 1\n\n"
        try:
            await asyncio.sleep(10)
        except asyncio.CancelledError:
            cancelled.set()
            raise

    gen = add_keepalive(stream(), 0.05, SSE_HEARTBEAT_LINE)
    assert await gen.__anext__() == "data: 1\n\n"
    assert await gen.__anext__() == SSE_HEARTBEAT_LINE
    await gen.aclose()
    assert cancelled.is_set()


@pytest.mark.anyio
async def test_add_keepalive_closes_upstream_when_no_read_pending():
    closed = asyncio.Event()

    async def stream():
        try:
            yield "data: 1\n\n"
            yield "data: 2\n\n"
        finally:
            closed.set()

    gen = add_keepalive(stream(), 10, SSE_HEARTBEAT_LINE)
    assert await gen.__anext__() == "data: 1\n\n"
    await gen.aclose()
    assert closed.is_set()
