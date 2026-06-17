"""Tests for the LangGraph integration (assistant_stream.modules.langgraph).

These exercise append_langgraph_event against a real StateManager proxy, mirroring
how the assistant-transport langgraph backend feeds langgraph's native
``stream_mode=["messages", "updates"]`` output into ``controller.state``: the
first argument is the state proxy, the event type is langgraph's stream mode name
("messages" or "updates"), and a "messages" payload is a ``(message, metadata)``
tuple carrying a single message or message chunk.
"""

from typing import Any

import pytest
from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage

from assistant_stream.modules.langgraph import append_langgraph_event
from assistant_stream.state_manager import StateManager


def _manager(initial: Any) -> StateManager:
    return StateManager(lambda _chunk: None, initial)


def _manager_with_ops(initial: Any) -> tuple[StateManager, list[dict[str, Any]]]:
    ops: list[dict[str, Any]] = []
    return StateManager(lambda chunk: ops.extend(chunk.operations), initial), ops


@pytest.mark.anyio
async def test_appends_single_message_to_empty_state() -> None:
    manager = _manager({})

    append_langgraph_event(
        manager.state, (), "messages", (HumanMessage(content="Hello", id="m1"), {})
    )

    messages = manager.state_data["messages"]
    assert len(messages) == 1
    assert messages[0]["content"] == "Hello"
    assert messages[0]["id"] == "m1"
    assert messages[0]["type"] == "human"


@pytest.mark.anyio
async def test_appends_messages_in_order() -> None:
    manager = _manager({"messages": []})

    append_langgraph_event(
        manager.state, (), "messages", (HumanMessage(content="A", id="a"), {})
    )
    append_langgraph_event(
        manager.state, (), "messages", (AIMessage(content="B", id="b"), {})
    )

    assert [m["content"] for m in manager.state_data["messages"]] == ["A", "B"]


@pytest.mark.anyio
async def test_merges_ai_message_chunks_by_id() -> None:
    manager = _manager({"messages": []})

    append_langgraph_event(
        manager.state, (), "messages", (AIMessageChunk(content="Hello", id="m1"), {})
    )
    append_langgraph_event(
        manager.state, (), "messages", (AIMessageChunk(content=" world", id="m1"), {})
    )

    messages = manager.state_data["messages"]
    assert len(messages) == 1
    assert messages[0]["content"] == "Hello world"
    assert messages[0]["id"] == "m1"
    assert messages[0]["type"] == "ai"


@pytest.mark.anyio
async def test_merging_ai_message_chunk_emits_content_append_text_delta() -> None:
    manager, ops = _manager_with_ops({"messages": []})

    append_langgraph_event(
        manager.state, (), "messages", (AIMessageChunk(content="Hello", id="m1"), {})
    )
    manager.flush()
    ops.clear()

    append_langgraph_event(
        manager.state, (), "messages", (AIMessageChunk(content=" world", id="m1"), {})
    )
    manager.flush()

    assert manager.state_data["messages"][0]["content"] == "Hello world"
    assert {
        "type": "append-text",
        "path": ["messages", "0", "content"],
        "value": " world",
    } in ops
    assert not any(
        op["type"] == "set" and op["path"] == ["messages", "0"] for op in ops
    )


@pytest.mark.anyio
async def test_merging_ai_message_chunk_patches_nested_tool_call_args() -> None:
    manager, ops = _manager_with_ops({"messages": []})

    append_langgraph_event(
        manager.state,
        (),
        "messages",
        (
            AIMessageChunk(
                content="",
                id="m1",
                tool_call_chunks=[
                    {
                        "name": "search",
                        "args": '{"query"',
                        "id": "call_1",
                        "index": 0,
                    }
                ],
            ),
            {},
        ),
    )
    manager.flush()
    ops.clear()

    append_langgraph_event(
        manager.state,
        (),
        "messages",
        (
            AIMessageChunk(
                content="",
                id="m1",
                tool_call_chunks=[
                    {
                        "name": None,
                        "args": ':"docs"}',
                        "id": None,
                        "index": 0,
                    }
                ],
            ),
            {},
        ),
    )
    manager.flush()

    assert (
        manager.state_data["messages"][0]["tool_call_chunks"][0]["args"]
        == '{"query":"docs"}'
    )
    assert {
        "type": "append-text",
        "path": ["messages", "0", "tool_call_chunks", "0", "args"],
        "value": ':"docs"}',
    } in ops
    assert not any(
        op["type"] == "set" and op["path"] == ["messages", "0"] for op in ops
    )


@pytest.mark.anyio
async def test_replaces_existing_message_with_same_id() -> None:
    manager = _manager({"messages": [{"type": "human", "id": "m1", "content": "old"}]})

    append_langgraph_event(
        manager.state, (), "messages", (HumanMessage(content="new", id="m1"), {})
    )

    messages = manager.state_data["messages"]
    assert len(messages) == 1
    assert messages[0]["content"] == "new"


@pytest.mark.anyio
async def test_updates_event_writes_channels_onto_state() -> None:
    manager = _manager({})

    append_langgraph_event(
        manager.state, (), "updates", {"agent": {"answer": "42", "messages": "ignored"}}
    )

    assert manager.state_data["answer"] == "42"
    assert "messages" not in manager.state_data
    assert "agent" not in manager.state_data


@pytest.mark.anyio
async def test_updates_event_skips_non_dict_nodes() -> None:
    manager = _manager({})

    append_langgraph_event(
        manager.state, (), "updates", {"bad": "not-a-dict", "agent": {"answer": "42"}}
    )

    assert manager.state_data["answer"] == "42"
    assert "bad" not in manager.state_data


@pytest.mark.anyio
async def test_unknown_event_type_is_ignored() -> None:
    manager = _manager({"existing": "value"})

    append_langgraph_event(manager.state, (), "custom", "anything")

    assert manager.state_data == {"existing": "value"}
