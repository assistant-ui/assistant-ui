import json
import logging

import pytest
from assistant_stream import create_run, RunController

from assistant_stream.assistant_stream_chunk import (
    AnnotationsChunk,
    DataChunk,
    ErrorChunk,
    FileChunk,
    StepFinishChunk,
    StepStartChunk,
    TextDeltaChunk,
    ReasoningDeltaChunk,
    ReasoningPartStartChunk,
    ToolCallArgsTextFinishChunk,
    ToolCallBeginChunk,
    ToolCallDeltaChunk,
    ToolResultChunk,
    UpdateStateChunk,
)
from assistant_stream.modules.tool_call import create_tool_call
from assistant_stream.serialization.data_stream import DataStreamEncoder
from assistant_stream.state import AssistantState


def test_data_stream_encoder_serializes_draft_proxies() -> None:
    draft = AssistantState({"items": [1]}).draft(lambda _ops: None)

    encoded = DataStreamEncoder().encode_chunk(
        DataChunk(data={"root": draft, "items": draft["items"]})
    )

    assert json.loads(encoded[2:]) == [{"root": {"items": [1]}, "items": [1]}]


def test_data_stream_encoder_update_state_shape() -> None:
    encoder = DataStreamEncoder()
    operations = [
        {"type": "append-text", "path": ["messages", "0", "text"], "value": "hi"}
    ]

    encoded = encoder.encode_chunk(UpdateStateChunk(operations=operations))

    assert encoded.startswith("aui-state:")
    assert encoded.endswith("\n")
    assert json.loads(encoded[len("aui-state:") :].strip()) == operations


def test_data_stream_encoder_annotations_frame() -> None:
    encoder = DataStreamEncoder()

    encoded = encoder.encode_chunk(
        AnnotationsChunk(annotations=[{"type": "citation", "id": "a1"}])
    )

    assert encoded == '8:[{"type": "citation", "id": "a1"}]\n'


def test_data_stream_encoder_step_start_frame() -> None:
    encoder = DataStreamEncoder()

    encoded = encoder.encode_chunk(StepStartChunk(message_id="msg_1"))

    assert encoded == 'f:{"messageId": "msg_1"}\n'


def test_data_stream_encoder_step_finish_frame() -> None:
    encoder = DataStreamEncoder()

    encoded = encoder.encode_chunk(
        StepFinishChunk(
            finish_reason="stop",
            input_tokens=12,
            output_tokens=34,
            is_continued=False,
        )
    )

    assert encoded == (
        'e:{"finishReason": "stop", '
        '"usage": {"inputTokens": 12, "outputTokens": 34}, '
        '"isContinued": false}\n'
    )


def test_data_stream_encoder_file_frame() -> None:
    encoder = DataStreamEncoder()

    encoded = encoder.encode_chunk(FileChunk(data="aGVsbG8=", mime_type="image/png"))

    assert encoded == 'k:{"data": "aGVsbG8=", "mimeType": "image/png"}\n'


def test_data_stream_encoder_file_frame_has_no_parent_id_field() -> None:
    encoder = DataStreamEncoder()

    encoded = encoder.encode_chunk(
        FileChunk(data="x", mime_type="text/plain", parent_id="p1")
    )

    assert encoded == 'k:{"data": "x", "mimeType": "text/plain"}\n'


@pytest.mark.anyio
async def test_data_stream_encoder_finishes_args_before_interleaved_text() -> None:
    async def stream():
        yield ToolCallBeginChunk(tool_call_id="t1", tool_name="search")
        yield ToolCallDeltaChunk(tool_call_id="t1", args_text_delta='{"q": 1}')
        yield ToolCallArgsTextFinishChunk(tool_call_id="t1")
        yield TextDeltaChunk(text_delta="working")

    encoded = [frame async for frame in DataStreamEncoder().encode_stream(stream())]

    assert encoded == [
        'b:{"toolCallId": "t1", "toolName": "search"}\n',
        'c:{"toolCallId": "t1", "argsTextDelta": "{\\"q\\": 1}"}\n',
        'c:{"toolCallId": "t1", "argsTextDelta": "", "isFinal": true}\n',
        '0:"working"\n',
    ]


@pytest.mark.anyio
async def test_data_stream_encoder_keeps_results_before_args_finish() -> None:
    async def stream():
        yield ToolCallBeginChunk(tool_call_id="t1", tool_name="ping")
        yield ToolResultChunk(tool_call_id="t1", result="pong")
        yield ToolCallArgsTextFinishChunk(tool_call_id="t1")

    encoded = [frame async for frame in DataStreamEncoder().encode_stream(stream())]

    assert encoded == [
        'b:{"toolCallId": "t1", "toolName": "ping"}\n',
        'a:{"toolCallId": "t1", "result": "pong"}\n',
    ]


@pytest.mark.anyio
async def test_data_stream_encoder_warns_once_for_dropped_tool_call_deltas(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.WARNING, logger="assistant_stream.serialization.data_stream")

    async def stream():
        yield ToolCallDeltaChunk(tool_call_id="missing", args_text_delta="x")
        yield ToolCallDeltaChunk(tool_call_id="missing", args_text_delta="y")
        yield ToolCallBeginChunk(tool_call_id="t1", tool_name="search")
        yield ToolResultChunk(tool_call_id="t1", result="ok")
        yield ToolCallDeltaChunk(tool_call_id="t1", args_text_delta="late")
        yield ToolCallDeltaChunk(tool_call_id="t1", args_text_delta="later")

    encoded = [frame async for frame in DataStreamEncoder().encode_stream(stream())]

    assert encoded == [
        'b:{"toolCallId": "t1", "toolName": "search"}\n',
        'a:{"toolCallId": "t1", "result": "ok"}\n',
    ]
    assert [record.getMessage() for record in caplog.records] == [
        "Dropped data-stream chunk (unknown-tool-call-id): tool-call-delta for missing",
        "Dropped data-stream chunk (settled-tool-call-id): tool-call-delta for t1",
    ]


@pytest.mark.anyio
async def test_data_stream_encoder_emits_tool_controller_finish() -> None:
    stream, controller = await create_tool_call("search", "t1")
    controller.append_args_text('{"q": 1}')
    controller.close()

    encoded = [frame async for frame in DataStreamEncoder().encode_stream(stream)]

    assert encoded == [
        'b:{"toolCallId": "t1", "toolName": "search"}\n',
        'c:{"toolCallId": "t1", "argsTextDelta": "{\\"q\\": 1}"}\n',
        'c:{"toolCallId": "t1", "argsTextDelta": "", "isFinal": true}\n',
    ]


@pytest.mark.anyio
async def test_data_stream_encoder_defaults_empty_tool_args() -> None:
    stream, controller = await create_tool_call("now", "t1")
    controller.close()

    encoded = [frame async for frame in DataStreamEncoder().encode_stream(stream)]

    assert encoded == [
        'b:{"toolCallId": "t1", "toolName": "now"}\n',
        'c:{"toolCallId": "t1", "argsTextDelta": "{}", "isFinal": true}\n',
    ]


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("boundary", "encoded_boundary"),
    [
        (
            StepFinishChunk(
                finish_reason="tool-calls",
                input_tokens=1,
                output_tokens=2,
            ),
            'e:{"finishReason": "tool-calls", '
            '"usage": {"inputTokens": 1, "outputTokens": 2}, '
            '"isContinued": false}\n',
        ),
        (ErrorChunk(error="failed"), '3:"failed"\n'),
    ],
)
async def test_data_stream_encoder_finishes_args_before_boundaries(
    boundary: StepFinishChunk | ErrorChunk,
    encoded_boundary: str,
) -> None:
    async def stream():
        yield ToolCallBeginChunk(tool_call_id="t1", tool_name="search")
        yield boundary

    encoded = [frame async for frame in DataStreamEncoder().encode_stream(stream())]

    assert encoded == [
        'b:{"toolCallId": "t1", "toolName": "search"}\n',
        'c:{"toolCallId": "t1", "argsTextDelta": "{}", "isFinal": true}\n',
        encoded_boundary,
    ]


@pytest.mark.anyio
async def test_data_stream_encoder_carries_trailing_args_on_the_final_chunk():
    """A producer may deliver the last of its arguments on the finish chunk
    itself; that text has to reach the wire rather than be replaced by the
    encoder's own marker."""
    encoder = DataStreamEncoder()

    async def stream():
        yield ToolCallBeginChunk(tool_call_id="t1", tool_name="search")
        yield ToolCallDeltaChunk(tool_call_id="t1", args_text_delta='{"q": ')
        yield ToolCallArgsTextFinishChunk(tool_call_id="t1", args_text_delta="1}")

    lines = [line async for line in encoder.encode_stream(stream())]

    assert lines == [
        'b:{"toolCallId": "t1", "toolName": "search"}\n',
        'c:{"toolCallId": "t1", "argsTextDelta": "{\\"q\\": "}\n',
        'c:{"toolCallId": "t1", "argsTextDelta": "1}", "isFinal": true}\n',
    ]
    args_text = "".join(
        json.loads(line[2:])["argsTextDelta"] for line in lines if line.startswith("c:")
    )
    assert json.loads(args_text) == {"q": 1}


@pytest.mark.anyio
async def test_data_stream_encoder_emits_a_reasoning_part_start_for_a_summary():
    """A summary cannot ride on a reasoning delta, and a part that never
    appends text emits nothing at all without this frame."""
    encoder = DataStreamEncoder()

    async def stream():
        yield ReasoningPartStartChunk(unstable_summary="Planning")
        yield ReasoningDeltaChunk(reasoning_delta="thinking", parent_id=None)

    lines = [line async for line in encoder.encode_stream(stream())]

    assert lines == [
        'aui-reasoning-part-start:{"unstable_summary": "Planning"}\n',
        'g:"thinking"\n',
    ]


@pytest.mark.anyio
async def test_data_stream_encoder_carries_the_parent_on_a_reasoning_part_start():
    encoder = DataStreamEncoder()

    async def stream():
        yield ReasoningPartStartChunk(unstable_summary="Planning", parent_id="p1")

    lines = [line async for line in encoder.encode_stream(stream())]

    assert lines == [
        'aui-reasoning-part-start:{"unstable_summary": "Planning", "parentId": "p1"}\n'
    ]


@pytest.mark.anyio
async def test_data_stream_encoder_suppresses_a_reasoning_start_without_a_summary():
    """A start with nothing to carry must not change the wire, matching the
    TypeScript encoder."""
    encoder = DataStreamEncoder()

    async def stream():
        yield ReasoningPartStartChunk()
        yield ReasoningDeltaChunk(reasoning_delta="thinking", parent_id=None)

    lines = [line async for line in encoder.encode_stream(stream())]

    assert lines == ['g:"thinking"\n']


@pytest.mark.anyio
async def test_data_stream_encoder_carries_an_explicitly_empty_summary():
    encoder = DataStreamEncoder()

    async def stream():
        yield ReasoningPartStartChunk(unstable_summary="")

    lines = [line async for line in encoder.encode_stream(stream())]

    assert lines == ['aui-reasoning-part-start:{"unstable_summary": ""}\n']


@pytest.mark.anyio
async def test_run_controller_add_reasoning_part_emits_the_summary():
    """The public helper is the only supported way to open a summarized
    reasoning part, so it is pinned rather than the chunk it builds."""

    async def run_callback(controller: RunController):
        controller.add_reasoning_part("Planning")
        controller.append_reasoning("thinking")

    encoder = DataStreamEncoder()
    lines = [line async for line in encoder.encode_stream(create_run(run_callback))]

    assert lines == [
        'aui-reasoning-part-start:{"unstable_summary": "Planning"}\n',
        'g:"thinking"\n',
    ]


@pytest.mark.anyio
async def test_run_controller_add_reasoning_part_carries_the_parent():
    async def run_callback(controller: RunController):
        controller.with_parent_id("p1").add_reasoning_part("Planning")

    encoder = DataStreamEncoder()
    lines = [line async for line in encoder.encode_stream(create_run(run_callback))]

    assert lines == [
        'aui-reasoning-part-start:{"unstable_summary": "Planning", "parentId": "p1"}\n'
    ]
