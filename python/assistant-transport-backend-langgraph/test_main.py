import json

import pytest
from langchain_core.messages import AIMessage

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
            )
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
