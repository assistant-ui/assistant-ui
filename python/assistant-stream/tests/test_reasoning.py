import asyncio
import pytest
from assistant_stream import create_run, RunController


@pytest.mark.asyncio
async def test_append_reasoning():
    """Test that append_reasoning works correctly."""
    reasoning_chunks = []

    async def collect_chunks(chunks):
        async for chunk in chunks:
            if chunk.type == "reasoning-delta":
                reasoning_chunks.append(chunk)

    async def run_callback(controller: RunController):
        controller.append_reasoning("This is ")
        controller.append_reasoning("reasoning content")

    # Create the run and collect chunks
    chunks = create_run(run_callback)
    await collect_chunks(chunks)

    # Verify the reasoning chunks
    assert len(reasoning_chunks) == 2
    assert reasoning_chunks[0].reasoning_delta == "This is "
    assert reasoning_chunks[1].reasoning_delta == "reasoning content"


@pytest.mark.asyncio
async def test_mixed_text_and_reasoning():
    """Test that append_text and append_reasoning can be used together."""
    collected_chunks = []

    async def collect_chunks(chunks):
        async for chunk in chunks:
            if chunk.type in ["text-delta", "reasoning-delta"]:
                collected_chunks.append(chunk)

    async def run_callback(controller: RunController):
        controller.append_text("This is text")
        controller.append_reasoning("This is reasoning")
        controller.append_text("More text")
        controller.append_reasoning("More reasoning")

    # Create the run and collect chunks
    chunks = create_run(run_callback)
    await collect_chunks(chunks)

    # Verify the chunks
    assert len(collected_chunks) == 4
    assert collected_chunks[0].type == "text-delta"
    assert collected_chunks[0].text_delta == "This is text"
    assert collected_chunks[1].type == "reasoning-delta"
    assert collected_chunks[1].reasoning_delta == "This is reasoning"
    assert collected_chunks[2].type == "text-delta"
    assert collected_chunks[2].text_delta == "More text"
    assert collected_chunks[3].type == "reasoning-delta"
    assert collected_chunks[3].reasoning_delta == "More reasoning"
