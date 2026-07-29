import pytest
from assistant_stream import create_run, RunController
from assistant_stream.assistant_stream_chunk import (
    AnnotationsChunk,
    DataChunk,
    ErrorChunk,
    FileChunk,
    ReasoningDeltaChunk,
    SourceChunk,
    StepFinishChunk,
    StepStartChunk,
    TextDeltaChunk,
    ToolCallBeginChunk,
    ToolCallDeltaChunk,
    ToolResultChunk,
    UpdateStateChunk,
)
from assistant_stream.serialization.assistant_transport import AssistantTransportEncoder
import json


@pytest.mark.anyio
async def test_assistant_transport_encoder_format():
    """Test that AssistantTransportEncoder produces SSE format."""
    encoder = AssistantTransportEncoder()
    collected_output = []

    async def run_callback(controller: RunController):
        controller.append_text("Hello")
        controller.append_text(" world")

    # Create the run and encode it
    chunks = create_run(run_callback)
    encoded = encoder.encode_stream(chunks)

    async for line in encoded:
        collected_output.append(line)

    # Verify SSE format
    assert len(collected_output) > 0

    # All lines except the last should be SSE formatted chunks
    for line in collected_output[:-1]:
        assert line.startswith("data: ")
        assert line.endswith("\n\n")
        # Verify it's valid JSON (excluding the "data: " prefix and newlines)
        json_str = line[6:-2]  # Remove "data: " and "\n\n"
        chunk_data = json.loads(json_str)
        assert "type" in chunk_data

    # Last line should be [DONE]
    assert collected_output[-1] == "data: [DONE]\n\n"


@pytest.mark.anyio
async def test_assistant_transport_encoder_text_chunks():
    """Test that text chunks are properly encoded."""
    encoder = AssistantTransportEncoder()
    collected_chunks = []

    async def run_callback(controller: RunController):
        controller.append_text("Hello")
        controller.append_text(" world")

    # Create the run and encode it
    chunks = create_run(run_callback)
    encoded = encoder.encode_stream(chunks)

    async for line in encoded:
        if line != "data: [DONE]\n\n":
            json_str = line[6:-2]  # Remove "data: " and "\n\n"
            chunk_data = json.loads(json_str)
            collected_chunks.append(chunk_data)

    # Verify we got text-delta chunks with camelCase
    text_chunks = [c for c in collected_chunks if c["type"] == "text-delta"]
    assert len(text_chunks) == 2
    assert text_chunks[0]["textDelta"] == "Hello"
    assert text_chunks[1]["textDelta"] == " world"


@pytest.mark.anyio
async def test_assistant_transport_encoder_reasoning():
    """Reasoning is emitted as a reasoning part-start plus text-deltas, framed
    by part-finish, matching the canonical assistant-transport wire shape."""
    encoder = AssistantTransportEncoder()
    collected_chunks = []

    async def run_callback(controller: RunController):
        controller.append_reasoning("Thinking...")

    # Create the run and encode it
    chunks = create_run(run_callback)
    encoded = encoder.encode_stream(chunks)

    async for line in encoded:
        if line != "data: [DONE]\n\n":
            json_str = line[6:-2]
            collected_chunks.append(json.loads(json_str))

    assert collected_chunks == [
        {"type": "part-start", "part": {"type": "reasoning"}, "path": []},
        {"type": "text-delta", "textDelta": "Thinking...", "path": [0]},
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_assistant_transport_encoder_media_type():
    """Test that the encoder returns the correct media type."""
    encoder = AssistantTransportEncoder()
    assert encoder.get_media_type() == "text/event-stream"


@pytest.mark.anyio
async def test_assistant_transport_encoder_tool_calls():
    """Tool calls open a tool-call part, stream args as text-deltas, and close
    with result + tool-call-args-text-finish + part-finish."""
    encoder = AssistantTransportEncoder()
    collected_chunks = []

    async def run_callback(controller: RunController):
        tool_controller = await controller.add_tool_call("get_weather", "tool_1")
        tool_controller.append_args_text('{"location": "NYC"}')
        tool_controller.set_response({"temp": 70})

    # Create the run and encode it
    chunks = create_run(run_callback)
    encoded = encoder.encode_stream(chunks)

    async for line in encoded:
        if line != "data: [DONE]\n\n":
            collected_chunks.append(json.loads(line[6:-2]))

    assert collected_chunks == [
        {
            "type": "part-start",
            "part": {
                "type": "tool-call",
                "toolCallId": "tool_1",
                "toolName": "get_weather",
            },
            "path": [],
        },
        {"type": "text-delta", "textDelta": '{"location": "NYC"}', "path": [0]},
        {"type": "result", "result": {"temp": 70}, "isError": False, "path": [0]},
        {"type": "tool-call-args-text-finish", "path": [0]},
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_assistant_transport_encoder_update_state_shape():
    """Test that update-state chunks preserve operation payload shape."""
    encoder = AssistantTransportEncoder()
    operations = [
        {"type": "append-text", "path": ["messages", "0", "text"], "value": "hi"}
    ]

    async def stream():
        yield UpdateStateChunk(operations=operations)

    collected_output = [line async for line in encoder.encode_stream(stream())]

    assert collected_output[-1] == "data: [DONE]\n\n"
    update_state_payload = json.loads(collected_output[0][6:-2])
    assert update_state_payload == {"type": "update-state", "operations": operations}


@pytest.mark.anyio
async def test_assistant_transport_encoder_canonical_wire_shape():
    """Cross-language wire contract: the encoder emits the canonical
    assistant-transport shape consumed by the TS AssistantTransportDecoder and
    AssistantMessageAccumulator in packages/assistant-stream.

    Every content part is framed by part-start/part-finish at an allocated
    path, streamed text and reasoning flow as text-delta into the open part,
    tool calls open a tool-call part and close with result + part-finish, and
    `data` is wrapped as a list so a dict payload is accepted by the
    accumulator. `update-state` and `error` are already message-level and pass
    through unchanged.
    """
    encoder = AssistantTransportEncoder()

    async def stream():
        yield TextDeltaChunk(text_delta="Hello")
        yield TextDeltaChunk(text_delta=" world")
        yield ReasoningDeltaChunk(reasoning_delta="thinking")
        yield ToolCallBeginChunk(tool_call_id="tool_1", tool_name="get_weather")
        yield ToolCallDeltaChunk(
            tool_call_id="tool_1", args_text_delta='{"location": "NYC"}'
        )
        yield ToolResultChunk(tool_call_id="tool_1", result={"temp": 70})
        yield SourceChunk(id="src_1", url="https://example.com", title="Example")
        yield DataChunk(data={"key": "value"})
        yield UpdateStateChunk(
            operations=[{"type": "set", "path": [], "value": {"a": 1}}]
        )
        yield ErrorChunk(error="boom")

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(stream())
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [
        {"type": "part-start", "part": {"type": "text"}, "path": []},
        {"type": "text-delta", "textDelta": "Hello", "path": [0]},
        {"type": "text-delta", "textDelta": " world", "path": [0]},
        {"type": "part-finish", "path": [0]},
        {"type": "part-start", "part": {"type": "reasoning"}, "path": []},
        {"type": "text-delta", "textDelta": "thinking", "path": [1]},
        {"type": "part-finish", "path": [1]},
        {
            "type": "part-start",
            "part": {
                "type": "tool-call",
                "toolCallId": "tool_1",
                "toolName": "get_weather",
            },
            "path": [],
        },
        {"type": "text-delta", "textDelta": '{"location": "NYC"}', "path": [2]},
        {"type": "result", "result": {"temp": 70}, "isError": False, "path": [2]},
        {"type": "tool-call-args-text-finish", "path": [2]},
        {"type": "part-finish", "path": [2]},
        {
            "type": "part-start",
            "part": {
                "type": "source",
                "sourceType": "url",
                "id": "src_1",
                "url": "https://example.com",
                "title": "Example",
            },
            "path": [],
        },
        {"type": "part-finish", "path": [3]},
        {"type": "data", "data": [{"key": "value"}]},
        {
            "type": "update-state",
            "operations": [{"type": "set", "path": [], "value": {"a": 1}}],
        },
        {"type": "error", "error": "boom"},
    ]


@pytest.mark.anyio
async def test_assistant_transport_encoder_wraps_dict_data():
    """A non-list `data` payload is wrapped in a list so the TS accumulator's
    `...chunk.data` spread no longer breaks (the partial-work case in #5153)."""
    encoder = AssistantTransportEncoder()

    async def stream():
        yield DataChunk(data={"not": "a list"})

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(stream())
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [{"type": "data", "data": [{"not": "a list"}]}]


@pytest.mark.anyio
async def test_assistant_transport_encoder_parallel_tool_calls_interleave():
    """Parallel tool calls keep their own paths: interleaved args deltas route
    by tool_call_id and neither call's args are truncated by the other."""
    encoder = AssistantTransportEncoder()

    async def stream():
        yield ToolCallBeginChunk(tool_call_id="t1", tool_name="alpha")
        yield ToolCallBeginChunk(tool_call_id="t2", tool_name="beta")
        yield ToolCallDeltaChunk(tool_call_id="t1", args_text_delta='{"a":')
        yield ToolCallDeltaChunk(tool_call_id="t2", args_text_delta='{"b":')
        yield ToolCallDeltaChunk(tool_call_id="t1", args_text_delta="1}")
        yield ToolCallDeltaChunk(tool_call_id="t2", args_text_delta="2}")
        yield ToolResultChunk(tool_call_id="t1", result={"r": 1})
        yield ToolResultChunk(tool_call_id="t2", result={"r": 2})

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(stream())
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [
        {
            "type": "part-start",
            "part": {"type": "tool-call", "toolCallId": "t1", "toolName": "alpha"},
            "path": [],
        },
        {
            "type": "part-start",
            "part": {"type": "tool-call", "toolCallId": "t2", "toolName": "beta"},
            "path": [],
        },
        {"type": "text-delta", "textDelta": '{"a":', "path": [0]},
        {"type": "text-delta", "textDelta": '{"b":', "path": [1]},
        {"type": "text-delta", "textDelta": "1}", "path": [0]},
        {"type": "text-delta", "textDelta": "2}", "path": [1]},
        {"type": "result", "result": {"r": 1}, "isError": False, "path": [0]},
        {"type": "tool-call-args-text-finish", "path": [0]},
        {"type": "part-finish", "path": [0]},
        {"type": "result", "result": {"r": 2}, "isError": False, "path": [1]},
        {"type": "tool-call-args-text-finish", "path": [1]},
        {"type": "part-finish", "path": [1]},
    ]


@pytest.mark.anyio
async def test_assistant_transport_encoder_interleaved_text_keeps_tool_args_intact():
    """Text appended while a tool call streams does not disturb the tool part:
    args deltas route by tool_call_id to the tool's own path, and the result
    lands on the same path. Part framing follows chunk arrival order, so only
    routing is pinned here, not cross-part ordering."""
    encoder = AssistantTransportEncoder()

    async def run_callback(controller: RunController):
        tool = await controller.add_tool_call("get_weather", "tool_1")
        controller.append_text("checking")
        tool.append_args_text('{"location": "NYC"}')
        tool.set_response({"temp": 70})

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(create_run(run_callback))
        if line != "data: [DONE]\n\n"
    ]

    tool_paths = [
        c["path"]
        for c in collected
        if c["type"] == "part-start" and c["part"]["type"] == "tool-call"
    ]
    assert len(tool_paths) == 1
    tool_starts = [
        i
        for i, c in enumerate(collected)
        if c["type"] == "part-start" and c["part"]["type"] == "tool-call"
    ]
    # part-start frames carry path [], so the tool's index is the number of
    # part-start frames emitted before its own.
    tool_path = [
        sum(
            1
            for c in collected[: tool_starts[0]]
            if c["type"] == "part-start"
        )
    ]
    assert {
        "type": "text-delta",
        "textDelta": '{"location": "NYC"}',
        "path": tool_path,
    } in collected
    assert {
        "type": "result",
        "result": {"temp": 70},
        "isError": False,
        "path": tool_path,
    } in collected
    text_deltas = [
        c["textDelta"]
        for c in collected
        if c["type"] == "text-delta" and c["path"] != tool_path
    ]
    assert "".join(text_deltas) == "checking"


@pytest.mark.anyio
async def test_assistant_transport_encoder_tool_call_without_result_settles_at_close():
    """A tool call that ends the stream without a result settles like the TS
    controller's dispose path: args-text-finish and part-finish are emitted at
    stream end, so the part renders as a completed call awaiting action rather
    than a perpetually running one."""
    encoder = AssistantTransportEncoder()

    async def stream():
        yield ToolCallBeginChunk(tool_call_id="t1", tool_name="ask_human")
        yield ToolCallDeltaChunk(tool_call_id="t1", args_text_delta='{"q": "ok?"}')

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(stream())
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [
        {
            "type": "part-start",
            "part": {"type": "tool-call", "toolCallId": "t1", "toolName": "ask_human"},
            "path": [],
        },
        {"type": "text-delta", "textDelta": '{"q": "ok?"}', "path": [0]},
        {"type": "tool-call-args-text-finish", "path": [0]},
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_assistant_transport_encoder_no_args_tool_call_synthesizes_empty_object():
    """A tool call with no streamed args gets the `{}` fallback the TS
    controller synthesizes before args-text-finish."""
    encoder = AssistantTransportEncoder()

    async def stream():
        yield ToolCallBeginChunk(tool_call_id="t1", tool_name="noop")

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(stream())
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [
        {
            "type": "part-start",
            "part": {"type": "tool-call", "toolCallId": "t1", "toolName": "noop"},
            "path": [],
        },
        {"type": "text-delta", "textDelta": "{}", "path": [0]},
        {"type": "tool-call-args-text-finish", "path": [0]},
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_assistant_transport_encoder_duplicate_begin_is_dropped():
    """A second tool-call-begin for a still-open call is dropped instead of
    opening a duplicate part; the original part keeps its deltas and result."""
    encoder = AssistantTransportEncoder()

    async def stream():
        yield ToolCallBeginChunk(tool_call_id="t1", tool_name="alpha")
        yield ToolCallBeginChunk(tool_call_id="t1", tool_name="alpha")
        yield ToolCallDeltaChunk(tool_call_id="t1", args_text_delta="{}")
        yield ToolResultChunk(tool_call_id="t1", result="ok")

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(stream())
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [
        {
            "type": "part-start",
            "part": {"type": "tool-call", "toolCallId": "t1", "toolName": "alpha"},
            "path": [],
        },
        {"type": "text-delta", "textDelta": "{}", "path": [0]},
        {"type": "result", "result": "ok", "isError": False, "path": [0]},
        {"type": "tool-call-args-text-finish", "path": [0]},
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_assistant_transport_encoder_file_canonical_wire_shape():
    """`file` rides `part-start`/`part-finish` like `source`: the TS accumulator
    builds a `FilePart` from a `part-start` whose init has `type:"file"`, so the
    Python encoder must emit the part with `data`, `mimeType`, and an optional
    `parentId` at an allocated path, then close it."""
    encoder = AssistantTransportEncoder()

    async def stream():
        yield FileChunk(data="aGVsbG8=", mime_type="image/png")

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(stream())
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [
        {
            "type": "part-start",
            "part": {"type": "file", "data": "aGVsbG8=", "mimeType": "image/png"},
            "path": [],
        },
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_assistant_transport_encoder_file_with_parent_id():
    """A `file` chunk with `parent_id` forwards it as `parentId` on the
    part-start, matching the TS `PartInit` file variant."""
    encoder = AssistantTransportEncoder()

    async def stream():
        yield FileChunk(data="x", mime_type="text/plain", parent_id="p1")

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(stream())
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [
        {
            "type": "part-start",
            "part": {
                "type": "file",
                "data": "x",
                "mimeType": "text/plain",
                "parentId": "p1",
            },
            "path": [],
        },
        {"type": "part-finish", "path": [0]},
    ]


@pytest.mark.anyio
async def test_assistant_transport_encoder_file_takes_next_path():
    """A `file` after a streaming text part allocates the next path, so its
    part-finish does not collide with the preceding text part."""
    encoder = AssistantTransportEncoder()

    async def stream():
        yield TextDeltaChunk(text_delta="hi")
        yield FileChunk(data="f", mime_type="image/png")

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(stream())
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [
        {"type": "part-start", "part": {"type": "text"}, "path": []},
        {"type": "text-delta", "textDelta": "hi", "path": [0]},
        {"type": "part-finish", "path": [0]},
        {
            "type": "part-start",
            "part": {"type": "file", "data": "f", "mimeType": "image/png"},
            "path": [],
        },
        {"type": "part-finish", "path": [1]},
    ]


@pytest.mark.anyio
async def test_assistant_transport_encoder_annotations_message_level():
    """`annotations` is a message-level chunk: it passes through with its
    array payload and no `path` (the TS decoder supplies `path: []` for
    message-kind chunks), matching the `KNOWN_CHUNK_TYPES` entry."""
    encoder = AssistantTransportEncoder()

    async def stream():
        yield AnnotationsChunk(annotations=[{"type": "citation", "id": "a1"}])

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(stream())
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [
        {"type": "annotations", "annotations": [{"type": "citation", "id": "a1"}]}
    ]


@pytest.mark.anyio
async def test_assistant_transport_encoder_step_start_message_level():
    """`step-start` is a message-level chunk carrying a camelCase `messageId`
    and no `path`; the TS accumulator appends `{state:"started", messageId}`
    to `metadata.steps`."""
    encoder = AssistantTransportEncoder()

    async def stream():
        yield StepStartChunk(message_id="msg_1")

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(stream())
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [{"type": "step-start", "messageId": "msg_1"}]


@pytest.mark.anyio
async def test_assistant_transport_encoder_step_finish_message_level():
    """`step-finish` is a message-level chunk with camelCase `finishReason`,
    `usage` (`inputTokens`/`outputTokens`), and `isContinued`; the TS
    accumulator transitions the last started step to finished with these
    fields. Snake_case Python fields convert to camelCase at the boundary."""
    encoder = AssistantTransportEncoder()

    async def stream():
        yield StepFinishChunk(
            finish_reason="stop",
            input_tokens=12,
            output_tokens=34,
            is_continued=False,
        )

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(stream())
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [
        {
            "type": "step-finish",
            "finishReason": "stop",
            "usage": {"inputTokens": 12, "outputTokens": 34},
            "isContinued": False,
        }
    ]


@pytest.mark.anyio
async def test_assistant_transport_encoder_step_finish_defaults():
    """A `step-finish` with only a finish reason still emits a complete wire
    frame: usage defaults to zero tokens and isContinued to false, so the TS
    accumulator never sees a missing required field."""
    encoder = AssistantTransportEncoder()

    async def stream():
        yield StepFinishChunk(finish_reason="length")

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(stream())
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [
        {
            "type": "step-finish",
            "finishReason": "length",
            "usage": {"inputTokens": 0, "outputTokens": 0},
            "isContinued": False,
        }
    ]


@pytest.mark.anyio
async def test_assistant_transport_encoder_run_controller_emit_paths():
    """The RunController emit paths (`add_file`, `add_annotations`,
    `add_step_start`, `add_step_finish`) produce the canonical wire frames for
    each new chunk type end-to-end through `create_run`."""
    encoder = AssistantTransportEncoder()

    async def run_callback(controller: RunController):
        controller.add_step_start("msg_1")
        controller.append_text("hello")
        controller.add_annotations([{"type": "citation", "id": "a1"}])
        controller.add_file("aGVsbG8=", "image/png")
        controller.add_step_finish("stop", 12, 34, False)

    collected = [
        json.loads(line[6:-2])
        async for line in encoder.encode_stream(create_run(run_callback))
        if line != "data: [DONE]\n\n"
    ]

    assert collected == [
        {"type": "step-start", "messageId": "msg_1"},
        {"type": "part-start", "part": {"type": "text"}, "path": []},
        {"type": "text-delta", "textDelta": "hello", "path": [0]},
        {"type": "annotations", "annotations": [{"type": "citation", "id": "a1"}]},
        {"type": "part-finish", "path": [0]},
        {
            "type": "part-start",
            "part": {"type": "file", "data": "aGVsbG8=", "mimeType": "image/png"},
            "path": [],
        },
        {"type": "part-finish", "path": [1]},
        {
            "type": "step-finish",
            "finishReason": "stop",
            "usage": {"inputTokens": 12, "outputTokens": 34},
            "isContinued": False,
        },
    ]
