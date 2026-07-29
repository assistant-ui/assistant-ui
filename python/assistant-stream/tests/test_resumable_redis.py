from __future__ import annotations

import asyncio
import os
import time
import uuid

import pytest

REDIS_URL = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379")
REDIS_TESTS_DISABLED = (
    os.environ.get("REDIS_URL") is None and os.environ.get("REDIS_TESTS") != "1"
)

pytestmark = pytest.mark.skipif(
    REDIS_TESTS_DISABLED,
    reason="set REDIS_URL or REDIS_TESTS=1 to run redis adapter tests",
)


def _bytes(s: str) -> bytes:
    return s.encode("utf-8")


def _decode(chunk: bytes) -> str:
    return chunk.decode("utf-8")


@pytest.fixture
async def redis_store():
    import redis.asyncio as redis

    from assistant_stream.resumable import create_redis_resumable_stream_store

    client = redis.from_url(REDIS_URL)
    key_prefix = f"aui:resumable:test:{int(time.time() * 1000)}:{uuid.uuid4().hex[:8]}"
    store = create_redis_resumable_stream_store(
        client,
        key_prefix=key_prefix,
        poll_interval_ms=25,
    )
    try:
        yield store, client, key_prefix
    finally:
        keys = [key async for key in client.scan_iter(match=f"{key_prefix}:*")]
        if keys:
            await client.delete(*keys)
        await client.aclose()


@pytest.mark.anyio
async def test_elects_exactly_one_producer(redis_store) -> None:
    store, _, _ = redis_store
    stream_id = f"id-{uuid.uuid4().hex}"
    first = await store.acquire(stream_id)
    second = await store.acquire(stream_id)
    assert first == "producer"
    assert second == "consumer"


@pytest.mark.anyio
async def test_replays_buffered_and_tails_until_done(redis_store) -> None:
    store, _, _ = redis_store
    stream_id = f"id-{uuid.uuid4().hex}"
    await store.acquire(stream_id)
    await store.append(stream_id, _bytes("hello"))
    await store.append(stream_id, _bytes(" world"))

    signal = asyncio.Event()
    collected: list[str] = []

    async def reading() -> None:
        async for entry in store.read(stream_id, "", signal):
            collected.append(_decode(entry.chunk))
            if len(collected) == 3:
                await store.finalize(stream_id, "done")

    task = asyncio.create_task(reading())
    await asyncio.sleep(0.05)
    await store.append(stream_id, _bytes("!"))
    await task
    assert "".join(collected) == "hello world!"


@pytest.mark.anyio
async def test_error_finalize_raises_after_draining(redis_store) -> None:
    store, _, _ = redis_store
    stream_id = f"id-{uuid.uuid4().hex}"
    await store.acquire(stream_id)
    await store.append(stream_id, _bytes("partial"))
    await store.finalize(stream_id, "error", "boom")

    signal = asyncio.Event()
    seen: list[str] = []
    with pytest.raises(Exception, match="boom"):
        async for entry in store.read(stream_id, "", signal):
            seen.append(_decode(entry.chunk))
    assert seen == ["partial"]


@pytest.mark.anyio
async def test_cursor_skip(redis_store) -> None:
    store, _, _ = redis_store
    stream_id = f"id-{uuid.uuid4().hex}"
    await store.acquire(stream_id)
    await store.append(stream_id, _bytes("1"))
    await store.append(stream_id, _bytes("2"))
    await store.append(stream_id, _bytes("3"))
    await store.finalize(stream_id, "done")

    signal = asyncio.Event()
    seen: list[tuple[str, str]] = []
    async for entry in store.read(stream_id, "", signal):
        seen.append((entry.cursor, _decode(entry.chunk)))
    assert [t for _, t in seen] == ["1", "2", "3"]

    out: list[str] = []
    async for entry in store.read(stream_id, seen[0][0], signal):
        out.append(_decode(entry.chunk))
    assert out == ["2", "3"]


@pytest.mark.anyio
async def test_delete_removes_stream(redis_store) -> None:
    store, _, _ = redis_store
    stream_id = f"id-{uuid.uuid4().hex}"
    await store.acquire(stream_id)
    await store.append(stream_id, _bytes("x"))
    assert await store.status(stream_id) == "streaming"
    await store.delete(stream_id)
    assert await store.status(stream_id) == "missing"


@pytest.mark.anyio
async def test_binary_round_trip_0_to_255(redis_store) -> None:
    store, _, _ = redis_store
    stream_id = f"id-{uuid.uuid4().hex}"
    await store.acquire(stream_id)

    producer = bytes(i & 0xFF for i in range(512))
    half = len(producer) // 2
    await store.append(stream_id, producer[:half])
    await store.append(stream_id, producer[half:])
    await store.finalize(stream_id, "done")

    signal = asyncio.Event()
    replayed = bytearray()
    async for entry in store.read(stream_id, "", signal):
        replayed.extend(entry.chunk)
    assert bytes(replayed) == producer


@pytest.mark.anyio
async def test_decode_responses_true_is_rejected() -> None:
    import redis.asyncio as redis

    from assistant_stream.resumable import create_redis_resumable_stream_store

    client = redis.from_url(REDIS_URL, decode_responses=True)
    try:
        with pytest.raises(ValueError, match="decode_responses"):
            create_redis_resumable_stream_store(client)
    finally:
        await client.aclose()
