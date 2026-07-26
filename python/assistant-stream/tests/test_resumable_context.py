from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

import pytest

from assistant_stream.resumable import (
    ResumableStreamError,
    create_in_memory_resumable_stream_store,
    create_resumable_stream_context,
)


def _bytes(s: str) -> bytes:
    return s.encode("utf-8")


async def _collect(stream: AsyncIterator[bytes]) -> str:
    out = bytearray()
    async for chunk in stream:
        out.extend(chunk)
    return out.decode("utf-8")


def _make_string_stream(parts: list[str]) -> AsyncIterator[bytes]:
    async def gen() -> AsyncIterator[bytes]:
        for part in parts:
            yield _bytes(part)
            await asyncio.sleep(0)

    return gen()


@pytest.mark.anyio
async def test_producer_receives_full_byte_stream() -> None:
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store()
    )
    stream = await ctx.run("a", lambda: _make_string_stream(["hello ", "world"]))
    assert await _collect(stream) == "hello world"


@pytest.mark.anyio
async def test_second_caller_is_consumer_with_identical_bytes() -> None:
    store = create_in_memory_resumable_stream_store()
    ctx = create_resumable_stream_context(store=store)
    make_stream_calls = 0

    def make_producer() -> AsyncIterator[bytes]:
        nonlocal make_stream_calls
        make_stream_calls += 1
        return _make_string_stream(["one ", "two ", "three"])

    def make_unused() -> AsyncIterator[bytes]:
        nonlocal make_stream_calls
        make_stream_calls += 1
        return _make_string_stream(["should-not-run"])

    producer_stream = await ctx.run("a", make_producer)
    consumer_stream = await ctx.run("a", make_unused)

    a, b = await asyncio.gather(
        _collect(producer_stream), _collect(consumer_stream)
    )
    assert a == "one two three"
    assert b == "one two three"
    assert make_stream_calls == 1


@pytest.mark.anyio
async def test_late_consumer_after_done_replays_via_resume() -> None:
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store()
    )
    producer = await ctx.run(
        "a", lambda: _make_string_stream(["alpha", "beta", "gamma"])
    )
    assert await _collect(producer) == "alphabetagamma"

    replay = await ctx.resume("a")
    assert replay is not None
    assert await _collect(replay) == "alphabetagamma"


@pytest.mark.anyio
async def test_resume_returns_none_for_missing() -> None:
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store()
    )
    assert await ctx.resume("nope") is None


@pytest.mark.anyio
async def test_require_resume_raises_missing() -> None:
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store()
    )
    with pytest.raises(ResumableStreamError) as exc:
        await ctx.require_resume("nope")
    assert exc.value.code == "missing"


@pytest.mark.anyio
async def test_require_resume_returns_replay_when_exists() -> None:
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store()
    )
    producer = await ctx.run("a", lambda: _make_string_stream(["hi"]))
    assert await _collect(producer) == "hi"

    replay = await ctx.require_resume("a")
    assert await _collect(replay) == "hi"


@pytest.mark.anyio
async def test_status_tracks_lifecycle() -> None:
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store()
    )
    assert await ctx.status("a") == "missing"
    stream = await ctx.run("a", lambda: _make_string_stream(["x"]))
    await _collect(stream)
    assert await ctx.status("a") == "done"


@pytest.mark.anyio
async def test_delete_removes_stream_state() -> None:
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store()
    )
    stream = await ctx.run("a", lambda: _make_string_stream(["x"]))
    await _collect(stream)
    assert await ctx.status("a") == "done"
    await ctx.delete("a")
    assert await ctx.status("a") == "missing"


@pytest.mark.anyio
async def test_producer_keeps_writing_after_consumer_closes_early() -> None:
    store = create_in_memory_resumable_stream_store()
    ctx = create_resumable_stream_context(store=store)

    producer_emitted = 0

    async def slow_stream() -> AsyncIterator[bytes]:
        nonlocal producer_emitted
        for i in range(5):
            await asyncio.sleep(0.01)
            yield _bytes(f"chunk{i};")
            producer_emitted += 1

    stream = await ctx.run("a", lambda: slow_stream())
    first = await anext(stream)
    assert first == _bytes("chunk0;")
    await stream.aclose()

    while producer_emitted < 5:
        await asyncio.sleep(0.01)
    while await ctx.status("a") == "streaming":
        await asyncio.sleep(0.01)

    replay = await ctx.resume("a")
    assert replay is not None
    assert await _collect(replay) == "chunk0;chunk1;chunk2;chunk3;chunk4;"


@pytest.mark.anyio
async def test_propagates_producer_errors_to_consumers() -> None:
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store()
    )

    async def failing() -> AsyncIterator[bytes]:
        yield _bytes("partial;")
        raise Exception("oops")

    stream = await ctx.run("a", lambda: failing())
    with pytest.raises(Exception, match="oops"):
        await _collect(stream)
    assert await ctx.status("a") == "error"


@pytest.mark.anyio
async def test_wait_until_receives_the_task() -> None:
    tasks: list[asyncio.Task[None]] = []
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store(),
        wait_until=lambda t: tasks.append(t),
    )
    stream = await ctx.run("a", lambda: _make_string_stream(["x"]))
    assert await _collect(stream) == "x"
    assert len(tasks) == 1
    await asyncio.gather(*tasks)


@pytest.mark.anyio
async def test_on_acquire_fires_for_producer_and_consumer() -> None:
    calls: list[dict[str, str]] = []
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store(),
        on_acquire=lambda id, role: calls.append({"id": id, "role": role}),
    )
    producer = await ctx.run("a", lambda: _make_string_stream(["x"]))
    consumer = await ctx.run("a", lambda: _make_string_stream(["unused"]))
    await asyncio.gather(_collect(producer), _collect(consumer))
    assert calls == [
        {"id": "a", "role": "producer"},
        {"id": "a", "role": "consumer"},
    ]


@pytest.mark.anyio
async def test_on_append_fires_per_chunk_with_byte_length() -> None:
    calls: list[dict[str, object]] = []
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store(),
        on_append=lambda id, n: calls.append({"id": id, "byteLength": n}),
    )
    stream = await ctx.run("a", lambda: _make_string_stream(["ab", "cde"]))
    assert await _collect(stream) == "abcde"
    assert calls == [
        {"id": "a", "byteLength": 2},
        {"id": "a", "byteLength": 3},
    ]


@pytest.mark.anyio
async def test_on_finalize_fires_on_success() -> None:
    calls: list[dict[str, object]] = []
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store(),
        on_finalize=lambda id, status, error: calls.append(
            {"id": id, "status": status, "error": error}
        ),
    )
    stream = await ctx.run("a", lambda: _make_string_stream(["x"]))
    await _collect(stream)
    assert calls == [{"id": "a", "status": "done", "error": None}]


@pytest.mark.anyio
async def test_on_finalize_and_on_error_fire_on_failure() -> None:
    finalize_calls: list[dict[str, object]] = []
    errors: list[dict[str, object]] = []
    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store(),
        on_finalize=lambda id, status, error: finalize_calls.append(
            {"id": id, "status": status, "error": error}
        ),
        on_error=lambda id, error: errors.append({"id": id, "error": error}),
    )

    async def failing() -> AsyncIterator[bytes]:
        raise Exception("boom")
        yield b""  # pragma: no cover

    stream = await ctx.run("a", lambda: failing())
    with pytest.raises(Exception, match="boom"):
        await _collect(stream)
    assert finalize_calls == [{"id": "a", "status": "error", "error": "boom"}]
    assert len(errors) == 1
    assert errors[0]["id"] == "a"
    assert str(errors[0]["error"]) == "boom"


@pytest.mark.anyio
async def test_raising_on_acquire_does_not_break_producer_pipeline() -> None:
    def boom_acquire(_id: str, _role: str) -> None:
        raise RuntimeError("hook-acquire-boom")

    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store(),
        on_acquire=boom_acquire,
    )
    stream = await ctx.run("a", lambda: _make_string_stream(["hello ", "world"]))
    assert await _collect(stream) == "hello world"
    assert await ctx.status("a") == "done"


@pytest.mark.anyio
async def test_raising_on_error_still_finalizes_error_status() -> None:
    def boom_error(_id: str, _err: object) -> None:
        raise RuntimeError("hook-error-boom")

    ctx = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store(),
        on_error=boom_error,
    )

    async def failing() -> AsyncIterator[bytes]:
        yield _bytes("partial;")
        raise Exception("producer-failed")

    stream = await ctx.run("a", lambda: failing())
    with pytest.raises(Exception, match="producer-failed"):
        await _collect(stream)
    assert await ctx.status("a") == "error"
