import asyncio

import pytest
from starlette.requests import ClientDisconnect

from assistant_stream import create_run
from assistant_stream.serialization import (
    AssistantTransportResponse,
    DataStreamResponse,
    OpenAIStreamResponse,
)


RESPONSES = [DataStreamResponse, AssistantTransportResponse, OpenAIStreamResponse]


@pytest.mark.anyio
@pytest.mark.parametrize("response_type", RESPONSES)
@pytest.mark.parametrize("heartbeat", [False, True])
async def test_closing_response_body_cancels_and_awaits_run(response_type, heartbeat):
    finished = asyncio.Event()
    controllers = []

    async def callback(controller):
        controllers.append(controller)
        controller.append_text("hello")
        try:
            await controller.cancelled_event.wait()
        finally:
            finished.set()

    source = create_run(callback)
    response = response_type(source, heartbeat=heartbeat)
    try:
        await anext(response.body_iterator)
        await response.body_iterator.aclose()
        assert controllers[0].is_cancelled
        assert finished.is_set()
    finally:
        await response.body_iterator.aclose()
        await source.aclose()


@pytest.mark.anyio
@pytest.mark.parametrize("response_type", RESPONSES)
@pytest.mark.parametrize("heartbeat", [False, True])
@pytest.mark.parametrize("spec_version", ["2.3", "2.4"])
async def test_disconnect_during_send_cancels_and_awaits_run(
    response_type, heartbeat, spec_version
):
    sending = asyncio.Event()
    finished = asyncio.Event()
    controllers = []

    async def callback(controller):
        controllers.append(controller)
        controller.append_text("hello")
        try:
            await controller.cancelled_event.wait()
        finally:
            finished.set()

    async def send(message):
        if message["type"] == "http.response.body":
            sending.set()
            if spec_version == "2.4":
                raise BrokenPipeError("disconnected")
            await asyncio.Event().wait()

    async def receive():
        await sending.wait()
        return {"type": "http.disconnect"}

    source = create_run(callback)
    response = response_type(source, heartbeat=heartbeat)
    try:
        scope = {"type": "http", "asgi": {"spec_version": spec_version}}
        try:
            await asyncio.wait_for(response(scope, receive, send), 1)
        except (ClientDisconnect, BrokenPipeError):
            assert spec_version == "2.4"
        assert controllers[0].is_cancelled
        assert finished.is_set()
    finally:
        await response.body_iterator.aclose()
        await source.aclose()


@pytest.mark.anyio
@pytest.mark.parametrize("response_type", RESPONSES)
@pytest.mark.parametrize("heartbeat", [False, True])
async def test_disconnect_during_read_awaits_run_cleanup(response_type, heartbeat):
    reading = asyncio.Event()
    finished = asyncio.Event()
    controllers = []

    async def callback(controller):
        controllers.append(controller)
        try:
            await controller.cancelled_event.wait()
        finally:
            await asyncio.sleep(0)
            finished.set()

    source = create_run(callback)

    async def chunks():
        reading.set()
        async for chunk in source:
            yield chunk

    async def receive():
        await reading.wait()
        while not controllers:
            await asyncio.sleep(0)
        return {"type": "http.disconnect"}

    async def send(_message):
        pass

    stream = chunks()
    response = response_type(stream, heartbeat=heartbeat)
    try:
        scope = {"type": "http", "asgi": {"spec_version": "2.3"}}
        await asyncio.wait_for(response(scope, receive, send), 1)
        assert controllers[0].is_cancelled
        assert finished.is_set()
    finally:
        await response.body_iterator.aclose()
        await stream.aclose()
        await source.aclose()


@pytest.mark.anyio
@pytest.mark.parametrize("response_type", RESPONSES)
@pytest.mark.parametrize("heartbeat", [False, True])
async def test_completed_response_does_not_cancel_run(response_type, heartbeat):
    controllers = []

    async def callback(controller):
        controllers.append(controller)
        controller.append_text("hello")

    response = response_type(create_run(callback), heartbeat=heartbeat)
    assert [chunk async for chunk in response.body_iterator]
    assert not controllers[0].is_cancelled


@pytest.mark.anyio
async def test_encoder_failure_closes_run():
    from assistant_stream import AssistantStreamResponse
    from assistant_stream.serialization.data_stream import DataStreamEncoder

    finished = asyncio.Event()
    controllers = []

    async def callback(controller):
        controllers.append(controller)
        controller.append_text("hello")
        try:
            await controller.cancelled_event.wait()
        finally:
            finished.set()

    class FailingEncoder(DataStreamEncoder):
        def encode_chunk(self, chunk):
            raise ValueError("encoding failed")

    source = create_run(callback)
    response = AssistantStreamResponse(source, FailingEncoder())
    try:
        with pytest.raises(ValueError, match="encoding failed"):
            await anext(response.body_iterator)
        assert controllers[0].is_cancelled
        assert finished.is_set()
    finally:
        await source.aclose()
