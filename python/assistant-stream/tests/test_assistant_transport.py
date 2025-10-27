import pytest
from assistant_stream import create_run, RunController
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
    """Test that reasoning chunks are properly encoded."""
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
            chunk_data = json.loads(json_str)
            collected_chunks.append(chunk_data)

    # Verify we got reasoning-delta chunks with camelCase
    reasoning_chunks = [c for c in collected_chunks if c["type"] == "reasoning-delta"]
    assert len(reasoning_chunks) == 1
    assert reasoning_chunks[0]["reasoningDelta"] == "Thinking..."


@pytest.mark.anyio
async def test_assistant_transport_encoder_media_type():
    """Test that the encoder returns the correct media type."""
    encoder = AssistantTransportEncoder()
    assert encoder.get_media_type() == "text/event-stream"


@pytest.mark.anyio
async def test_assistant_transport_encoder_tool_calls():
    """Test that tool call chunks are properly encoded."""
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
            json_str = line[6:-2]
            chunk_data = json.loads(json_str)
            collected_chunks.append(chunk_data)

    # Verify we got tool-call chunks with camelCase
    tool_begin_chunks = [c for c in collected_chunks if c["type"] == "tool-call-begin"]
    assert len(tool_begin_chunks) == 1
    assert tool_begin_chunks[0]["toolCallId"] == "tool_1"
    assert tool_begin_chunks[0]["toolName"] == "get_weather"

    tool_delta_chunks = [c for c in collected_chunks if c["type"] == "tool-call-delta"]
    assert len(tool_delta_chunks) > 0

    tool_result_chunks = [c for c in collected_chunks if c["type"] == "tool-result"]
    assert len(tool_result_chunks) == 1
    assert tool_result_chunks[0]["toolCallId"] == "tool_1"
