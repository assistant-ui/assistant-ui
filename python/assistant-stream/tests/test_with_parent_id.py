import asyncio

import pytest

from assistant_stream import RunController, create_run


@pytest.mark.anyio
async def test_with_parent_id_shares_everything_but_the_parent_id():
    observed: dict[str, object] = {}

    async def run_callback(controller: RunController):
        derived = controller.with_parent_id("p1")
        observed["state_manager_shared"] = (
            derived._state_manager is controller._state_manager
        )
        observed["queue_shared"] = derived._queue is controller._queue
        observed["cancel_shared"] = (
            derived._cancelled_event is controller._cancelled_event
            and derived.cancelled_event is controller.cancelled_event
        )
        observed["dispose_shared"] = (
            derived._dispose_callbacks is controller._dispose_callbacks
        )
        observed["tasks_shared"] = derived._stream_tasks is controller._stream_tasks
        derived.append_text("nested")

    chunks = [chunk async for chunk in create_run(run_callback)]

    assert observed == {
        "state_manager_shared": True,
        "queue_shared": True,
        "cancel_shared": True,
        "dispose_shared": True,
        "tasks_shared": True,
    }
    assert len(chunks) == 1
    assert chunks[0].type == "text-delta"
    assert chunks[0].parent_id == "p1"


@pytest.mark.anyio
async def test_with_parent_id_works_outside_a_running_loop():
    captured: dict[str, RunController] = {}

    async def run_callback(controller: RunController):
        captured["controller"] = controller
        controller.append_text("hello")

    [chunk async for chunk in create_run(run_callback)]

    def derive() -> RunController:
        with pytest.raises(RuntimeError):
            asyncio.get_running_loop()
        return captured["controller"].with_parent_id("p2")

    derived = await asyncio.to_thread(derive)
    assert derived._parent_id == "p2"
    assert derived._state_manager is captured["controller"]._state_manager
