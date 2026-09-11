from __future__ import annotations

import asyncio
import json
from typing import Any, Awaitable, Callable

import pytest

from assistant_stream.resumable.errors import ResumableStreamError
from assistant_stream.resumable.stores.redis import (
    RedisResumableStreamStore,
    _RedisAsyncioAdapter,
)


class FakeRedisLikeClient:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.streams: dict[str, list[dict[str, Any]]] = {}
        self.next_stream_id = 0
        self.on_next_get: Callable[[], Awaitable[None]] | None = None

    async def set_nx(self, key: str, value: str, ttl_sec: int) -> bool:
        if key in self.values:
            return False
        self.values[key] = value
        return True

    async def get(self, key: str) -> str | None:
        value = self.values.get(key)
        callback = self.on_next_get
        self.on_next_get = None
        if callback is not None:
            await callback()
        return value

    async def delete(self, keys: list[str]) -> None:
        for key in keys:
            self.values.pop(key, None)
            self.streams.pop(key, None)

    async def xrange(
        self, key: str, start: str, end: str
    ) -> list[dict[str, Any]]:
        entries = self.streams.get(key, [])
        if start == "-":
            return entries.copy()
        after = int(start.removeprefix("(").split("-", 1)[0])
        return [entry for entry in entries if int(entry["id"].split("-", 1)[0]) > after]

    async def pipeline(self, commands: list[dict[str, Any]]) -> None:
        for command in commands:
            if command["type"] == "xAdd":
                await self.xadd(command["key"], command["fields"])
            elif command["type"] != "expire":
                raise AssertionError(
                    f"unhandled pipeline command: {command['type']}"
                )

    async def append_if_unchanged(self, options: dict[str, Any]) -> bool:
        if self.values.get(options["meta_key"]) != options["expected_meta"]:
            return False
        await self.xadd(options["data_key"], options["fields"])
        return True

    async def xadd(self, key: str, fields: dict[str, Any]) -> str:
        self.next_stream_id += 1
        entry_id = f"{self.next_stream_id}-0"
        self.streams.setdefault(key, []).append({"id": entry_id, "fields": fields})
        return entry_id

    async def finalize_if_unchanged(self, options: dict[str, Any]) -> bool:
        if self.values.get(options["meta_key"]) != options["expected_meta"]:
            return False
        await self.xadd(options["data_key"], options["fields"])
        self.values[options["meta_key"]] = options["next_meta"]
        return True

    async def delete_if_unchanged(self, options: dict[str, Any]) -> bool:
        if self.values.get(options["meta_key"]) != options["expected_meta"]:
            return False
        await self.delete([options["meta_key"], *options["data_keys"]])
        return True


@pytest.mark.anyio
async def test_stale_finalizer_cannot_finalize_reacquired_stream() -> None:
    client = FakeRedisLikeClient()
    stale_store = RedisResumableStreamStore(client, key_prefix="test")
    fresh_store = RedisResumableStreamStore(client, key_prefix="test")
    stream_id = "finalize-race"
    meta_key = "test:{finalize-race}:meta"
    await stale_store.acquire(stream_id)

    paused = asyncio.Event()
    resume = asyncio.Event()

    async def pause_after_read() -> None:
        paused.set()
        await resume.wait()

    client.on_next_get = pause_after_read
    finalizing = asyncio.create_task(stale_store.finalize(stream_id, "done"))
    await paused.wait()

    await client.delete([meta_key])
    assert await fresh_store.acquire(stream_id) == "producer"
    await fresh_store.append(stream_id, b"replacement")
    resume.set()
    await finalizing

    assert await fresh_store.status(stream_id) == "streaming"

    with pytest.raises(ResumableStreamError, match="superseded"):
        await stale_store.append(stream_id, b"stale")


@pytest.mark.anyio
async def test_in_flight_append_cannot_mutate_reacquired_stream() -> None:
    client = FakeRedisLikeClient()
    stale_store = RedisResumableStreamStore(client, key_prefix="test")
    fresh_store = RedisResumableStreamStore(client, key_prefix="test")
    stream_id = "append-race"
    meta_key = "test:{append-race}:meta"
    await stale_store.acquire(stream_id)

    paused = asyncio.Event()
    resume = asyncio.Event()

    async def pause_after_read() -> None:
        paused.set()
        await resume.wait()

    client.on_next_get = pause_after_read
    appending = asyncio.create_task(stale_store.append(stream_id, b"stale"))
    await paused.wait()

    await client.delete([meta_key])
    assert await fresh_store.acquire(stream_id) == "producer"
    resume.set()

    with pytest.raises(ResumableStreamError, match="superseded"):
        await appending

    await fresh_store.append(stream_id, b"fresh")
    await fresh_store.finalize(stream_id, "done")
    chunks = [
        entry.chunk
        async for entry in fresh_store.read(stream_id, "", asyncio.Event())
    ]
    assert chunks == [b"fresh"]


@pytest.mark.anyio
async def test_in_flight_delete_cannot_remove_reacquired_stream() -> None:
    client = FakeRedisLikeClient()
    stale_store = RedisResumableStreamStore(client, key_prefix="test")
    fresh_store = RedisResumableStreamStore(client, key_prefix="test")
    stream_id = "delete-race"
    meta_key = "test:{delete-race}:meta"
    await stale_store.acquire(stream_id)
    generation = json.loads(client.values[meta_key])["generation"]
    stale_data_key = f"test:{{delete-race}}:data:{generation}"
    await stale_store.append(stream_id, b"stale")

    paused = asyncio.Event()
    resume = asyncio.Event()

    async def pause_after_read() -> None:
        paused.set()
        await resume.wait()

    client.on_next_get = pause_after_read
    deleting = asyncio.create_task(stale_store.delete(stream_id))
    await paused.wait()

    await client.delete([meta_key])
    assert await fresh_store.acquire(stream_id) == "producer"
    resume.set()
    await asyncio.wait_for(deleting, timeout=1)

    assert await fresh_store.status(stream_id) == "streaming"
    assert stale_data_key not in client.streams
    await stale_store.delete(stream_id)
    assert await fresh_store.status(stream_id) == "missing"


@pytest.mark.anyio
async def test_delete_does_not_clear_same_store_reacquisition() -> None:
    client = FakeRedisLikeClient()
    store = RedisResumableStreamStore(client, key_prefix="test")
    stream_id = "same-store-delete-race"
    meta_key = "test:{same-store-delete-race}:meta"
    await store.acquire(stream_id)
    await store.append(stream_id, b"stale")

    await client.delete([meta_key])
    paused = asyncio.Event()
    resume = asyncio.Event()

    async def pause_after_read() -> None:
        paused.set()
        await resume.wait()

    client.on_next_get = pause_after_read
    deleting = asyncio.create_task(store.delete(stream_id))
    await paused.wait()

    assert await store.acquire(stream_id) == "producer"
    await store.append(stream_id, b"fresh")
    resume.set()
    await asyncio.wait_for(deleting, timeout=1)
    await store.finalize(stream_id, "done")

    chunks = [
        entry.chunk async for entry in store.read(stream_id, "", asyncio.Event())
    ]
    assert chunks == [b"fresh"]


@pytest.mark.anyio
async def test_new_acquisition_preserves_legacy_data_without_replaying_it() -> None:
    client = FakeRedisLikeClient()
    legacy_key = "test:{reused}:data"
    client.streams[legacy_key] = [{"id": "1-0", "fields": {"c": b"legacy"}}]
    store = RedisResumableStreamStore(client, key_prefix="test")

    assert await store.acquire("reused") == "producer"
    await store.append("reused", b"fresh")
    await store.finalize("reused", "done")

    chunks = [
        entry.chunk async for entry in store.read("reused", "", asyncio.Event())
    ]
    assert chunks == [b"fresh"]
    assert client.streams[legacy_key] == [{"id": "1-0", "fields": {"c": b"legacy"}}]


@pytest.mark.anyio
async def test_legacy_metadata_and_data_remain_readable() -> None:
    client = FakeRedisLikeClient()
    client.values["test:{legacy}:meta"] = json.dumps(
        {"status": "streaming", "ttlSec": 60}
    )
    store = RedisResumableStreamStore(client, key_prefix="test")

    await store.append("legacy", b"legacy")
    await store.finalize("legacy", "done")

    chunks = [
        entry.chunk async for entry in store.read("legacy", "", asyncio.Event())
    ]
    assert chunks == [b"legacy"]


@pytest.mark.anyio
async def test_redis_adapter_uses_registered_finalize_script() -> None:
    class EvalClient:
        def __init__(self) -> None:
            self.calls: list[tuple[str, list[str], list[Any]]] = []

        def register_script(self, script: str) -> Callable[..., Awaitable[int]]:
            async def execute(*, keys: list[str], args: list[Any]) -> int:
                self.calls.append((script, keys, args))
                return 1

            return execute

    client = EvalClient()
    adapter = _RedisAsyncioAdapter(client)
    assert await adapter.finalize_if_unchanged(
        {
            "meta_key": "meta",
            "expected_meta": "old",
            "next_meta": "new",
            "data_key": "data:generation",
            "fields": {"fin": "done"},
            "ttl_sec": 60,
        }
    )
    assert len(client.calls) == 1
    _, keys, args = client.calls[0]
    assert keys == ["meta", "data:generation"]
    assert args == [
        "old",
        "new",
        "60",
        "fin",
        "done",
    ]
