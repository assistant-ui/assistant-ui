"""Regenerates the TS interop fixture consumed by
packages/assistant-stream/src/core/serialization/assistant-transport/AssistantTransport.interop.test.ts.

Run from python/assistant-stream:
    uv run python tests/generate_interop_fixture.py
"""

import asyncio
from pathlib import Path

from assistant_stream.assistant_stream_chunk import (
    AnnotationsChunk,
    DataChunk,
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

FIXTURE_PATH = (
    Path(__file__).resolve().parents[3]
    / "packages"
    / "assistant-stream"
    / "src"
    / "core"
    / "serialization"
    / "assistant-transport"
    / "__fixtures__"
    / "python-encoder.sse"
)

CHUNKS = [
    StepStartChunk(message_id="msg_1"),
    ReasoningDeltaChunk(reasoning_delta="Let me check the weather."),
    TextDeltaChunk(text_delta="Checking"),
    TextDeltaChunk(text_delta=" now."),
    ToolCallBeginChunk(tool_call_id="call_1", tool_name="get_weather"),
    ToolCallDeltaChunk(tool_call_id="call_1", args_text_delta='{"city": '),
    ToolCallDeltaChunk(tool_call_id="call_1", args_text_delta='"NYC"}'),
    UpdateStateChunk(
        operations=[{"type": "set", "path": ["status"], "value": "running"}]
    ),
    ToolResultChunk(tool_call_id="call_1", result={"temp": 70}),
    DataChunk(data={"progress": 1}),
    AnnotationsChunk(annotations=[{"type": "citation", "id": "a1"}]),
    SourceChunk(id="s1", url="https://example.com", title="Example"),
    TextDeltaChunk(text_delta="It is sunny."),
    FileChunk(data="aGVsbG8=", mime_type="image/png"),
    StepFinishChunk(
        finish_reason="stop",
        input_tokens=12,
        output_tokens=34,
        is_continued=False,
    ),
]


async def main() -> None:
    async def stream():
        for chunk in CHUNKS:
            yield chunk

    encoder = AssistantTransportEncoder()
    lines = [line async for line in encoder.encode_stream(stream())]
    FIXTURE_PATH.write_text("".join(lines))
    print(f"wrote {FIXTURE_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
