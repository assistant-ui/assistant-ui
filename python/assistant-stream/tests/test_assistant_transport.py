import pytest
from assistant_stream import create_run, RunController
from assistant_stream.assistant_stream_chunk import (
    DataChunk,
    ErrorChunk,
    ReasoningDeltaChunk,
    SourceChunk,
    TextDeltaChunk,
    ToolCallBeginChunk,
    ToolCallDeltaChunk,
    ToolResultChunk,
    UpdateStateChunk,
)
from assistant_stream.serialization.assistant_transport import AssistantTransportEncoder
import json


async def _encode(chunks):
    async def stream():
        for chunk in chunks:
            yield chunk

    encoder = AssistantTransportEncoder()
    return [line async for line in encoder.encode_stream(stream())]


def _parse(lines):
    assert lines[-1] == "data: [DONE]\n\n"
    parsed = []
    for line in lines[:-1]:
        assert line.startswith("data: ")
        assert line.endswith("\n\n")
        parsed.append(json.loads(line[6:-2]))
    return parsed


@pytest.mark.anyio
async def test_media_type():
    assert AssistantTransportEncoder().get_media_type() == "text/event-stream"


@pytest.mark.anyio
async def test_text_deltas_share_one_text_part():
    lines = await _encode(
        [TextDeltaChunk(text_delta="Hello"), TextDeltaChunk(text_delta=" world")]
    )
    assert _parse(lines) == [
        {"type": "part-start", "part": {"type": "text"}, "path": []},
        {"type": "text-delta", "textDelta": "Hello", "path": [0]},
        {"type": "text-delta", "textDelta": " world", "path": [0]},
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_reasoning_then_text_opens_separate_parts():
    lines = await _encode(
        [
            ReasoningDeltaChunk(reasoning_delta="Thinking..."),
            TextDeltaChunk(text_delta="Answer"),
        ]
    )
    assert _parse(lines) == [
        {"type": "part-start", "part": {"type": "reasoning"}, "path": []},
        {"type": "text-delta", "textDelta": "Thinking...", "path": [0]},
        {"type": "part-finish", "path": [0]},
        {"type": "part-start", "part": {"type": "text"}, "path": []},
        {"type": "text-delta", "textDelta": "Answer", "path": [1]},
        {"type": "part-finish", "path": [1]},
    ]


@pytest.mark.anyio
async def test_parent_id_change_opens_new_part():
    lines = await _encode(
        [
            TextDeltaChunk(text_delta="a"),
            TextDeltaChunk(text_delta="b", parent_id="p1"),
        ]
    )
    assert _parse(lines) == [
        {"type": "part-start", "part": {"type": "text"}, "path": []},
        {"type": "text-delta", "textDelta": "a", "path": [0]},
        {"type": "part-finish", "path": [0]},
        {"type": "part-start", "part": {"type": "text", "parentId": "p1"}, "path": []},
        {"type": "text-delta", "textDelta": "b", "path": [1]},
        {"type": "part-finish", "path": [1]},
    ]


@pytest.mark.anyio
async def test_tool_call_with_streamed_args_and_result():
    lines = await _encode(
        [
            ToolCallBeginChunk(tool_call_id="tool_1", tool_name="get_weather"),
            ToolCallDeltaChunk(tool_call_id="tool_1", args_text_delta='{"location":'),
            ToolCallDeltaChunk(tool_call_id="tool_1", args_text_delta=' "NYC"}'),
            ToolResultChunk(tool_call_id="tool_1", result={"temp": 70}),
        ]
    )
    assert _parse(lines) == [
        {
            "type": "part-start",
            "part": {
                "type": "tool-call",
                "toolCallId": "tool_1",
                "toolName": "get_weather",
            },
            "path": [],
        },
        {"type": "text-delta", "textDelta": '{"location":', "path": [0]},
        {"type": "text-delta", "textDelta": ' "NYC"}', "path": [0]},
        {"type": "tool-call-args-text-finish", "path": [0]},
        {"type": "result", "result": {"temp": 70}, "isError": False, "path": [0]},
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_tool_call_without_args_defaults_to_empty_object():
    lines = await _encode(
        [
            ToolCallBeginChunk(tool_call_id="tool_1", tool_name="noop"),
            ToolResultChunk(tool_call_id="tool_1", result="ok"),
        ]
    )
    assert _parse(lines) == [
        {
            "type": "part-start",
            "part": {"type": "tool-call", "toolCallId": "tool_1", "toolName": "noop"},
            "path": [],
        },
        {"type": "text-delta", "textDelta": "{}", "path": [0]},
        {"type": "tool-call-args-text-finish", "path": [0]},
        {"type": "result", "result": "ok", "isError": False, "path": [0]},
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_tool_result_carries_artifact_and_error_flag():
    lines = await _encode(
        [
            ToolCallBeginChunk(tool_call_id="tool_1", tool_name="fail"),
            ToolResultChunk(
                tool_call_id="tool_1",
                result="boom",
                artifact={"trace": 1},
                is_error=True,
            ),
        ]
    )
    result_chunks = [c for c in _parse(lines) if c["type"] == "result"]
    assert result_chunks == [
        {
            "type": "result",
            "result": "boom",
            "isError": True,
            "artifact": {"trace": 1},
            "path": [0],
        }
    ]


@pytest.mark.anyio
async def test_text_delta_does_not_close_tool_args():
    lines = await _encode(
        [
            ToolCallBeginChunk(tool_call_id="tool_1", tool_name="noop"),
            TextDeltaChunk(text_delta="hi"),
            ToolCallDeltaChunk(tool_call_id="tool_1", args_text_delta='{"a": 1}'),
        ]
    )
    assert _parse(lines) == [
        {
            "type": "part-start",
            "part": {"type": "tool-call", "toolCallId": "tool_1", "toolName": "noop"},
            "path": [],
        },
        {"type": "part-start", "part": {"type": "text"}, "path": []},
        {"type": "text-delta", "textDelta": "hi", "path": [1]},
        {"type": "text-delta", "textDelta": '{"a": 1}', "path": [0]},
        {"type": "part-finish", "path": [1]},
        {"type": "tool-call-args-text-finish", "path": [0]},
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_data_and_update_state_do_not_close_args():
    lines = await _encode(
        [
            ToolCallBeginChunk(tool_call_id="tool_1", tool_name="noop"),
            DataChunk(data={"x": 1}),
            UpdateStateChunk(operations=[{"type": "set", "path": [], "value": 1}]),
            ToolCallDeltaChunk(tool_call_id="tool_1", args_text_delta="{}"),
        ]
    )
    assert _parse(lines) == [
        {
            "type": "part-start",
            "part": {"type": "tool-call", "toolCallId": "tool_1", "toolName": "noop"},
            "path": [],
        },
        {"type": "data", "data": [{"x": 1}], "path": []},
        {
            "type": "update-state",
            "operations": [{"type": "set", "path": [], "value": 1}],
            "path": [],
        },
        {"type": "text-delta", "textDelta": "{}", "path": [0]},
        {"type": "tool-call-args-text-finish", "path": [0]},
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_data_value_is_wrapped_in_list():
    lines = await _encode([DataChunk(data=[1, 2])])
    assert _parse(lines) == [{"type": "data", "data": [[1, 2]], "path": []}]


@pytest.mark.anyio
async def test_error_is_message_level_and_leaves_args_open():
    lines = await _encode(
        [
            ToolCallBeginChunk(tool_call_id="tool_1", tool_name="noop"),
            ErrorChunk(error="boom"),
        ]
    )
    assert _parse(lines) == [
        {
            "type": "part-start",
            "part": {"type": "tool-call", "toolCallId": "tool_1", "toolName": "noop"},
            "path": [],
        },
        {"type": "error", "error": "boom", "path": []},
        {"type": "text-delta", "textDelta": "{}", "path": [0]},
        {"type": "tool-call-args-text-finish", "path": [0]},
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_update_state_preserves_operation_shape():
    operations = [
        {"type": "append-text", "path": ["messages", "0", "text"], "value": "hi"}
    ]
    lines = await _encode([UpdateStateChunk(operations=operations)])
    assert _parse(lines) == [
        {"type": "update-state", "operations": operations, "path": []}
    ]


@pytest.mark.anyio
async def test_source_emits_self_closing_part():
    lines = await _encode(
        [SourceChunk(id="s1", url="https://example.com", title="Example")]
    )
    assert _parse(lines) == [
        {
            "type": "part-start",
            "part": {
                "type": "source",
                "sourceType": "url",
                "id": "s1",
                "url": "https://example.com",
                "title": "Example",
            },
            "path": [],
        },
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_unclosed_tool_call_is_finished_on_flush():
    lines = await _encode(
        [
            ToolCallBeginChunk(tool_call_id="tool_1", tool_name="noop"),
            ToolCallDeltaChunk(tool_call_id="tool_1", args_text_delta='{"a": 1}'),
        ]
    )
    assert _parse(lines) == [
        {
            "type": "part-start",
            "part": {"type": "tool-call", "toolCallId": "tool_1", "toolName": "noop"},
            "path": [],
        },
        {"type": "text-delta", "textDelta": '{"a": 1}', "path": [0]},
        {"type": "tool-call-args-text-finish", "path": [0]},
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_concurrent_tool_calls_interleave_without_arg_loss():
    lines = await _encode(
        [
            ToolCallBeginChunk(tool_call_id="call_a", tool_name="search"),
            ToolCallBeginChunk(tool_call_id="call_b", tool_name="lookup"),
            ToolCallDeltaChunk(tool_call_id="call_a", args_text_delta='{"q": "cats"}'),
            ToolResultChunk(tool_call_id="call_a", result="r1"),
            ToolResultChunk(tool_call_id="call_b", result="r2"),
        ]
    )
    assert _parse(lines) == [
        {
            "type": "part-start",
            "part": {"type": "tool-call", "toolCallId": "call_a", "toolName": "search"},
            "path": [],
        },
        {
            "type": "part-start",
            "part": {"type": "tool-call", "toolCallId": "call_b", "toolName": "lookup"},
            "path": [],
        },
        {"type": "text-delta", "textDelta": '{"q": "cats"}', "path": [0]},
        {"type": "tool-call-args-text-finish", "path": [0]},
        {"type": "result", "result": "r1", "isError": False, "path": [0]},
        {"type": "part-finish", "path": [0]},
        {"type": "text-delta", "textDelta": "{}", "path": [1]},
        {"type": "tool-call-args-text-finish", "path": [1]},
        {"type": "result", "result": "r2", "isError": False, "path": [1]},
        {"type": "part-finish", "path": [1]},
    ]


@pytest.mark.anyio
async def test_delta_after_result_is_dropped():
    lines = await _encode(
        [
            ToolCallBeginChunk(tool_call_id="tool_1", tool_name="noop"),
            ToolResultChunk(tool_call_id="tool_1", result="ok"),
            ToolCallDeltaChunk(tool_call_id="tool_1", args_text_delta="late"),
        ]
    )
    late_deltas = [
        c for c in _parse(lines) if c["type"] == "text-delta" and c["textDelta"] == "late"
    ]
    assert late_deltas == []


@pytest.mark.anyio
async def test_duplicate_tool_call_begin_is_dropped():
    lines = await _encode(
        [
            ToolCallBeginChunk(tool_call_id="tool_1", tool_name="noop"),
            ToolCallBeginChunk(tool_call_id="tool_1", tool_name="noop"),
            ToolResultChunk(tool_call_id="tool_1", result="ok"),
        ]
    )
    chunks = _parse(lines)
    part_starts = [c for c in chunks if c["type"] == "part-start"]
    assert len(part_starts) == 1
    assert chunks[-1] == {"type": "part-finish", "path": [0]}


@pytest.mark.anyio
async def test_chunks_for_unknown_tool_call_are_dropped():
    lines = await _encode(
        [
            ToolCallDeltaChunk(tool_call_id="nope", args_text_delta="{}"),
            ToolResultChunk(tool_call_id="nope", result="ok"),
        ]
    )
    assert _parse(lines) == []


@pytest.mark.anyio
async def test_duplicate_tool_result_is_dropped():
    lines = await _encode(
        [
            ToolCallBeginChunk(tool_call_id="tool_1", tool_name="noop"),
            ToolResultChunk(tool_call_id="tool_1", result="first"),
            ToolResultChunk(tool_call_id="tool_1", result="second"),
        ]
    )
    result_chunks = [c for c in _parse(lines) if c["type"] == "result"]
    assert result_chunks == [
        {"type": "result", "result": "first", "isError": False, "path": [0]}
    ]


@pytest.mark.anyio
async def test_create_run_text_stream():
    async def run_callback(controller: RunController):
        controller.append_text("Hello")
        controller.append_text(" world")

    encoder = AssistantTransportEncoder()
    lines = [line async for line in encoder.encode_stream(create_run(run_callback))]
    assert _parse(lines) == [
        {"type": "part-start", "part": {"type": "text"}, "path": []},
        {"type": "text-delta", "textDelta": "Hello", "path": [0]},
        {"type": "text-delta", "textDelta": " world", "path": [0]},
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_create_run_tool_call():
    async def run_callback(controller: RunController):
        tool_controller = await controller.add_tool_call("get_weather", "tool_1")
        tool_controller.append_args_text('{"location": "NYC"}')
        tool_controller.set_response({"temp": 70})

    encoder = AssistantTransportEncoder()
    lines = [line async for line in encoder.encode_stream(create_run(run_callback))]
    chunks = _parse(lines)

    part_starts = [c for c in chunks if c["type"] == "part-start"]
    assert part_starts == [
        {
            "type": "part-start",
            "part": {
                "type": "tool-call",
                "toolCallId": "tool_1",
                "toolName": "get_weather",
            },
            "path": [],
        }
    ]
    assert {"type": "text-delta", "textDelta": '{"location": "NYC"}', "path": [0]} in chunks
    assert {"type": "tool-call-args-text-finish", "path": [0]} in chunks
    assert {"type": "result", "result": {"temp": 70}, "isError": False, "path": [0]} in chunks
    assert chunks[-1] == {"type": "part-finish", "path": [0]}
