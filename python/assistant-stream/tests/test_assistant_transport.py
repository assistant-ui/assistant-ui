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
