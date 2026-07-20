import asyncio
import json

import pytest

from assistant_stream.assistant_stream_chunk import TextDeltaChunk
from assistant_stream.serialization.assistant_stream_response import (
    AssistantStreamResponse,
)
from assistant_stream.serialization.assistant_transport import (
    AssistantTransportEncoder,
)
from assistant_stream.serialization.data_stream import DataStreamEncoder
from assistant_stream.serialization.heartbeat import (
    DEFAULT_HEARTBEAT_INTERVAL,
    SSE_HEARTBEAT_LINE,
    add_sse_heartbeat,
    resolve_heartbeat_interval,
)


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
        await asyncio.sleep(0.18)
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
    assert [p["textDelta"] for p in payloads] == ["hello", "world"]


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
async def test_non_sse_response_unaffected():
    async def stream():
        yield TextDeltaChunk(text_delta="hello")
        await asyncio.sleep(0.18)
        yield TextDeltaChunk(text_delta="world")

    response = AssistantStreamResponse(stream(), DataStreamEncoder(), heartbeat=0.05)
    lines = [line async for line in response.body_iterator]

    assert SSE_HEARTBEAT_LINE not in lines


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
async def test_add_sse_heartbeat_cancels_pending_read_on_close():
    cancelled = asyncio.Event()

    async def stream():
        yield "data: 1\n\n"
        try:
            await asyncio.sleep(10)
        except asyncio.CancelledError:
            cancelled.set()
            raise

    gen = add_sse_heartbeat(stream(), 0.05)
    assert await gen.__anext__() == "data: 1\n\n"
    assert await gen.__anext__() == SSE_HEARTBEAT_LINE
    await gen.aclose()
    assert cancelled.is_set()


@pytest.mark.anyio
async def test_add_sse_heartbeat_closes_upstream_when_no_read_pending():
    closed = asyncio.Event()

    async def stream():
        try:
            yield "data: 1\n\n"
            yield "data: 2\n\n"
        finally:
            closed.set()

    gen = add_sse_heartbeat(stream(), 10)
    assert await gen.__anext__() == "data: 1\n\n"
    await gen.aclose()
    assert closed.is_set()
