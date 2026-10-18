import asyncio
import importlib

import anyio
import pytest
from starlette.requests import ClientDisconnect

from assistant_stream import create_run
from assistant_stream.serialization import (
    AssistantTransportResponse,
    DataStreamResponse,
    OpenAIStreamResponse,
)


RESPONSES = [DataStreamResponse, AssistantTransportResponse, OpenAIStreamResponse]


@pytest.fixture
def short_cleanup_grace(monkeypatch):
    from assistant_stream.serialization import heartbeat as heartbeat_module

    create_run_module = importlib.import_module("assistant_stream.create_run")
    monkeypatch.setattr(create_run_module, "_EARLY_CLOSE_GRACE_SECONDS", 0.01, raising=False)
    monkeypatch.setattr(heartbeat_module, "_EARLY_CLOSE_GRACE_SECONDS", 0.01, raising=False)


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


@pytest.mark.anyio
@pytest.mark.parametrize("response_type", RESPONSES)
@pytest.mark.parametrize("heartbeat", [False, True])
async def test_response_accepts_source_without_aclose(response_type, heartbeat):
    from assistant_stream.assistant_stream_chunk import TextDeltaChunk

    class Chunks:
        def __init__(self):
            self.chunks = iter([TextDeltaChunk(text_delta="hello")])

        def __aiter__(self):
            return self

        async def __anext__(self):
            try:
                return next(self.chunks)
            except StopIteration:
                raise StopAsyncIteration

    response = response_type(Chunks(), heartbeat=heartbeat)
    chunks = [chunk async for chunk in response.body_iterator]
    assert any("hello" in chunk for chunk in chunks)


@pytest.mark.anyio
@pytest.mark.parametrize("early_close", [False, True])
async def test_response_accepts_encoder_iterator_without_aclose(early_close):
    from assistant_stream import AssistantStreamResponse
    from assistant_stream.serialization.stream_encoder import StreamEncoder

    finished = asyncio.Event()
    controllers = []

    async def callback(controller):
        controllers.append(controller)
        try:
            controller.append_text("hello")
            if early_close:
                await controller.cancelled_event.wait()
        finally:
            finished.set()

    class PlainEncoder(StreamEncoder):
        def get_media_type(self):
            return "text/plain"

        def encode_stream(self, stream):
            class Encoded:
                def __aiter__(self):
                    return self

                async def __anext__(self):
                    chunk = await anext(stream)
                    return chunk.text_delta

            return Encoded()

    source = create_run(callback)
    response = AssistantStreamResponse(source, PlainEncoder())
    try:
        if early_close:
            assert await anext(response.body_iterator) == "hello"
            await response.body_iterator.aclose()
        else:
            assert [chunk async for chunk in response.body_iterator] == ["hello"]
        assert controllers[0].is_cancelled is early_close
        assert finished.is_set()
    finally:
        await source.aclose()


@pytest.mark.anyio
@pytest.mark.parametrize("heartbeat", [False, True])
async def test_send_failure_cancels_run_and_waits_for_callback_cleanup(
    heartbeat, short_cleanup_grace
):
    cancelled = asyncio.Event()
    release = asyncio.Event()
    finished = asyncio.Event()
    controllers = []

    async def callback(controller):
        controllers.append(controller)
        controller.append_text("hello")
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            await release.wait()
        finally:
            finished.set()

    async def send(message):
        if message["type"] == "http.response.body":
            raise BrokenPipeError("disconnected")

    async def receive():
        await asyncio.Event().wait()

    response = AssistantTransportResponse(create_run(callback), heartbeat=heartbeat)
    scope = {"type": "http", "asgi": {"spec_version": "2.4"}}
    request = asyncio.create_task(response(scope, receive, send))
    try:
        await asyncio.wait_for(cancelled.wait(), 1)
        assert controllers[0].is_cancelled
        done, _ = await asyncio.wait({request}, timeout=0.2)
        assert not done
        assert not finished.is_set()
        release.set()
        with pytest.raises(ClientDisconnect):
            await asyncio.wait_for(request, 1)
        assert finished.is_set()
    finally:
        release.set()
        await asyncio.wait_for(asyncio.gather(request, return_exceptions=True), 1)
        await asyncio.wait_for(finished.wait(), 1)


@pytest.mark.anyio
async def test_plain_close_waits_for_callback_cleanup_after_grace(short_cleanup_grace):
    cancelled = asyncio.Event()
    release = asyncio.Event()
    finished = asyncio.Event()

    async def callback(controller):
        controller.append_text("hello")
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            await release.wait()
        finally:
            finished.set()

    source = create_run(callback)
    await anext(source)
    closing = asyncio.create_task(source.aclose())
    try:
        await asyncio.wait_for(cancelled.wait(), 1)
        done, _ = await asyncio.wait({closing}, timeout=0.2)
        assert not done
        assert not finished.is_set()
        release.set()
        await asyncio.wait_for(closing, 1)
        assert finished.is_set()
    finally:
        release.set()
        await asyncio.wait_for(asyncio.gather(closing, return_exceptions=True), 1)


@pytest.mark.anyio
@pytest.mark.parametrize("heartbeat", [False, True])
async def test_disconnect_during_send_detaches_and_logs_callback_cleanup_failure(
    heartbeat, short_cleanup_grace, caplog
):
    sending = asyncio.Event()
    cancelled = asyncio.Event()
    release = asyncio.Event()
    controllers = []
    callback_tasks = []

    async def callback(controller):
        controllers.append(controller)
        callback_tasks.append(asyncio.current_task())
        controller.append_text("hello")
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            await release.wait()
            raise RuntimeError("late cleanup failure")

    async def send(message):
        if message["type"] == "http.response.body":
            sending.set()
            await asyncio.Event().wait()

    async def receive():
        await sending.wait()
        return {"type": "http.disconnect"}

    response = AssistantTransportResponse(create_run(callback), heartbeat=heartbeat)
    scope = {"type": "http", "asgi": {"spec_version": "2.3"}}
    request = asyncio.create_task(response(scope, receive, send))
    try:
        await asyncio.wait_for(cancelled.wait(), 1)
        done, _ = await asyncio.wait({request}, timeout=0.2)
        assert done
        await request
        assert controllers[0].is_cancelled
        assert not callback_tasks[0].done()
        release.set()
        done, _ = await asyncio.wait(callback_tasks, timeout=1)
        assert done
        records = [
            record for record in caplog.records
            if record.name == "assistant_stream.create_run"
        ]
        assert len(records) == 1
        assert records[0].getMessage() == (
            "Suppressed callback exception after interrupted early-close cleanup"
        )
        assert str(records[0].exc_info[1]) == "late cleanup failure"
    finally:
        release.set()
        await asyncio.wait_for(asyncio.gather(request, return_exceptions=True), 1)
        await asyncio.wait_for(asyncio.gather(*callback_tasks, return_exceptions=True), 1)


@pytest.mark.anyio
async def test_closing_pending_heartbeat_read_waits_for_callback_cleanup(
    short_cleanup_grace,
):
    from assistant_stream.serialization.heartbeat import SSE_HEARTBEAT_LINE

    cancelled = asyncio.Event()
    release = asyncio.Event()
    finished = asyncio.Event()

    async def callback(controller):
        controller.append_text("hello")
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            await release.wait()
        finally:
            finished.set()

    source = create_run(callback)
    response = AssistantTransportResponse(source, heartbeat=0.001)

    async def read_heartbeat():
        while await anext(response.body_iterator) != SSE_HEARTBEAT_LINE:
            pass

    await asyncio.wait_for(read_heartbeat(), 1)
    closing = asyncio.create_task(response.body_iterator.aclose())
    try:
        await asyncio.wait_for(cancelled.wait(), 1)
        done, _ = await asyncio.wait({closing}, timeout=0.2)
        assert not done
        assert not finished.is_set()
        release.set()
        await asyncio.wait_for(closing, 1)
        assert finished.is_set()
        assert source.ag_frame is None
    finally:
        release.set()
        await asyncio.wait_for(asyncio.gather(closing, return_exceptions=True), 1)
        await source.aclose()


@pytest.mark.anyio
@pytest.mark.parametrize("heartbeat", [False, True])
async def test_cancelled_encoder_close_still_closes_source(heartbeat):
    from assistant_stream import AssistantStreamResponse
    from assistant_stream.serialization.assistant_transport import AssistantTransportEncoder

    encoder_closing = asyncio.Event()
    finished = asyncio.Event()
    controllers = []
    bodies = []

    async def callback(controller):
        controllers.append(controller)
        controller.append_text("hello")
        try:
            await controller.cancelled_event.wait()
        finally:
            finished.set()

    class Encoder(AssistantTransportEncoder):
        def encode_stream(self, stream):
            async def encode():
                try:
                    async for chunk in stream:
                        yield chunk.text_delta
                finally:
                    encoder_closing.set()
                    await anyio.sleep(0)

            body = encode()
            bodies.append(body)
            return body

    source = create_run(callback)
    response = AssistantStreamResponse(source, Encoder(), heartbeat=heartbeat)
    try:
        await anext(response.body_iterator)
        with anyio.CancelScope() as scope:
            scope.cancel()
            await response.body_iterator.aclose()
        assert encoder_closing.is_set()
        assert bodies[0].ag_frame is None
        assert source.ag_frame is None
        assert controllers[0].is_cancelled
        assert finished.is_set()
    finally:
        await response.body_iterator.aclose()
        await source.aclose()


@pytest.mark.anyio
@pytest.mark.parametrize("heartbeat", [False, True])
async def test_outer_cancellation_exits_during_stubborn_callback_cleanup(
    heartbeat, short_cleanup_grace
):
    cancelled = asyncio.Event()
    release = asyncio.Event()
    finished = asyncio.Event()
    scope_ready = asyncio.Event()
    scopes = []

    async def callback(controller):
        controller.append_text("hello")
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            await release.wait()
        finally:
            finished.set()

    response = AssistantTransportResponse(create_run(callback), heartbeat=heartbeat)
    await anext(response.body_iterator)

    async def close_body():
        with anyio.CancelScope() as scope:
            scopes.append(scope)
            scope_ready.set()
            await response.body_iterator.aclose()

    closing = asyncio.create_task(close_body())
    try:
        await scope_ready.wait()
        await asyncio.wait_for(cancelled.wait(), 1)
        scopes[0].cancel()
        done, _ = await asyncio.wait({closing}, timeout=0.2)
        assert done
        await closing
        assert not finished.is_set()
    finally:
        release.set()
        await asyncio.wait_for(asyncio.gather(closing, return_exceptions=True), 1)
        await asyncio.wait_for(finished.wait(), 1)


@pytest.mark.anyio
async def test_disconnect_during_pending_heartbeat_read_has_bounded_cleanup(
    short_cleanup_grace,
):
    reading = asyncio.Event()
    cancelled = asyncio.Event()
    release = asyncio.Event()
    finished = asyncio.Event()

    async def callback(controller):
        controller.append_text("hello")
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            await release.wait()
        finally:
            finished.set()

    source = create_run(callback)

    async def chunks():
        yield await anext(source)
        reading.set()
        async for chunk in source:
            yield chunk

    async def receive():
        await reading.wait()
        await asyncio.sleep(0)
        return {"type": "http.disconnect"}

    async def send(_message):
        pass

    response = AssistantTransportResponse(chunks(), heartbeat=True)
    scope = {"type": "http", "asgi": {"spec_version": "2.3"}}
    request = asyncio.create_task(response(scope, receive, send))
    try:
        await asyncio.wait_for(cancelled.wait(), 1)
        done, _ = await asyncio.wait({request}, timeout=0.2)
        assert done
        assert request.exception() is None
        assert not finished.is_set()
    finally:
        release.set()
        await asyncio.wait_for(asyncio.gather(request, return_exceptions=True), 1)
        await asyncio.wait_for(finished.wait(), 1)
