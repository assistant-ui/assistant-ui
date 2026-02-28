from typing import Any

import pytest

from assistant_stream import RunController, create_run
from assistant_stream.state_manager import StateManager


@pytest.mark.anyio
async def test_append_text_helper_emits_append_text_op() -> None:
    ops: list[dict[str, Any]] = []
    manager = StateManager(
        lambda chunk: ops.extend(chunk.operations),
        {"messages": [{"text": ""}]},
    )

    manager.append_text(["messages", "0", "text"], "hi")
    manager.flush()

    assert ops == [{"type": "append-text", "path": ["messages", "0", "text"], "value": "hi"}]


@pytest.mark.anyio
async def test_nested_plus_equals_on_string_emits_append_text() -> None:
    ops: list[dict[str, Any]] = []
    manager = StateManager(
        lambda chunk: ops.extend(chunk.operations),
        {"messages": [{"text": "h"}]},
    )

    manager.state["messages"][0]["text"] += "i"
    manager.flush()

    assert ops == [
        {"type": "append-text", "path": ["messages", "0", "text"], "value": "i"}
    ]


@pytest.mark.anyio
async def test_nested_plus_equals_multiple_operations_accumulate() -> None:
    ops: list[dict[str, Any]] = []
    manager = StateManager(
        lambda chunk: ops.extend(chunk.operations),
        {"messages": [{"text": ""}]},
    )

    manager.state["messages"][0]["text"] += "Hel"
    manager.state["messages"][0]["text"] += "lo"
    manager.flush()

    assert ops == [
        {"type": "set", "path": ["messages", "0", "text"], "value": "Hel"},
        {"type": "append-text", "path": ["messages", "0", "text"], "value": "lo"},
    ]
    assert manager.state_data["messages"][0]["text"] == "Hello"


@pytest.mark.anyio
async def test_streaming_path_emits_append_text_deltas_not_set() -> None:
    async def run_callback(controller: RunController):
        controller.append_state_text(["messages", 0, "text"], "Hel")
        controller.append_state_text(["messages", 0, "text"], "lo")

    chunks = [
        chunk
        async for chunk in create_run(
            run_callback, state={"messages": [{"text": ""}]}
        )
    ]
    operations = [
        operation
        for chunk in chunks
        if chunk.type == "update-state"
        for operation in chunk.operations
    ]

    assert operations == [
        {"type": "append-text", "path": ["messages", "0", "text"], "value": "Hel"},
        {"type": "append-text", "path": ["messages", "0", "text"], "value": "lo"},
    ]


@pytest.mark.anyio
async def test_string_assignment_non_extension_emits_set() -> None:
    ops: list[dict[str, Any]] = []
    manager = StateManager(
        lambda chunk: ops.extend(chunk.operations),
        {"messages": [{"text": "hello"}]},
    )

    manager.state["messages"][0]["text"] = "goodbye"
    manager.flush()

    assert ops == [{"type": "set", "path": ["messages", "0", "text"], "value": "goodbye"}]


@pytest.mark.anyio
async def test_string_assignment_non_string_override_emits_set() -> None:
    ops: list[dict[str, Any]] = []
    manager = StateManager(
        lambda chunk: ops.extend(chunk.operations),
        {"messages": [{"text": "hello"}]},
    )

    manager.state["messages"][0]["text"] = 42
    manager.flush()

    assert ops == [{"type": "set", "path": ["messages", "0", "text"], "value": 42}]


@pytest.mark.anyio
async def test_string_assignment_unchanged_value_emits_set() -> None:
    ops: list[dict[str, Any]] = []
    manager = StateManager(
        lambda chunk: ops.extend(chunk.operations),
        {"messages": [{"text": "hello"}]},
    )

    manager.state["messages"][0]["text"] = "hello"
    manager.flush()

    assert ops == [{"type": "set", "path": ["messages", "0", "text"], "value": "hello"}]


@pytest.mark.anyio
async def test_empty_string_initial_write_emits_set() -> None:
    """First write to a field initialized to "" should emit set, not append-text."""
    ops: list[dict[str, Any]] = []
    manager = StateManager(
        lambda chunk: ops.extend(chunk.operations),
        {"messages": [{"text": ""}]},
    )

    manager.state["messages"][0]["text"] = "Hello"
    manager.flush()

    assert ops == [{"type": "set", "path": ["messages", "0", "text"], "value": "Hello"}]


@pytest.mark.anyio
async def test_run_controller_append_state_text() -> None:
    """RunController.append_state_text() should emit append-text operations."""

    async def run_callback(controller: RunController):
        controller.append_state_text(["user", "name"], "Al")
        controller.append_state_text(["user", "name"], "ice")

    chunks = [
        chunk
        async for chunk in create_run(
            run_callback, state={"user": {"name": ""}}
        )
    ]
    operations = [
        operation
        for chunk in chunks
        if chunk.type == "update-state"
        for operation in chunk.operations
    ]

    assert operations == [
        {"type": "append-text", "path": ["user", "name"], "value": "Al"},
        {"type": "append-text", "path": ["user", "name"], "value": "ice"},
    ]
