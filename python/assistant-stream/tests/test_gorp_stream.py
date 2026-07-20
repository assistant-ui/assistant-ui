import asyncio
from typing import Any

import pytest

from assistant_stream.gorp import Flusher, Gorp
from assistant_stream.serialization.gorp_stream import (
    ASSISTANT_STREAM_FORMAT_HEADER,
    GORP_STREAM_FORMAT,
    GorpStreamEncoder,
    GorpStreamResponse,
)
from assistant_stream.serialization.heartbeat import SSE_HEARTBEAT_LINE


async def _batches(items: list[list[dict[str, Any]]]):
    for item in items:
        yield item


async def _encode(encoder: GorpStreamEncoder, items: list[list[dict[str, Any]]]):
    return [frame async for frame in encoder.encode_stream(_batches(items))]


@pytest.mark.anyio
async def test_encoder_emits_one_sse_frame_per_batch():
    frames = await _encode(
        GorpStreamEncoder(),
        [
            [{"type": "set", "path": ["count"], "value": 1}],
            [{"type": "append-text", "path": ["text"], "value": "hi"}],
        ],
    )

    assert frames == [
        'data: [{"type":"set","path":["count"],"value":1}]\n\n',
        'data: [{"type":"append-text","path":["text"],"value":"hi"}]\n\n',
    ]


@pytest.mark.anyio
async def test_encoder_rejects_non_finite_floats():
    with pytest.raises(ValueError):
        await _encode(
            GorpStreamEncoder(),
            [[{"type": "set", "path": ["x"], "value": float("nan")}]],
        )


@pytest.mark.anyio
async def test_encoder_prepends_snapshot_to_first_frame_only():
    frames = await _encode(
        GorpStreamEncoder({"count": 0}),
        [
            [{"type": "set", "path": ["count"], "value": 1}],
            [{"type": "set", "path": ["count"], "value": 2}],
        ],
    )

    assert frames == [
        (
            'data: [{"type":"set","path":[],"value":{"count":0}},'
            + '{"type":"set","path":["count"],"value":1}]\n\n'
        ),
        'data: [{"type":"set","path":["count"],"value":2}]\n\n',
    ]


@pytest.mark.anyio
async def test_encoder_skips_empty_snapshot():
    for snapshot in (None, {}, [], ""):
        frames = await _encode(
            GorpStreamEncoder(snapshot),
            [[{"type": "set", "path": ["a"], "value": 1}]],
        )
        assert frames == ['data: [{"type":"set","path":["a"],"value":1}]\n\n']


@pytest.mark.anyio
async def test_encoder_does_not_escape_non_ascii():
    frames = await _encode(
        GorpStreamEncoder(),
        [[{"type": "append-text", "path": ["text"], "value": "héllo"}]],
    )
    assert frames == [
        'data: [{"type":"append-text","path":["text"],"value":"héllo"}]\n\n'
    ]


@pytest.mark.anyio
async def test_gorp_draft_batches_encode_end_to_end():
    initial = {"messages": []}
    gorp = Gorp(initial)
    batches: list[list[dict[str, Any]]] = []
    flusher = Flusher(batches.append)
    draft = gorp.draft(flusher.add)

    draft["messages"].append("hi")
    draft["messages"][0] = "hi!"
    flusher.flush()

    frames = await _encode(GorpStreamEncoder({"messages": []}), batches)

    assert frames == [
        'data: [{"type":"set","path":[],"value":{"messages":[]}},'
        '{"type":"set","path":["messages","0"],"value":"hi"},'
        '{"type":"append-text","path":["messages","0"],"value":"!"}]\n\n'
    ]
    assert gorp.state == {"messages": ["hi!"]}


@pytest.mark.anyio
async def test_response_headers_match_ts_decoder_expectations():
    response = GorpStreamResponse(_batches([]))

    media_type = response.headers["content-type"].split(";", 1)[0].strip().lower()
    assert media_type == "text/event-stream"
    assert response.headers[ASSISTANT_STREAM_FORMAT_HEADER] == "object-stream/v0"
    assert GORP_STREAM_FORMAT == "object-stream/v0"
    assert response.headers["cache-control"] == "no-cache"


@pytest.mark.anyio
async def test_response_streams_frames_with_snapshot():
    response = GorpStreamResponse(
        _batches([[{"type": "set", "path": ["count"], "value": 1}]]),
        snapshot={"count": 0},
        heartbeat=False,
    )
    lines = [line async for line in response.body_iterator]

    assert lines == [
        'data: [{"type":"set","path":[],"value":{"count":0}},'
        '{"type":"set","path":["count"],"value":1}]\n\n'
    ]


@pytest.mark.anyio
async def test_response_emits_heartbeat_when_idle():
    async def batches():
        yield [{"type": "set", "path": ["a"], "value": 1}]
        await asyncio.sleep(0.2)
        yield [{"type": "set", "path": ["b"], "value": 2}]

    response = GorpStreamResponse(batches(), heartbeat=0.05)
    lines = [line async for line in response.body_iterator]

    assert SSE_HEARTBEAT_LINE in lines
    data_lines = [line for line in lines if line.startswith("data: ")]
    assert len(data_lines) == 2
