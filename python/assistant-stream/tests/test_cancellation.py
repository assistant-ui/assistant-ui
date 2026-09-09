import asyncio

import pytest

from assistant_stream import RunController, create_run


@pytest.mark.anyio
async def test_controller_exposes_cancel_signal():
    observed: dict[str, object] = {}

    async def run_callback(controller: RunController):
        observed["cancel_signal"] = controller.cancelled_event
        observed["initial_is_cancelled"] = controller.is_cancelled
        controller.append_text("hello")

    chunks = [chunk async for chunk in create_run(run_callback)]

    assert len(chunks) == 1
    assert chunks[0].type == "text-delta"
    cancel_signal = observed["cancel_signal"]
    assert callable(getattr(cancel_signal, "wait", None))
    assert callable(getattr(cancel_signal, "is_set", None))
    assert getattr(cancel_signal, "set", None) is None
    assert observed["initial_is_cancelled"] is False


@pytest.mark.anyio
async def test_early_stream_close_sets_cancel_signal():
    callback_done = asyncio.Event()
    observed: dict[str, object] = {}

    async def run_callback(controller: RunController):
        controller.append_text("start")
        for _ in range(100):
            if controller.is_cancelled:
                break
            await asyncio.sleep(0.01)

        observed["is_cancelled_after_close"] = controller.is_cancelled
        callback_done.set()

    stream = create_run(run_callback)
    first_chunk = await anext(stream)
    assert first_chunk.type == "text-delta"

    await stream.aclose()
    await asyncio.wait_for(callback_done.wait(), timeout=2)

    assert observed["is_cancelled_after_close"] is True


@pytest.mark.anyio
async def test_early_stream_close_stops_background_task():
    callback_done = asyncio.Event()

    async def run_callback(controller: RunController):
        controller.append_text("start")
        try:
            for _ in range(100):
                if controller.is_cancelled:
                    break
                await asyncio.sleep(0.01)
        finally:
            callback_done.set()

    stream = create_run(run_callback)
    first_chunk = await anext(stream)
    assert first_chunk.type == "text-delta"

    await stream.aclose()
    await asyncio.wait_for(callback_done.wait(), timeout=0.2)


@pytest.mark.anyio
async def test_normal_completion_does_not_set_cancel_signal():
    observed: dict[str, object] = {}

    async def run_callback(controller: RunController):
        controller.append_text("done")
        observed["is_cancelled_on_complete"] = controller.is_cancelled

    chunks = [chunk async for chunk in create_run(run_callback)]

    assert len(chunks) == 1
    assert chunks[0].type == "text-delta"
    assert observed["is_cancelled_on_complete"] is False


@pytest.mark.anyio
async def test_normal_completion_surfaces_callback_exception():
    chunk_types: list[str] = []

    async def run_callback(controller: RunController):
        controller.append_text("start")
        raise RuntimeError("boom")

    with pytest.raises(RuntimeError, match="boom"):
        async for chunk in create_run(run_callback):
            chunk_types.append(chunk.type)

    assert chunk_types == ["text-delta", "error"]


@pytest.mark.anyio
async def test_substream_failure_cancels_and_awaits_sibling_streams():
    sibling_started = asyncio.Event()
    sibling_cancelled = asyncio.Event()
    sibling_finished = asyncio.Event()

    async def blocking_stream():
        sibling_started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            sibling_cancelled.set()
            raise
        finally:
            sibling_finished.set()
        yield

    async def failing_stream():
        await sibling_started.wait()
        raise RuntimeError("substream failed")
        yield

    async def run_callback(controller: RunController):
        controller.add_stream(blocking_stream())
        controller.add_stream(failing_stream())

    async def consume():
        with pytest.raises(RuntimeError, match="substream failed"):
            async for _ in create_run(run_callback):
                pass

    await asyncio.wait_for(consume(), timeout=1)

    assert sibling_cancelled.is_set()
    assert sibling_finished.is_set()


@pytest.mark.anyio
async def test_closes_tool_streams_registered_by_substreams():
    async def parent_stream(controller: RunController):
        await controller.add_tool_call("lookup", "tool-1")
        if False:
            yield

    async def run_callback(controller: RunController):
        controller.add_stream(parent_stream(controller))

    async def consume():
        return [chunk async for chunk in create_run(run_callback)]

    chunks = await asyncio.wait_for(consume(), timeout=1)

    assert [chunk.type for chunk in chunks] == [
        "tool-call-begin",
        "tool-call-args-text-finish",
    ]


@pytest.mark.anyio
@pytest.mark.parametrize("with_result", [False, True])
async def test_callback_failure_drains_tool_streams(with_result: bool):
    async def run_callback(controller: RunController):
        tool_call = await controller.add_tool_call("lookup", "tool-1")
        if with_result:
            tool_call.set_response("found")
        raise RuntimeError("boom")

    chunks = []
    with pytest.raises(RuntimeError, match="boom"):
        async for chunk in create_run(run_callback):
            chunks.append(chunk)

    chunk_types = [chunk.type for chunk in chunks]
    assert chunk_types[-1] == "tool-call-args-text-finish"
    if with_result:
        tool_result = next(chunk for chunk in chunks if chunk.type == "tool-result")
        assert tool_result.result == "found"


@pytest.mark.anyio
async def test_early_stream_close_forces_background_task_cancellation():
    callback_cancelled = asyncio.Event()
    callback_finished = asyncio.Event()

    async def run_callback(controller: RunController):
        controller.append_text("start")
        try:
            # Intentionally ignore `is_cancelled` to exercise forced cancellation.
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            callback_cancelled.set()
            raise
        finally:
            callback_finished.set()

    stream = create_run(run_callback)
    first_chunk = await anext(stream)
    assert first_chunk.type == "text-delta"

    await stream.aclose()
    await asyncio.wait_for(callback_cancelled.wait(), timeout=2)
    await asyncio.wait_for(callback_finished.wait(), timeout=2)


@pytest.mark.anyio
async def test_early_stream_close_cancels_and_awaits_substreams():
    substream_started = asyncio.Event()
    substream_cancelled = asyncio.Event()
    substream_finished = asyncio.Event()

    async def blocking_stream():
        substream_started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            substream_cancelled.set()
            raise
        finally:
            substream_finished.set()
        yield

    async def run_callback(controller: RunController):
        controller.add_stream(blocking_stream())
        controller.append_text("start")
        await substream_started.wait()
        await asyncio.Event().wait()

    stream = create_run(run_callback)
    first_chunk = await anext(stream)
    assert first_chunk.type == "text-delta"

    await asyncio.wait_for(stream.aclose(), timeout=1)

    assert substream_cancelled.is_set()
    assert substream_finished.is_set()


@pytest.mark.anyio
async def test_early_close_during_callback_failure_finishes_reader_cleanup():
    parent_started = asyncio.Event()
    cleanup_started = asyncio.Event()
    release_cleanup = asyncio.Event()
    nested_started = asyncio.Event()
    nested_cancelled = asyncio.Event()
    nested_finished = asyncio.Event()

    async def nested_stream():
        nested_started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            nested_cancelled.set()
            raise
        finally:
            nested_finished.set()
        yield

    async def parent_stream(controller: RunController):
        parent_started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            controller.add_stream(nested_stream())
            await nested_started.wait()
            cleanup_started.set()
            await release_cleanup.wait()
            raise
        yield

    async def run_callback(controller: RunController):
        controller.add_stream(parent_stream(controller))
        controller.append_text("start")
        await parent_started.wait()
        raise RuntimeError("boom")

    stream = create_run(run_callback)
    first_chunk = await anext(stream)
    assert first_chunk.type == "text-delta"
    await cleanup_started.wait()

    close_task = asyncio.create_task(stream.aclose())
    try:
        await asyncio.sleep(0.1)
        assert not close_task.done()
        assert not nested_cancelled.is_set()
    finally:
        release_cleanup.set()
        await asyncio.wait_for(close_task, timeout=1)

    assert nested_cancelled.is_set()
    assert nested_finished.is_set()


@pytest.mark.anyio
@pytest.mark.parametrize("cancel_delay", [0.01, 0.1])
async def test_cancelled_close_retrieves_late_callback_failure(
    caplog, cancel_delay
):
    reader_started = asyncio.Event()
    cleanup_started = asyncio.Event()
    release_cleanup = asyncio.Event()
    reader_finished = asyncio.Event()

    async def blocking_stream():
        reader_started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cleanup_started.set()
            await release_cleanup.wait()
            raise
        finally:
            reader_finished.set()
        yield

    async def run_callback(controller: RunController):
        controller.add_stream(blocking_stream())
        controller.append_text("start")
        await reader_started.wait()
        raise RuntimeError("boom")

    stream = create_run(run_callback)
    first_chunk = await anext(stream)
    assert first_chunk.type == "text-delta"
    await asyncio.wait_for(cleanup_started.wait(), timeout=1)

    close_task = asyncio.create_task(stream.aclose())
    try:
        await asyncio.sleep(cancel_delay)
        close_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await asyncio.wait_for(close_task, timeout=1)
    finally:
        release_cleanup.set()

    await asyncio.wait_for(reader_finished.wait(), timeout=1)
    for _ in range(20):
        if "interrupted early-close cleanup" in caplog.text:
            break
        await asyncio.sleep(0.01)

    assert "interrupted early-close cleanup" in caplog.text


@pytest.mark.anyio
async def test_early_stream_close_does_not_raise_callback_exception():
    async def run_callback(controller: RunController):
        controller.append_text("start")
        await asyncio.sleep(0.01)
        raise RuntimeError("boom")

    stream = create_run(run_callback)
    first_chunk = await anext(stream)
    assert first_chunk.type == "text-delta"

    await stream.aclose()


@pytest.mark.anyio
async def test_early_stream_close_does_not_swallow_close_task_cancellation():
    callback_cancelled = asyncio.Event()
    callback_finished = asyncio.Event()
    loop = asyncio.get_running_loop()

    async def run_callback(controller: RunController):
        controller.append_text("start")
        deadline = loop.time() + 0.5
        try:
            while loop.time() < deadline:
                try:
                    await asyncio.sleep(0.01)
                except asyncio.CancelledError:
                    callback_cancelled.set()
                    # Simulate non-cooperative callback behavior: ignore cancellation.
                    continue
        finally:
            callback_finished.set()

    stream = create_run(run_callback)
    first_chunk = await anext(stream)
    assert first_chunk.type == "text-delta"

    close_task = asyncio.create_task(stream.aclose())
    await asyncio.sleep(0)
    close_task.cancel()

    try:
        done, _ = await asyncio.wait({close_task}, timeout=0.2)
        assert close_task in done
        assert close_task.cancelled()
    finally:
        await asyncio.wait_for(callback_finished.wait(), timeout=2)
        assert callback_cancelled.is_set()
        if not close_task.done():
            await asyncio.wait({close_task}, timeout=1)
