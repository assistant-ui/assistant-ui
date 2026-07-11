from __future__ import annotations

import pytest
from starlette.responses import StreamingResponse

from assistant_stream.create_run import RunController
from assistant_stream.resumable import (
    RESUMABLE_STREAM_ID_HEADER,
    create_in_memory_resumable_stream_store,
    create_resumable_assistant_stream_response,
    create_resumable_stream_context,
    create_resume_assistant_stream_response,
)
from assistant_stream.serialization.assistant_transport import (
    AssistantTransportEncoder,
)


async def _collect_body(response: StreamingResponse) -> bytes:
    parts: list[bytes] = []
    async for chunk in response.body_iterator:
        if isinstance(chunk, str):
            parts.append(chunk.encode("utf-8"))
        else:
            parts.append(bytes(chunk))
    return b"".join(parts)


@pytest.mark.anyio
async def test_producer_response_carries_id_header_and_media_type() -> None:
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store()
    )

    async def callback(controller: RunController) -> None:
        controller.append_text("hello ")
        controller.append_text("world")

    response = await create_resumable_assistant_stream_response(
        context=ctx,
        stream_id="s1",
        callback=callback,
    )
    assert isinstance(response, StreamingResponse)
    assert response.headers[RESUMABLE_STREAM_ID_HEADER] == "s1"
    assert "text/plain" in response.media_type
    body = await _collect_body(response)
    assert b"hello " in body
    assert b"world" in body


@pytest.mark.anyio
async def test_resume_replays_byte_for_byte() -> None:
    store = create_in_memory_resumable_stream_store()
    ctx = create_resumable_stream_context(store=store)

    async def callback(controller: RunController) -> None:
        controller.append_text("alpha")
        tool = await controller.add_tool_call("echo", "t1")
        tool.append_args_text('{"v": 1}')
        tool.set_response({"ok": True})

    first = await create_resumable_assistant_stream_response(
        context=ctx,
        stream_id="s1",
        callback=callback,
    )
    first_bytes = await _collect_body(first)

    second = await create_resume_assistant_stream_response(
        context=ctx,
        stream_id="s1",
    )
    second_bytes = await _collect_body(second)

    assert second_bytes == first_bytes
    assert second.headers[RESUMABLE_STREAM_ID_HEADER] == "s1"


@pytest.mark.anyio
async def test_resume_returns_404_json_when_missing() -> None:
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store()
    )
    response = await create_resume_assistant_stream_response(
        context=ctx,
        stream_id="missing",
    )
    assert response.status_code == 404
    body = response.body
    assert b"stream not found" in body


@pytest.mark.anyio
async def test_assistant_transport_encoder_round_trips() -> None:
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store()
    )

    async def callback(controller: RunController) -> None:
        controller.append_text("hi")

    response = await create_resumable_assistant_stream_response(
        context=ctx,
        stream_id="s1",
        encoder=AssistantTransportEncoder(),
        callback=callback,
    )
    assert response.media_type == "text/event-stream"
    text = (await _collect_body(response)).decode("utf-8")
    assert "text-delta" in text
    assert "[DONE]" in text

    resume = await create_resume_assistant_stream_response(
        context=ctx,
        stream_id="s1",
        encoder=AssistantTransportEncoder(),
    )
    resume_text = (await _collect_body(resume)).decode("utf-8")
    assert resume_text == text


@pytest.mark.anyio
async def test_user_headers_merge_but_cannot_override_id() -> None:
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store()
    )

    async def callback(controller: RunController) -> None:
        controller.append_text("hi")

    response = await create_resumable_assistant_stream_response(
        context=ctx,
        stream_id="s1",
        headers={
            "Cache-Control": "private, max-age=0",
            RESUMABLE_STREAM_ID_HEADER: "spoofed",
        },
        callback=callback,
    )
    assert response.headers["cache-control"] == "private, max-age=0"
    assert response.headers[RESUMABLE_STREAM_ID_HEADER] == "s1"
    await response.body_iterator.aclose()


@pytest.mark.anyio
async def test_differently_cased_user_id_header_is_filtered() -> None:
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store()
    )

    async def callback(controller: RunController) -> None:
        controller.append_text("hi")

    response = await create_resumable_assistant_stream_response(
        context=ctx,
        stream_id="s1",
        headers={"X-RESUMABLE-STREAM-ID": "spoof"},
        callback=callback,
    )
    assert response.headers[RESUMABLE_STREAM_ID_HEADER] == "s1"
    assert "spoof" not in response.headers.values()
    await response.body_iterator.aclose()
