import json

import pytest
from langchain_core.messages import AIMessage, ToolMessage

import main


def tool_call(tool_call_id: str, name: str) -> dict[str, object]:
    return {"id": tool_call_id, "name": name, "args": {"numbers": [2, 3]}}


def message_with_calls(*calls: dict[str, object]) -> AIMessage:
    return AIMessage(content="", tool_calls=list(calls))


def test_should_call_tools_routes_only_frontend_calls_to_client() -> None:
    frontend_state = {
        "messages": [message_with_calls(tool_call("frontend-1", "get_weather"))],
        "tools": {"get_weather": {"description": "weather"}},
    }
    mixed_state = {
        "messages": [
            message_with_calls(
                tool_call("server-1", "calculate_sum"),
                tool_call("frontend-1", "get_weather"),
            )
        ],
        "tools": {"get_weather": {"description": "weather"}},
    }

    assert main.should_call_tools(frontend_state) == "end"
    assert main.should_call_tools(mixed_state) == "tools"


def test_should_call_tools_routes_unknown_calls_to_error_handling() -> None:
    state = {"messages": [message_with_calls(tool_call("unknown-1", "missing_tool"))]}

    assert main.should_call_tools(state) == "tools"


@pytest.mark.asyncio
async def test_tool_executor_defers_frontend_calls() -> None:
    state = {
        "messages": [
            message_with_calls(
                tool_call("server-1", "calculate_sum"),
                tool_call("frontend-1", "get_weather"),
            )
        ],
        "tools": {"get_weather": {"description": "weather"}},
    }

    result = await main.tool_executor_node(state)

    assert [message.tool_call_id for message in result["messages"]] == ["server-1"]
    assert json.loads(result["messages"][0].content)["sum"] == 5.0


@pytest.mark.asyncio
async def test_tool_executor_keeps_unknown_tool_error() -> None:
    state = {
        "messages": [message_with_calls(tool_call("unknown-1", "missing_tool"))],
        "tools": {},
    }

    result = await main.tool_executor_node(state)

    assert json.loads(result["messages"][0].content) == {"error": "Unknown tool: missing_tool"}


@pytest.mark.asyncio
async def test_tool_executor_errors_disabled_and_malformed_request_tools() -> None:
    state = {
        "messages": [
            message_with_calls(
                tool_call("disabled-1", "get_weather"),
                tool_call("malformed-1", "broken_tool"),
            )
        ],
        "tools": {
            "get_weather": {"description": "weather", "disabled": True},
            "broken_tool": "not-a-schema",
        },
    }

    result = await main.tool_executor_node(state)

    assert [message.tool_call_id for message in result["messages"]] == [
        "disabled-1",
        "malformed-1",
    ]
    assert json.loads(result["messages"][0].content) == {
        "error": "Unknown tool: get_weather"
    }
    assert json.loads(result["messages"][1].content) == {
        "error": "Unknown tool: broken_tool"
    }


@pytest.mark.asyncio
async def test_tool_executor_defers_frontend_and_errors_unknown_calls() -> None:
    state = {
        "messages": [
            message_with_calls(
                tool_call("frontend-1", "get_weather"),
                tool_call("unknown-1", "missing_tool"),
            )
        ],
        "tools": {"get_weather": {"description": "weather"}},
    }

    result = await main.tool_executor_node(state)

    assert [message.tool_call_id for message in result["messages"]] == ["unknown-1"]
    assert json.loads(result["messages"][0].content) == {"error": "Unknown tool: missing_tool"}


def test_should_continue_after_tools_stops_for_deferred_calls() -> None:
    state = {
        "messages": [
            message_with_calls(
                tool_call("server-1", "calculate_sum"),
                tool_call("frontend-1", "get_weather"),
            ),
            ToolMessage(
                content='{"sum": 5.0}',
                tool_call_id="server-1",
                name="calculate_sum",
            ),
        ],
        "tools": {"get_weather": {"description": "weather"}},
    }

    assert main.should_continue_after_tools(state) == "end"


def test_should_continue_after_tools_resumes_server_calls() -> None:
    state = {
        "messages": [message_with_calls(tool_call("server-1", "calculate_sum"))],
        "tools": {},
    }

    assert main.should_continue_after_tools(state) == "agent"


@pytest.mark.asyncio
async def test_mixed_graph_turn_does_not_reenter_agent(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    mixed = message_with_calls(
        tool_call("server-1", "calculate_sum"),
        tool_call("frontend-1", "get_weather"),
    )
    calls = 0

    async def fake_agent(state: dict[str, object]) -> dict[str, object]:
        nonlocal calls
        calls += 1
        if calls > 1:
            raise AssertionError("agent re-entered with an unanswered frontend call")
        return {"messages": [mixed]}

    monkeypatch.setattr(main, "agent_node", fake_agent)
    result = await main.create_graph().ainvoke(
        {
            "messages": [],
            "tools": {"get_weather": {"description": "weather"}},
        },
        {"configurable": {"thread_id": "mixed-1"}},
    )

    assert calls == 1
    assert [
        message.tool_call_id
        for message in result["messages"]
        if isinstance(message, ToolMessage)
    ] == ["server-1"]
