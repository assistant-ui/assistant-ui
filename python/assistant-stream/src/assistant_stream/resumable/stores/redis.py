from __future__ import annotations

import asyncio
import json
import math
from collections.abc import AsyncIterator, Mapping
from typing import Any, Literal, Protocol

from assistant_stream.resumable.errors import (
    DEFAULT_TTL_MS,
    ResumableStreamError,
    validate_stream_id,
)
from assistant_stream.resumable.types import (
    CancellationSignal,
    ResumableStreamEntry,
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


class RedisLikeClient(Protocol):
    async def set_nx(self, key: str, value: str, ttl_sec: int) -> bool: ...

    async def set(self, key: str, value: str, ttl_sec: int) -> None: ...

    async def get(self, key: str) -> str | None: ...

    async def expire(self, key: str, ttl_sec: int) -> None: ...

    async def exists(self, key: str) -> bool: ...

    async def delete(self, keys: list[str]) -> None: ...

    async def xadd(
        self, key: str, fields: Mapping[str, str | bytes]
    ) -> str: ...

    async def xrange(
        self, key: str, start: str, end: str
    ) -> list[dict[str, Any]]: ...

    async def pipeline(self, commands: list[dict[str, Any]]) -> None: ...


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

    def _meta_key(self, stream_id: str) -> str:
        return f"{self._key_prefix}:{{{stream_id}}}:meta"

    def _data_key(self, stream_id: str) -> str:
        return f"{self._key_prefix}:{{{stream_id}}}:data"

    async def _read_meta(self, stream_id: str) -> dict[str, Any] | None:
        raw = await self._client.get(self._meta_key(stream_id))
        if raw is None:
            return None
        return _parse_meta(raw)

    async def acquire(
        self, stream_id: str, *, ttl_ms: int | None = None
    ) -> ResumableStreamRole:
        validate_stream_id(stream_id)
        ttl_sec = _ms_to_sec(ttl_ms if ttl_ms is not None else self._default_ttl_ms)
        meta = json.dumps({"status": "streaming", "ttlSec": ttl_sec})
        acquired = await self._client.set_nx(self._meta_key(stream_id), meta, ttl_sec)
        if acquired:
            await self._client.delete([self._data_key(stream_id)])
            return "producer"
        return "consumer"

    async def append(self, stream_id: str, chunk: bytes) -> None:
        validate_stream_id(stream_id)
        if (
            self._max_chunk_bytes is not None
            and len(chunk) > self._max_chunk_bytes
        ):
            raise RuntimeError(
                f"Chunk exceeds maxChunkBytes ({len(chunk)} > {self._max_chunk_bytes})"
            )
        data_key = self._data_key(stream_id)
        meta_key = self._meta_key(stream_id)
        meta = await self._read_meta(stream_id)
        if meta is None:
            raise RuntimeError(f"Stream not found: {stream_id}")
        if meta.get("status") != "streaming":
            raise ResumableStreamError(
                "finalized",
                f"Stream already finalized: {stream_id}",
            )
        ttl_sec = meta.get("ttlSec")
        if not isinstance(ttl_sec, int):
            ttl_sec = _ms_to_sec(self._default_ttl_ms)
        await self._client.pipeline(
            [
                {"type": "xAdd", "key": data_key, "fields": {FIELD_CHUNK: chunk}},
                {"type": "expire", "key": data_key, "ttlSec": ttl_sec},
                {"type": "expire", "key": meta_key, "ttlSec": ttl_sec},
            ]
        )

    async def finalize(
        self,
        stream_id: str,
        status: Literal["done", "error"],
        error: str | None = None,
    ) -> None:
        validate_stream_id(stream_id)
        data_key = self._data_key(stream_id)
        meta_key = self._meta_key(stream_id)
        existing = await self._read_meta(stream_id)
        if existing is None:
            raise RuntimeError(f"Stream not found: {stream_id}")
        if existing.get("status") != "streaming":
            return
        ttl_sec = existing.get("ttlSec")
        if not isinstance(ttl_sec, int):
            ttl_sec = _ms_to_sec(self._default_ttl_ms)
        if status == "error":
            meta = json.dumps(
                {
                    "status": "error",
                    "error": error if error is not None else "Stream errored",
                    "ttlSec": ttl_sec,
                }
            )
        else:
            meta = json.dumps({"status": "done", "ttlSec": ttl_sec})
        fields: dict[str, str] = {
            FIELD_FIN: FIN_ERROR if status == "error" else FIN_DONE,
        }
        if status == "error":
            fields[FIELD_ERROR] = error if error is not None else "Stream errored"
        await self._client.pipeline(
            [
                {"type": "set", "key": meta_key, "value": meta, "ttlSec": ttl_sec},
                {"type": "xAdd", "key": data_key, "fields": fields},
                {"type": "expire", "key": data_key, "ttlSec": ttl_sec},
            ]
        )

    async def read(
        self, stream_id: str, cursor: str, signal: CancellationSignal
    ) -> AsyncIterator[ResumableStreamEntry]:
        validate_stream_id(stream_id)
        data_key = self._data_key(stream_id)
        meta_key = self._meta_key(stream_id)
        initial_meta = await self._client.get(meta_key)
        if initial_meta is None:
            raise RuntimeError(f"Stream not found: {stream_id}")

        last_id = STREAM_START_ID if cursor == "" else cursor

        while True:
            if signal.is_set():
                return

            start = "-" if last_id == STREAM_START_ID else f"({last_id}"
            entries = await self._client.xrange(data_key, start, "+")

            for entry in entries:
                if signal.is_set():
                    return
                entry_id = entry["id"]
                fields = entry["fields"]
                last_id = entry_id

                fin = _read_string(fields.get(FIELD_FIN))
                if fin == FIN_DONE:
                    return
                if fin == FIN_ERROR:
                    raise RuntimeError(
                        _read_string(fields.get(FIELD_ERROR)) or "Stream errored"
                    )

                raw = fields.get(FIELD_CHUNK)
                if raw is None:
                    continue
                yield ResumableStreamEntry(cursor=entry_id, chunk=_to_bytes(raw))

            if len(entries) > 0:
                continue

            still_exists = await self._client.exists(meta_key)
            if not still_exists:
                return

            await _sleep(self._poll_interval_ms, signal)

    async def status(self, stream_id: str) -> ResumableStreamStatus:
        validate_stream_id(stream_id)
        meta = await self._client.get(self._meta_key(stream_id))
        if meta is None:
            return "missing"
        parsed = _parse_meta(meta)
        if parsed is None:
            return "missing"
        status = parsed.get("status")
        if status == "streaming":
            return "streaming"
        if status == "done":
            return "done"
        if status == "error":
            return "error"
        return "missing"

    async def delete(self, stream_id: str) -> None:
        validate_stream_id(stream_id)
        await self._client.delete(
            [self._meta_key(stream_id), self._data_key(stream_id)]
        )


def _ms_to_sec(ms: int) -> int:
    return max(1, math.ceil(ms / 1000))


def _parse_meta(value: str) -> dict[str, Any] | None:
    try:
        parsed = json.loads(value)
        if isinstance(parsed, dict):
            return parsed
        return None
    except (json.JSONDecodeError, TypeError):
        return None


async def _sleep(ms: int, signal: CancellationSignal) -> None:
    if signal.is_set():
        return
    sleep_task = asyncio.create_task(asyncio.sleep(ms / 1000.0))
    signal_task = asyncio.create_task(signal.wait())
    done, pending = await asyncio.wait(
        {sleep_task, signal_task}, return_when=asyncio.FIRST_COMPLETED
    )
    for task in pending:
        task.cancel()
        try:
            await task
        except (asyncio.CancelledError, Exception):
            pass
    for task in done:
        try:
            await task
        except Exception:
            pass


def _read_string(value: str | bytes | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return value.decode("utf-8")


def _to_bytes(value: str | bytes) -> bytes:
    if isinstance(value, bytes):
        return value
    return value.encode("utf-8")


class _RedisAsyncioAdapter:
    def __init__(self, client: Any) -> None:
        self._client = client

    async def set_nx(self, key: str, value: str, ttl_sec: int) -> bool:
        result = await self._client.set(key, value, nx=True, ex=ttl_sec)
        return result is True or result == b"OK" or result == "OK"

    async def set(self, key: str, value: str, ttl_sec: int) -> None:
        await self._client.set(key, value, ex=ttl_sec)

    async def get(self, key: str) -> str | None:
        value = await self._client.get(key)
        if value is None:
            return None
        if isinstance(value, bytes):
            return value.decode("utf-8")
        return str(value)

    async def expire(self, key: str, ttl_sec: int) -> None:
        await self._client.expire(key, ttl_sec)

    async def exists(self, key: str) -> bool:
        result = await self._client.exists(key)
        return int(result) > 0

    async def delete(self, keys: list[str]) -> None:
        if not keys:
            return
        await self._client.delete(*keys)

    async def xadd(self, key: str, fields: Mapping[str, str | bytes]) -> str:
        result = await self._client.xadd(key, dict(fields))
        if isinstance(result, bytes):
            return result.decode("utf-8")
        return str(result)

    async def xrange(
        self, key: str, start: str, end: str
    ) -> list[dict[str, Any]]:
        reply = await self._client.xrange(key, min=start, max=end)
        out: list[dict[str, Any]] = []
        for entry_id, fields in reply:
            if isinstance(entry_id, bytes):
                entry_id = entry_id.decode("utf-8")
            parsed_fields: dict[str, str | bytes] = {}
            for field_key, field_value in fields.items():
                if isinstance(field_key, bytes):
                    field_key = field_key.decode("utf-8")
                parsed_fields[field_key] = field_value
            out.append({"id": entry_id, "fields": parsed_fields})
        return out

    async def pipeline(self, commands: list[dict[str, Any]]) -> None:
        if not commands:
            return
        pipe = self._client.pipeline()
        for cmd in commands:
            cmd_type = cmd["type"]
            if cmd_type == "xAdd":
                pipe.xadd(cmd["key"], dict(cmd["fields"]))
            elif cmd_type == "expire":
                pipe.expire(cmd["key"], cmd["ttlSec"])
            elif cmd_type == "set":
                pipe.set(cmd["key"], cmd["value"], ex=cmd["ttlSec"])
        await pipe.execute()


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

    return RedisResumableStreamStore(
        _RedisAsyncioAdapter(client),
        key_prefix=key_prefix,
        default_ttl_ms=default_ttl_ms,
        poll_interval_ms=poll_interval_ms,
        max_chunk_bytes=max_chunk_bytes,
    )
