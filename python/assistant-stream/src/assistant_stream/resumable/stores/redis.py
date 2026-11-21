from __future__ import annotations

import asyncio
import json
import math
import uuid
from collections.abc import AsyncIterator
from contextlib import suppress
from typing import Any, Literal, Protocol

from assistant_stream.resumable.errors import (
    DEFAULT_TTL_MS,
    ResumableStreamError,
    validate_stream_id,
)
from assistant_stream.resumable.types import (
    CancellationSignal,
    ResumableStreamAcquisition,
    ResumableStreamEntry,
    ResumableStreamLease,
    ResumableStreamRole,
    ResumableStreamStatus,
)

DEFAULT_POLL_INTERVAL_MS = 100
DEFAULT_KEY_PREFIX = "aui:resumable"

FIELD_CHUNK = "c"
FIELD_FIN = "fin"
FIELD_ERROR = "error"

FIN_DONE = "done"
FIN_ERROR = "error"

STREAM_START_ID = "0-0"

# `XADD *` is non-deterministic; Redis 5.x and 6.x configured with
# `lua-replicate-commands no` reject it unless effects replication is requested.
FINALIZE_IF_UNCHANGED_SCRIPT = """
redis.replicate_commands()
if redis.call("GET", KEYS[1]) ~= ARGV[1] then
  return 0
end
local xadd = { "XADD", KEYS[2], "*" }
for i = 4, #ARGV do
  table.insert(xadd, ARGV[i])
end
redis.call(unpack(xadd))
redis.call("EXPIRE", KEYS[2], ARGV[3])
redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[3])
return 1
"""

FINALIZE_IF_UNCHANGED_KEY_COUNT = 2

APPEND_IF_UNCHANGED_SCRIPT = """
redis.replicate_commands()
if redis.call("GET", KEYS[1]) ~= ARGV[1] then
  return 0
end
local xadd = { "XADD", KEYS[2], "*" }
for i = 3, #ARGV do
  table.insert(xadd, ARGV[i])
end
redis.call(unpack(xadd))
redis.call("EXPIRE", KEYS[2], ARGV[2])
redis.call("EXPIRE", KEYS[1], ARGV[2])
return 1
"""

APPEND_IF_UNCHANGED_KEY_COUNT = 2

DELETE_IF_UNCHANGED_SCRIPT = """
if redis.call("GET", KEYS[1]) ~= ARGV[1] then
  return 0
end
redis.call("DEL", unpack(KEYS))
return 1
"""


class RedisLikeClient(Protocol):
    """Clients may also implement append_if_unchanged and delete_if_unchanged; without them, appends and deletes skip the metadata compare."""

    async def set_nx(self, key: str, value: str, ttl_sec: int) -> bool: ...

    async def get(self, key: str) -> str | None: ...

    async def delete(self, keys: list[str]) -> None: ...

    async def xrange(
        self, key: str, start: str, end: str
    ) -> list[dict[str, Any]]: ...

    async def pipeline(self, commands: list[dict[str, Any]]) -> None: ...

    async def finalize_if_unchanged(self, options: dict[str, Any]) -> bool: ...


class RedisResumableStreamStore:
    def __init__(
        self,
        client: RedisLikeClient,
        *,
        key_prefix: str = DEFAULT_KEY_PREFIX,
        default_ttl_ms: int = DEFAULT_TTL_MS,
        poll_interval_ms: int = DEFAULT_POLL_INTERVAL_MS,
        max_chunk_bytes: int | None = None,
    ) -> None:
        self._client = client
        self._key_prefix = key_prefix
        self._default_ttl_ms = default_ttl_ms
        self._poll_interval_ms = poll_interval_ms
        self._max_chunk_bytes = max_chunk_bytes
        self._acquired_generations: dict[str, str] = {}

    def _meta_key(self, stream_id: str) -> str:
        return f"{self._key_prefix}:{{{stream_id}}}:meta"

    def _data_key(self, stream_id: str, generation: str | None = None) -> str:
        base = f"{self._key_prefix}:{{{stream_id}}}:data"
        return f"{base}:{generation}" if generation else base

    def _ttl_sec(self, meta: dict[str, Any]) -> int:
        ttl_sec = meta.get("ttlSec")
        if isinstance(ttl_sec, int):
            return ttl_sec
        return _ms_to_sec(self._default_ttl_ms)

    def _is_superseded_generation(
        self,
        stream_id: str,
        meta: dict[str, Any],
        lease: ResumableStreamLease | None = None,
    ) -> bool:
        if lease is not None:
            return meta.get("generation") != lease.token
        acquired = self._acquired_generations.get(stream_id)
        return acquired is not None and meta.get("generation") != acquired

    def _assert_writable(
        self,
        stream_id: str,
        meta: dict[str, Any],
        lease: ResumableStreamLease | None,
    ) -> None:
        if self._is_superseded_generation(stream_id, meta, lease):
            raise ResumableStreamError(
                "missing", f"Stream superseded by a new acquisition: {stream_id}"
            )
        if meta.get("status") != "streaming":
            raise ResumableStreamError(
                "finalized", f"Stream already finalized: {stream_id}"
            )

    def _clear_acquired_generation(
        self, stream_id: str, generation: str | None
    ) -> None:
        if self._acquired_generations.get(stream_id) == generation:
            self._acquired_generations.pop(stream_id, None)

    async def acquire(
        self, stream_id: str, *, ttl_ms: int | None = None
    ) -> ResumableStreamRole:
        return (await self.acquire_lease(stream_id, ttl_ms=ttl_ms)).role

    async def acquire_lease(
        self, stream_id: str, *, ttl_ms: int | None = None
    ) -> ResumableStreamAcquisition:
        validate_stream_id(stream_id)
        ttl_sec = _ms_to_sec(ttl_ms if ttl_ms is not None else self._default_ttl_ms)
        generation = uuid.uuid4().hex
        meta = json.dumps(
            {"status": "streaming", "ttlSec": ttl_sec, "generation": generation}
        )
        if not await self._client.set_nx(self._meta_key(stream_id), meta, ttl_sec):
            return ResumableStreamAcquisition(role="consumer", lease=None)
        self._acquired_generations[stream_id] = generation
        return ResumableStreamAcquisition(
            role="producer", lease=ResumableStreamLease(token=generation)
        )

    async def append(
        self,
        stream_id: str,
        chunk: bytes,
        lease: ResumableStreamLease | None = None,
    ) -> None:
        validate_stream_id(stream_id)
        if self._max_chunk_bytes is not None and len(chunk) > self._max_chunk_bytes:
            raise RuntimeError(
                f"Chunk exceeds maxChunkBytes ({len(chunk)} > {self._max_chunk_bytes})"
            )
        meta_key = self._meta_key(stream_id)
        existing_raw = await self._client.get(meta_key)
        meta = _parse_meta(existing_raw)
        if existing_raw is None or meta is None:
            raise RuntimeError(f"Stream not found: {stream_id}")
        self._assert_writable(stream_id, meta, lease)
        ttl_sec = self._ttl_sec(meta)
        data_key = self._data_key(stream_id, _meta_generation(meta))
        fields = {FIELD_CHUNK: chunk}
        append_if_unchanged = getattr(self._client, "append_if_unchanged", None)
        if append_if_unchanged is None:
            await self._client.pipeline(
                [
                    {"type": "xAdd", "key": data_key, "fields": fields},
                    {"type": "expire", "key": data_key, "ttlSec": ttl_sec},
                    {"type": "expire", "key": meta_key, "ttlSec": ttl_sec},
                ]
            )
            return

        if await append_if_unchanged(
            {
                "meta_key": meta_key,
                "expected_meta": existing_raw,
                "data_key": data_key,
                "fields": fields,
                "ttl_sec": ttl_sec,
            }
        ):
            return

        current = _parse_meta(await self._client.get(meta_key))
        if current is None:
            raise RuntimeError(f"Stream not found: {stream_id}")
        self._assert_writable(stream_id, current, lease)
        raise ResumableStreamError(
            "missing", f"Stream changed while appending: {stream_id}"
        )

    async def finalize(
        self,
        stream_id: str,
        status: Literal["done", "error"],
        error: str | None = None,
        lease: ResumableStreamLease | None = None,
    ) -> bool:
        validate_stream_id(stream_id)
        meta_key = self._meta_key(stream_id)
        existing_raw = await self._client.get(meta_key)
        existing = _parse_meta(existing_raw)
        if existing_raw is None or existing is None:
            if existing_raw is None and lease is not None:
                self._clear_acquired_generation(stream_id, lease.token)
            raise RuntimeError(f"Stream not found: {stream_id}")
        if existing.get("status") != "streaming" or self._is_superseded_generation(
            stream_id, existing, lease
        ):
            if lease is not None:
                self._clear_acquired_generation(stream_id, lease.token)
            return False
        ttl_sec = self._ttl_sec(existing)
        generation = _meta_generation(existing)
        error_text = error if error is not None else "Stream errored"
        next_meta: dict[str, Any] = {"status": status}
        fields: dict[str, str] = {FIELD_FIN: FIN_DONE}
        if status == "error":
            next_meta["error"] = error_text
            fields = {FIELD_FIN: FIN_ERROR, FIELD_ERROR: error_text}
        next_meta["ttlSec"] = ttl_sec
        if generation is not None:
            next_meta["generation"] = generation
        finalized = await self._client.finalize_if_unchanged(
            {
                "meta_key": meta_key,
                "expected_meta": existing_raw,
                "next_meta": json.dumps(next_meta),
                "data_key": self._data_key(stream_id, generation),
                "fields": fields,
                "ttl_sec": ttl_sec,
            }
        )
        # Lease-less producers still need their local fence after a lost finalize.
        if finalized or lease is not None:
            self._clear_acquired_generation(
                stream_id, lease.token if lease is not None else generation
            )
        return finalized

    async def read(
        self, stream_id: str, cursor: str, signal: CancellationSignal
    ) -> AsyncIterator[ResumableStreamEntry]:
        validate_stream_id(stream_id)
        meta_key = self._meta_key(stream_id)
        initial_meta = await self._client.get(meta_key)
        if initial_meta is None:
            raise RuntimeError(f"Stream not found: {stream_id}")
        generation = _meta_generation(_parse_meta(initial_meta))
        data_key = self._data_key(stream_id, generation)
        last_id = STREAM_START_ID if cursor == "" else cursor

        while True:
            if signal.is_set():
                return

            start = "-" if last_id == STREAM_START_ID else f"({last_id}"
            entries = await self._client.xrange(data_key, start, "+")

            for entry in entries:
                if signal.is_set():
                    return
                last_id = entry["id"]
                fields = entry["fields"]
                fin = _to_str(fields.get(FIELD_FIN))
                if fin == FIN_DONE:
                    return
                if fin == FIN_ERROR:
                    raise RuntimeError(
                        _to_str(fields.get(FIELD_ERROR)) or "Stream errored"
                    )
                raw = fields.get(FIELD_CHUNK)
                if raw is not None:
                    yield ResumableStreamEntry(cursor=last_id, chunk=_to_bytes(raw))

            if entries:
                continue

            current_meta = await self._client.get(meta_key)
            if (
                current_meta is None
                or _meta_generation(_parse_meta(current_meta)) != generation
            ):
                return

            await _sleep(self._poll_interval_ms, signal)

    async def status(self, stream_id: str) -> ResumableStreamStatus:
        validate_stream_id(stream_id)
        meta = _parse_meta(await self._client.get(self._meta_key(stream_id)))
        status = meta.get("status") if meta is not None else None
        return status if status in ("streaming", "done", "error") else "missing"

    async def delete(self, stream_id: str) -> None:
        validate_stream_id(stream_id)
        meta_key = self._meta_key(stream_id)
        acquired_generation = self._acquired_generations.get(stream_id)
        existing_raw = await self._client.get(meta_key)
        legacy_data_key = self._data_key(stream_id)
        if existing_raw is None:
            self._clear_acquired_generation(stream_id, acquired_generation)
            keys = [legacy_data_key]
            if acquired_generation is not None:
                keys.insert(0, self._data_key(stream_id, acquired_generation))
            await self._client.delete(keys)
            return

        generation = _meta_generation(_parse_meta(existing_raw))
        data_keys = list(
            dict.fromkeys([self._data_key(stream_id, generation), legacy_data_key])
        )
        delete_if_unchanged = getattr(self._client, "delete_if_unchanged", None)
        if delete_if_unchanged is None:
            self._clear_acquired_generation(stream_id, acquired_generation)
            await self._client.delete([meta_key, *data_keys])
            return

        while not await delete_if_unchanged(
            {
                "meta_key": meta_key,
                "expected_meta": existing_raw,
                "data_keys": data_keys,
            }
        ):
            current_raw = await self._client.get(meta_key)
            if (
                current_raw is None
                or _meta_generation(_parse_meta(current_raw)) != generation
            ):
                self._clear_acquired_generation(stream_id, acquired_generation)
                if generation is not None:
                    await self._client.delete([self._data_key(stream_id, generation)])
                return
            existing_raw = current_raw
        self._clear_acquired_generation(stream_id, acquired_generation)


def _ms_to_sec(ms: int) -> int:
    return max(1, math.ceil(ms / 1000))


def _parse_meta(value: str | None) -> dict[str, Any] | None:
    if value is None:
        return None
    try:
        parsed = json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None
    return parsed if isinstance(parsed, dict) else None


def _meta_generation(meta: dict[str, Any] | None) -> str | None:
    generation = meta.get("generation") if meta is not None else None
    return generation if isinstance(generation, str) else None


async def _sleep(ms: int, signal: CancellationSignal) -> None:
    if signal.is_set():
        return
    with suppress(asyncio.TimeoutError):
        await asyncio.wait_for(signal.wait(), timeout=ms / 1000.0)


def _to_str(value: Any) -> Any:
    return value.decode("utf-8") if isinstance(value, bytes) else value


def _to_bytes(value: str | bytes) -> bytes:
    return value if isinstance(value, bytes) else value.encode("utf-8")


def _field_args(fields: dict[str, Any]) -> list[Any]:
    return [item for pair in fields.items() for item in pair]


def _script_ok(result: Any) -> bool:
    return result == 1 or result == b"1" or result == "1"


class _RedisAsyncioAdapter:
    def __init__(self, client: Any) -> None:
        self._client = client
        self._append = client.register_script(APPEND_IF_UNCHANGED_SCRIPT)
        self._finalize = client.register_script(FINALIZE_IF_UNCHANGED_SCRIPT)
        self._delete = client.register_script(DELETE_IF_UNCHANGED_SCRIPT)

    async def set_nx(self, key: str, value: str, ttl_sec: int) -> bool:
        result = await self._client.set(key, value, nx=True, ex=ttl_sec)
        return result is True or result == b"OK" or result == "OK"

    async def get(self, key: str) -> str | None:
        value = await self._client.get(key)
        if value is None or isinstance(value, bytes):
            return _to_str(value)
        return str(value)

    async def delete(self, keys: list[str]) -> None:
        if keys:
            await self._client.delete(*keys)

    async def xrange(
        self, key: str, start: str, end: str
    ) -> list[dict[str, Any]]:
        reply = await self._client.xrange(key, min=start, max=end)
        return [
            {
                "id": _to_str(entry_id),
                "fields": {_to_str(k): v for k, v in fields.items()},
            }
            for entry_id, fields in reply
        ]

    async def pipeline(self, commands: list[dict[str, Any]]) -> None:
        if not commands:
            return
        pipe = self._client.pipeline()
        for cmd in commands:
            if cmd["type"] == "xAdd":
                pipe.xadd(cmd["key"], dict(cmd["fields"]))
            elif cmd["type"] == "expire":
                pipe.expire(cmd["key"], cmd["ttlSec"])
        await pipe.execute()

    async def append_if_unchanged(self, options: dict[str, Any]) -> bool:
        return _script_ok(
            await self._append(
                keys=[options["meta_key"], options["data_key"]],
                args=[
                    options["expected_meta"],
                    str(options["ttl_sec"]),
                    *_field_args(options["fields"]),
                ],
            )
        )

    async def finalize_if_unchanged(self, options: dict[str, Any]) -> bool:
        return _script_ok(
            await self._finalize(
                keys=[options["meta_key"], options["data_key"]],
                args=[
                    options["expected_meta"],
                    options["next_meta"],
                    str(options["ttl_sec"]),
                    *_field_args(options["fields"]),
                ],
            )
        )

    async def delete_if_unchanged(self, options: dict[str, Any]) -> bool:
        return _script_ok(
            await self._delete(
                keys=[options["meta_key"], *options["data_keys"]],
                args=[options["expected_meta"]],
            )
        )


def create_redis_resumable_stream_store(
    client: Any,
    *,
    key_prefix: str = DEFAULT_KEY_PREFIX,
    default_ttl_ms: int = DEFAULT_TTL_MS,
    poll_interval_ms: int = DEFAULT_POLL_INTERVAL_MS,
    max_chunk_bytes: int | None = None,
) -> RedisResumableStreamStore:
    """Create a store backed by a ``redis.asyncio.Redis`` client."""
    try:
        import redis.asyncio  # noqa: F401
    except ImportError as exc:
        raise ImportError(
            "redis is required for create_redis_resumable_stream_store; "
            "install with: pip install assistant-stream[redis]"
        ) from exc

    connection_pool = getattr(client, "connection_pool", None)
    if connection_pool is not None:
        connection_kwargs = getattr(connection_pool, "connection_kwargs", None)
        if isinstance(connection_kwargs, dict) and connection_kwargs.get(
            "decode_responses"
        ):
            raise ValueError(
                "redis client must be constructed without decode_responses "
                "(decode_responses=True cannot round-trip binary stream chunks)"
            )

    return RedisResumableStreamStore(
        _RedisAsyncioAdapter(client),
        key_prefix=key_prefix,
        default_ttl_ms=default_ttl_ms,
        poll_interval_ms=poll_interval_ms,
        max_chunk_bytes=max_chunk_bytes,
    )
