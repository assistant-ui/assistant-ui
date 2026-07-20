import asyncio
import json

import pytest

from assistant_stream.assistant_stream_chunk import TextDeltaChunk
from assistant_stream.serialization.assistant_transport import AssistantTransportEncoder
from assistant_stream.serialization.stream_encoder import (
    DEFAULT_HEARTBEAT_INTERVAL,
    SSE_HEARTBEAT_LINE,
    add_sse_heartbeat,
    resolve_heartbeat_interval,
)


def test_resolve_heartbeat_interval():
    assert resolve_heartbeat_interval(None) is None
    assert resolve_heartbeat_interval(False) is None
    assert resolve_heartbeat_interval(0) is None
    assert resolve_heartbeat_interval(True) == DEFAULT_HEARTBEAT_INTERVAL
    assert resolve_heartbeat_interval(5) == 5.0
    assert resolve_heartbeat_interval(0.5) == 0.5
    for invalid in (-1, -0.5, float("inf"), float("nan")):
        with pytest.raises(ValueError):
            resolve_heartbeat_interval(invalid)


@pytest.mark.anyio
async def test_heartbeat_disabled_by_default():
    encoder = AssistantTransportEncoder()

    async def stream():
        yield TextDeltaChunk(text_delta="hello")
        await asyncio.sleep(0.15)
        yield TextDeltaChunk(text_delta="world")

    lines = [line async for line in encoder.encode_stream(stream())]

    assert all(not line.startswith(":") for line in lines)
    assert lines[-1] == "data: [DONE]\n\n"


@pytest.mark.anyio
async def test_heartbeat_emitted_when_idle():
    encoder = AssistantTransportEncoder(heartbeat=0.05)

    async def stream():
        yield TextDeltaChunk(text_delta="hello")
        await asyncio.sleep(0.18)
        yield TextDeltaChunk(text_delta="world")

    lines = [line async for line in encoder.encode_stream(stream())]

    heartbeats = [line for line in lines if line == SSE_HEARTBEAT_LINE]
    assert len(heartbeats) >= 2

    data_lines = [line for line in lines if line.startswith("data: ")]
    assert data_lines[-1] == "data: [DONE]\n\n"
    payloads = [json.loads(line[6:-2]) for line in data_lines[:-1]]
    assert [p["textDelta"] for p in payloads] == ["hello", "world"]


@pytest.mark.anyio
async def test_no_heartbeat_when_chunks_are_frequent():
    encoder = AssistantTransportEncoder(heartbeat=0.2)

    async def stream():
        for i in range(5):
            await asyncio.sleep(0.01)
            yield TextDeltaChunk(text_delta=str(i))

    lines = [line async for line in encoder.encode_stream(stream())]

    assert all(line.startswith("data: ") for line in lines)
    assert lines[-1] == "data: [DONE]\n\n"


@pytest.mark.anyio
async def test_real_chunk_resets_heartbeat_timer():
    encoder = AssistantTransportEncoder(heartbeat=0.1)

    async def stream():
        for i in range(3):
            await asyncio.sleep(0.07)
            yield TextDeltaChunk(text_delta=str(i))

    lines = [line async for line in encoder.encode_stream(stream())]

    assert SSE_HEARTBEAT_LINE not in lines


@pytest.mark.anyio
async def test_add_sse_heartbeat_cancels_pending_read_on_close():
    started = asyncio.Event()
    cancelled = asyncio.Event()

    async def stream():
        yield "data: 1\n\n"
        started.set()
        try:
            await asyncio.sleep(10)
        except asyncio.CancelledError:
            cancelled.set()
            raise

    gen = add_sse_heartbeat(stream(), 0.05)
    assert await gen.__anext__() == "data: 1\n\n"
    assert await gen.__anext__() == SSE_HEARTBEAT_LINE
    await gen.aclose()
    await asyncio.wait_for(cancelled.wait(), timeout=1)
