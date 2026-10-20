"""Regenerates the TS interop fixture consumed by
packages/assistant-stream/src/core/serialization/data-stream/DataStream.interop.test.ts.

Run from python/assistant-stream:
    uv run python tests/generate_data_stream_interop_fixture.py
"""

import asyncio
from pathlib import Path

from assistant_stream.assistant_stream_chunk import (
    AnnotationsChunk,
    DataChunk,
    ErrorChunk,
    FileChunk,
    ReasoningDeltaChunk,
    ReasoningPartStartChunk,
    SourceChunk,
    StepFinishChunk,
    StepStartChunk,
    TextDeltaChunk,
    ToolCallArgsTextFinishChunk,
    ToolCallBeginChunk,
    ToolCallDeltaChunk,
    ToolResultChunk,
    UpdateStateChunk,
)
from assistant_stream.serialization.data_stream import DataStreamEncoder

FIXTURE_PATH = (
    Path(__file__).resolve().parents[3]
    / "packages"
    / "assistant-stream"
    / "src"
    / "core"
    / "serialization"
    / "data-stream"
    / "__fixtures__"
    / "python-encoder.lines"
)

CHUNKS = [
    StepStartChunk(message_id="msg_1"),
    ReasoningPartStartChunk(unstable_summary="Let me check the weather."),
    ReasoningDeltaChunk(reasoning_delta="Let me check the weather."),
    TextDeltaChunk(text_delta="Checking"),
    TextDeltaChunk(text_delta=" now."),
    ToolCallBeginChunk(tool_call_id="call_1", tool_name="get_weather"),
    ToolCallDeltaChunk(tool_call_id="call_1", args_text_delta='{"city": '),
    ToolCallDeltaChunk(tool_call_id="call_1", args_text_delta='"NYC"}'),
    UpdateStateChunk(
        operations=[{"type": "set", "path": ["status"], "value": "running"}]
    ),
    ToolResultChunk(
        tool_call_id="call_1", result={"status": "working"}, is_preliminary=True
    ),
    ToolResultChunk(
        tool_call_id="call_1",
        result={"temp": 70},
        messages=[{"role": "assistant", "content": [{"type": "text", "text": "Sunny"}]}],
    ),
    DataChunk(data={"progress": 1}),
    AnnotationsChunk(annotations=[{"type": "citation", "id": "a1"}]),
    SourceChunk(id="s1", url="https://example.com", title="Example"),
    TextDeltaChunk(text_delta="It is sunny."),
    FileChunk(data="aGVsbG8=", mime_type="image/png"),
    ReasoningPartStartChunk(unstable_summary="Nested", parent_id="parent_1"),
    ReasoningDeltaChunk(reasoning_delta="nested think", parent_id="parent_1"),
    TextDeltaChunk(text_delta="child text", parent_id="parent_1"),
    ToolCallBeginChunk(
        tool_call_id="call_2", tool_name="nested_tool", parent_id="parent_1"
    ),
    ToolCallDeltaChunk(tool_call_id="call_2", args_text_delta="{}"),
    ToolCallArgsTextFinishChunk(tool_call_id="call_2"),
    ToolResultChunk(tool_call_id="call_2", result={"ok": True}),
    SourceChunk(
        id="s2",
        url="https://nested.example",
        title="Nested",
        parent_id="parent_1",
    ),
    FileChunk(data="eQ==", mime_type="text/plain", parent_id="parent_1"),
    StepFinishChunk(
        finish_reason="stop",
        input_tokens=12,
        output_tokens=34,
        is_continued=False,
    ),
    ErrorChunk(error="Forecast delayed", code="weather_delay", severity="warning"),
]


async def main() -> None:
    async def stream():
        for chunk in CHUNKS:
            yield chunk

    encoder = DataStreamEncoder()
    lines = [line async for line in encoder.encode_stream(stream())]
    FIXTURE_PATH.write_bytes("".join(lines).encode("utf-8"))
    print(f"wrote {FIXTURE_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
