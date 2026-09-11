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
async def test_with_parent_id_sets_every_field_init_sets():
    captured: dict[str, RunController] = {}

    async def run_callback(controller: RunController):
        captured["derived"] = controller.with_parent_id("p1")
        captured["controller"] = controller

    [chunk async for chunk in create_run(run_callback)]

    assert vars(captured["derived"]).keys() == vars(captured["controller"]).keys()


@pytest.mark.anyio
async def test_with_parent_id_works_outside_a_running_loop():
    async def run_callback(controller: RunController):
        def derive_and_use() -> RunController:
            with pytest.raises(RuntimeError):
                asyncio.get_running_loop()
            derived = controller.with_parent_id("p2")
            derived.append_text("from off loop")
            return derived

        derived = await asyncio.to_thread(derive_and_use)
        assert derived._parent_id == "p2"
        assert derived._state_manager is controller._state_manager

    chunks = [chunk async for chunk in create_run(run_callback)]

    assert [(chunk.type, chunk.parent_id) for chunk in chunks] == [
        ("text-delta", "p2")
    ]
