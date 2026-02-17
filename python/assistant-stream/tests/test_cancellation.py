import asyncio

import pytest

from assistant_stream import RunController, create_run


@pytest.mark.asyncio
async def test_controller_exposes_cancel_signal():
    observed: dict[str, object] = {}

    async def run_callback(controller: RunController):
        observed["cancelled_event"] = controller.cancelled_event
        observed["initial_is_cancelled"] = controller.is_cancelled
        controller.append_text("hello")

    chunks = [chunk async for chunk in create_run(run_callback)]

    assert len(chunks) == 1
    assert chunks[0].type == "text-delta"
    assert isinstance(observed["cancelled_event"], asyncio.Event)
    assert observed["initial_is_cancelled"] is False


@pytest.mark.asyncio
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


@pytest.mark.asyncio
async def test_early_stream_close_stops_background_task():
    callback_done = asyncio.Event()

    async def run_callback(controller: RunController):
        controller.append_text("start")
        for _ in range(100):
            if controller.is_cancelled:
                break
            await asyncio.sleep(0.01)
        callback_done.set()

    stream = create_run(run_callback)
    first_chunk = await anext(stream)
    assert first_chunk.type == "text-delta"

    await stream.aclose()

    finished_quickly = True
    try:
        await asyncio.wait_for(callback_done.wait(), timeout=0.2)
    except TimeoutError:
        finished_quickly = False

    await asyncio.wait_for(callback_done.wait(), timeout=2)
    assert finished_quickly is True


@pytest.mark.asyncio
async def test_normal_completion_does_not_set_cancel_signal():
    observed: dict[str, object] = {}

    async def run_callback(controller: RunController):
        controller.append_text("done")
        observed["is_cancelled_on_complete"] = controller.is_cancelled

    chunks = [chunk async for chunk in create_run(run_callback)]

    assert len(chunks) == 1
    assert chunks[0].type == "text-delta"
    assert observed["is_cancelled_on_complete"] is False
