from __future__ import annotations

import asyncio

import pytest

from assistant_stream.resumable import (
    ResumableStreamError,
    create_in_memory_resumable_stream_store,
)
from assistant_stream.resumable.types import ResumableStreamEntry


def _bytes(s: str) -> bytes:
    return s.encode("utf-8")


def _decode(chunk: bytes) -> str:
    return chunk.decode("utf-8")


async def _drain(iter_) -> list[str]:
    out: list[str] = []
    async for entry in iter_:
        out.append(_decode(entry.chunk))
    return out


@pytest.mark.anyio
async def test_elects_exactly_one_producer_per_stream_id() -> None:
    store = create_in_memory_resumable_stream_store()
    first = await store.acquire("a")
    second = await store.acquire("a")
    third = await store.acquire("a")
    assert first == "producer"
    assert second == "consumer"
    assert third == "consumer"


@pytest.mark.anyio
async def test_stream_id_with_trailing_newline_is_invalid() -> None:
    store = create_in_memory_resumable_stream_store()
    with pytest.raises(ResumableStreamError) as exc:
        await store.acquire("valid-id\n")
    assert exc.value.code == "invalid-id"


@pytest.mark.anyio
async def test_post_finalize_acquire_is_consumer() -> None:
    store = create_in_memory_resumable_stream_store()
    assert await store.acquire("a") == "producer"
    await store.finalize("a", "done")
    assert await store.acquire("a") == "consumer"


@pytest.mark.anyio
async def test_isolates_streams_by_id() -> None:
    store = create_in_memory_resumable_stream_store()
    assert await store.acquire("a") == "producer"
    assert await store.acquire("b") == "producer"


@pytest.mark.anyio
async def test_replays_buffered_entries_and_tails_until_finalize() -> None:
    store = create_in_memory_resumable_stream_store()
    await store.acquire("a")
    await store.append("a", _bytes("hello "))
    await store.append("a", _bytes("world"))

    signal = asyncio.Event()
    collected: list[str] = []

    async def reading() -> None:
        async for entry in store.read("a", "", signal):
            collected.append(_decode(entry.chunk))
            if len(collected) == 3:
                await store.finalize("a", "done")

    task = asyncio.create_task(reading())
    await store.append("a", _bytes("!"))
    await task
    assert collected == ["hello ", "world", "!"]


@pytest.mark.anyio
async def test_status_transitions_missing_streaming_done() -> None:
    store = create_in_memory_resumable_stream_store()
    assert await store.status("a") == "missing"
    await store.acquire("a")
    assert await store.status("a") == "streaming"
    await store.finalize("a", "done")
    assert await store.status("a") == "done"


@pytest.mark.anyio
async def test_status_reports_error_after_error_finalize() -> None:
    store = create_in_memory_resumable_stream_store()
    await store.acquire("a")
    await store.finalize("a", "error", "boom")
    assert await store.status("a") == "error"


@pytest.mark.anyio
async def test_read_throws_after_error_finalize_after_draining() -> None:
    store = create_in_memory_resumable_stream_store()
    await store.acquire("a")
    await store.append("a", _bytes("partial"))
    await store.finalize("a", "error", "boom")

    signal = asyncio.Event()
    seen: list[str] = []
    with pytest.raises(Exception, match="boom"):
        async for entry in store.read("a", "", signal):
            seen.append(_decode(entry.chunk))
    assert seen == ["partial"]


@pytest.mark.anyio
async def test_late_consumer_after_done_replays_everything() -> None:
    store = create_in_memory_resumable_stream_store()
    await store.acquire("a")
    await store.append("a", _bytes("a"))
    await store.append("a", _bytes("b"))
    await store.append("a", _bytes("c"))
    await store.finalize("a", "done")

    signal = asyncio.Event()
    assert await _drain(store.read("a", "", signal)) == ["a", "b", "c"]


@pytest.mark.anyio
async def test_cursor_advances_and_skips_already_seen() -> None:
    store = create_in_memory_resumable_stream_store()
    await store.acquire("a")
    await store.append("a", _bytes("1"))
    await store.append("a", _bytes("2"))
    await store.append("a", _bytes("3"))
    await store.finalize("a", "done")

    signal = asyncio.Event()
    seen: list[ResumableStreamEntry] = []
    async for entry in store.read("a", "", signal):
        seen.append(entry)
    assert [_decode(s.chunk) for s in seen] == ["1", "2", "3"]

    after_first = seen[0].cursor
    assert await _drain(store.read("a", after_first, signal)) == ["2", "3"]


@pytest.mark.anyio
async def test_signal_set_terminates_read_without_raising() -> None:
    store = create_in_memory_resumable_stream_store()
    await store.acquire("a")
    signal = asyncio.Event()
    collected: list[str] = []

    async def reading() -> None:
        async for entry in store.read("a", "", signal):
            collected.append(_decode(entry.chunk))

    task = asyncio.create_task(reading())
    await store.append("a", _bytes("x"))
    await asyncio.sleep(0.01)
    signal.set()
    await task
    assert collected == ["x"]


@pytest.mark.anyio
async def test_multiple_consumers_read_concurrently() -> None:
    store = create_in_memory_resumable_stream_store()
    await store.acquire("a")
    signal = asyncio.Event()
    a = asyncio.create_task(_drain(store.read("a", "", signal)))
    b = asyncio.create_task(_drain(store.read("a", "", signal)))
    await store.append("a", _bytes("x"))
    await store.append("a", _bytes("y"))
    await store.finalize("a", "done")
    assert await a == ["x", "y"]
    assert await b == ["x", "y"]


@pytest.mark.anyio
async def test_delete_ends_in_flight_reads_and_status_missing() -> None:
    store = create_in_memory_resumable_stream_store()
    await store.acquire("a")
    signal = asyncio.Event()
    reading = asyncio.create_task(_drain(store.read("a", "", signal)))
    await store.append("a", _bytes("x"))
    await asyncio.sleep(0)
    await store.delete("a")
    assert await reading == ["x"]
    assert await store.status("a") == "missing"


@pytest.mark.anyio
async def test_expired_streams_evicted_on_next_access() -> None:
    now = 1_000.0

    def clock() -> float:
        return now

    store = create_in_memory_resumable_stream_store(default_ttl_ms=100, now=clock)
    await store.acquire("a")
    await store.append("a", _bytes("hi"))
    assert await store.status("a") == "streaming"
    now += 200
    assert await store.status("a") == "missing"


@pytest.mark.anyio
async def test_appending_refreshes_ttl() -> None:
    now = 1_000.0

    def clock() -> float:
        return now

    store = create_in_memory_resumable_stream_store(default_ttl_ms=100, now=clock)
    await store.acquire("a")
    now += 80
    await store.append("a", _bytes("x"))
    now += 80
    assert await store.status("a") == "streaming"


@pytest.mark.anyio
async def test_rejects_append_on_finalized_stream() -> None:
    store = create_in_memory_resumable_stream_store()
    await store.acquire("a")
    await store.finalize("a", "done")
    with pytest.raises(ResumableStreamError, match="already finalized") as exc:
        await store.append("a", _bytes("late"))
    assert exc.value.code == "finalized"


@pytest.mark.anyio
async def test_rejects_append_on_missing_stream() -> None:
    store = create_in_memory_resumable_stream_store()
    with pytest.raises(Exception, match="Stream not found"):
        await store.append("a", _bytes("x"))


@pytest.mark.anyio
async def test_finalize_is_idempotent() -> None:
    store = create_in_memory_resumable_stream_store()
    await store.acquire("a")
    await store.finalize("a", "done")
    await store.finalize("a", "done")
    assert await store.status("a") == "done"


@pytest.mark.anyio
async def test_rejects_append_when_chunk_exceeds_max_chunk_bytes() -> None:
    store = create_in_memory_resumable_stream_store(max_chunk_bytes=4)
    await store.acquire("a")
    with pytest.raises(Exception, match="Chunk exceeds maxChunkBytes: 5"):
        await store.append("a", _bytes("hello"))
    await store.append("a", _bytes("ok"))
    assert await store.status("a") == "streaming"


@pytest.mark.anyio
async def test_rejects_append_when_stream_reaches_max_entries() -> None:
    store = create_in_memory_resumable_stream_store(max_entries_per_stream=2)
    await store.acquire("a")
    await store.append("a", _bytes("1"))
    await store.append("a", _bytes("2"))
    with pytest.raises(Exception, match="Stream exceeded maxEntriesPerStream: a"):
        await store.append("a", _bytes("3"))


@pytest.mark.anyio
async def test_rejects_acquire_when_max_streams_exceeded() -> None:
    store = create_in_memory_resumable_stream_store(max_streams=2)
    await store.acquire("a")
    await store.acquire("b")
    with pytest.raises(Exception, match="maxStreams exceeded"):
        await store.acquire("c")
    assert await store.acquire("a") == "consumer"


@pytest.mark.anyio
async def test_gc_sweeper_evicts_expired_streams() -> None:
    now = 1_000.0

    def clock() -> float:
        return now

    store = create_in_memory_resumable_stream_store(
        default_ttl_ms=100,
        gc_interval_ms=50,
        now=clock,
    )
    await store.acquire("a")
    await store.append("a", _bytes("hi"))
    now += 200
    await asyncio.sleep(0.08)
    assert await store.status("a") == "missing"
    store.dispose()


@pytest.mark.anyio
async def test_dispose_clears_gc_and_is_noop_without_gc() -> None:
    store = create_in_memory_resumable_stream_store(gc_interval_ms=50)
    await store.acquire("a")
    store.dispose()
    store2 = create_in_memory_resumable_stream_store()
    store2.dispose()
