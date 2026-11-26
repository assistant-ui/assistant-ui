"""Every command in a request reaches the state, in order."""

import copy
import importlib
import json
import sys

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def main(monkeypatch):
    monkeypatch.setattr("dotenv.load_dotenv", lambda *args, **kwargs: False)
    sys.modules.pop("main", None)
    module = importlib.import_module("main")

    async def no_sleep(_seconds):
        return None

    monkeypatch.setattr(module.asyncio, "sleep", no_sleep)
    return module


def final_state(response, state):
    """Replay the response's state operations onto the state the client sent."""
    state = copy.deepcopy(state)
    for line in response.text.splitlines():
        if not line.startswith("data: ") or line == "data: [DONE]":
            continue
        chunk = json.loads(line[len("data: "):])
        if chunk.get("type") != "update-state":
            continue
        for op in chunk["operations"]:
            if not op["path"]:
                state = copy.deepcopy(op["value"])
                continue
            *parents, key = op["path"]
            target = state
            for step in parents:
                target = target[int(step)] if isinstance(target, list) else target[step]
            if isinstance(target, list):
                key = int(key)
                if key == len(target):
                    target.append(None)
            if op["type"] == "set":
                target[key] = op["value"]
            elif op["type"] == "append-text":
                target[key] += op["value"]
    return state


def tool_call(tool_call_id):
    return {"type": "tool-call", "toolCallId": tool_call_id, "toolName": "get_weather", "argsText": "{}"}


def post(main, state, commands):
    response = TestClient(main.app).post(
        "/assistant", json={"state": state, "commands": commands}
    )
    return response, final_state(response, state) if response.status_code == 200 else None


def user(text):
    return {"type": "add-message", "message": {"role": "user", "parts": [{"type": "text", "text": text}]}}


def test_every_queued_message_is_added_in_order(main):
    response, state = post(main, {"messages": []}, [user("first"), user("second")])

    assert response.status_code == 200
    texts = [m["parts"][0]["text"] for m in state["messages"] if m["role"] == "user"]
    assert texts == ["first", "second"]


def test_a_tool_result_lands_on_the_call_with_its_id(main):
    sent = {
        "messages": [
            {"role": "assistant", "parts": [tool_call("call_a"), tool_call("call_b")]},
            {"role": "assistant", "parts": [{"type": "text", "text": "later"}]},
        ]
    }
    response, state = post(
        main,
        sent,
        [
            {"type": "add-tool-result", "toolCallId": "call_a", "toolName": "get_weather", "result": {"temp": 21}},
            {"type": "add-tool-result", "toolCallId": "call_b", "result": "rain", "isError": True},
        ],
    )

    assert response.status_code == 200
    first, second = state["messages"][0]["parts"]
    assert first["result"] == {"temp": 21}
    assert "isError" not in first
    assert second["result"] == "rain"
    assert second["isError"] is True
    assert "result" not in state["messages"][1]["parts"][0]


def test_a_result_for_an_unknown_call_changes_nothing(main):
    sent = {"messages": [{"role": "assistant", "parts": [tool_call("call_a")]}]}
    response, state = post(
        main, sent, [{"type": "add-tool-result", "toolCallId": "missing", "result": 1}]
    )

    assert response.status_code == 200
    assert "result" not in state["messages"][0]["parts"][0]


def test_custom_commands_are_accepted_alongside_built_in_ones(main):
    response, state = post(
        main,
        {"messages": []},
        [{"type": "my-custom-command", "data": "hello"}, user("hi")],
    )

    assert response.status_code == 200
    assert state["messages"][0]["parts"][0]["text"] == "hi"


def test_custom_commands_keep_their_fields(main):
    request = main.AssistantRequest.model_validate(
        {"commands": [{"type": "my-custom-command", "data": "hello"}]}
    )

    [command] = request.commands
    assert isinstance(command, main.CustomCommand)
    assert command.type == "my-custom-command"
    assert command.model_extra == {"data": "hello"}


@pytest.mark.parametrize(
    "command",
    [
        {"type": "add-message"},
        {"type": "add-tool-result", "result": 1},
    ],
)
def test_a_malformed_built_in_command_is_rejected(main, command):
    response = TestClient(main.app).post(
        "/assistant", json={"state": {"messages": []}, "commands": [command]}
    )

    assert response.status_code == 422


def test_a_request_without_state_starts_an_empty_thread(main):
    response = TestClient(main.app).post("/assistant", json={"commands": [user("hi")]})

    assert response.status_code == 200
    state = final_state(response, {})
    assert state["messages"][0]["parts"][0]["text"] == "hi"
