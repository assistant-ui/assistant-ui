"""Tests for tool_executor_node frontend/server tool ownership routing.

Regression coverage for the case where an assistant message mixes a
server-owned tool call with a request-provided frontend tool call. The
frontend call must be deferred to the client, not answered server side with
an "Unknown tool" error, while a genuinely unknown name must still be errored
so the turn does not wedge with an unanswered call.
"""
import json

import pytest
from langchain_core.messages import AIMessage

import main


def _results_by_name(output):
    return {tm.name: json.loads(tm.content) for tm in output["messages"]}


@pytest.mark.asyncio
async def test_mixed_message_defers_frontend_tool_and_runs_server_tool():
    ai = AIMessage(
        content="I'll call a tool for that.",
        tool_calls=[
            {"id": "sum_001", "name": "calculate_sum", "args": {"numbers": [2, 3]}},
            {"id": "weather_001", "name": "get_weather", "args": {"location": "SF"}},
        ],
    )
    frontend_tools = {
        "get_weather": {
            "description": "Get the weather",
            "parameters": {"type": "object", "properties": {}},
        }
    }
    state = {"messages": [ai], "tools": frontend_tools}

    assert main.should_call_tools(state) == "tools"

    results = _results_by_name(await main.tool_executor_node(state))

    # Server-owned call is executed and answered.
    assert results["calculate_sum"]["sum"] == 5
    # Frontend call is deferred to the client, not answered with an error.
    assert "get_weather" not in results


@pytest.mark.asyncio
async def test_unknown_tool_still_errors():
    ai = AIMessage(
        content="x",
        tool_calls=[
            {"id": "sum_002", "name": "calculate_sum", "args": {"numbers": [1, 1]}},
            {"id": "bogus_001", "name": "does_not_exist", "args": {}},
        ],
    )
    frontend_tools = {
        "get_weather": {
            "description": "Get the weather",
            "parameters": {"type": "object", "properties": {}},
        }
    }
    state = {"messages": [ai], "tools": frontend_tools}

    results = _results_by_name(await main.tool_executor_node(state))

    assert results["calculate_sum"]["sum"] == 2
    # A name in neither the frontend tools nor the server tools is a real error.
    assert results["does_not_exist"] == {"error": "Unknown tool: does_not_exist"}


@pytest.mark.asyncio
async def test_frontend_only_message_routes_to_end():
    ai = AIMessage(
        content="weather please",
        tool_calls=[
            {"id": "weather_001", "name": "get_weather", "args": {"location": "SF"}},
        ],
    )
    state = {
        "messages": [ai],
        "tools": {
            "get_weather": {
                "description": "Get the weather",
                "parameters": {"type": "object", "properties": {}},
            }
        },
    }
    # A message with only frontend calls never reaches the executor.
    assert main.should_call_tools(state) == "end"
