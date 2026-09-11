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
async def test_redis_adapter_uses_atomic_finalize_script() -> None:
    class EvalClient:
        def __init__(self) -> None:
            self.args: tuple[Any, ...] | None = None

        async def eval(self, *args: Any) -> int:
            self.args = args
            return 1

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
    assert client.args is not None
    assert client.args[1] == 2
    assert client.args[2:] == (
        "meta",
        "data:generation",
        "old",
        "new",
        "60",
        "fin",
        "done",
    )
