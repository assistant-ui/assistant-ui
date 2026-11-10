"""Thread records for durable AG-UI threads, and the stores that keep them."""

from __future__ import annotations

import asyncio
import json
import re
import sqlite3
import time
from dataclasses import asdict, dataclass, field, fields
from pathlib import Path
from typing import Any, Protocol

DEFAULT_TABLE = "aui_threads"


@dataclass
class ThreadRecord:
    """Everything a client needs to restore a thread, written in one piece.

    While `running` is true, `messages` holds only the run's input. The run's
    output reaches the client once, from the stream named by `stream_id`.
    """

    messages: list[dict[str, Any]] = field(default_factory=list)
    stream_id: str | None = None
    running: bool = False
    owner: str | None = None
    updated_at: float = field(default_factory=time.time)

    def to_json(self) -> str:
        return json.dumps(asdict(self))

    @classmethod
    def from_json(cls, raw: str | bytes) -> ThreadRecord:
        data = json.loads(raw)
        names = {f.name for f in fields(cls)}
        return cls(**{key: value for key, value in data.items() if key in names})


class ThreadStore(Protocol):
    """Where thread records live. Implement it to use your own database.

    `list` returns the owner's threads, most recently updated first. An owner
    of None means threads written without an owner.
    """

    async def get(self, thread_id: str) -> ThreadRecord | None: ...

    async def put(self, thread_id: str, record: ThreadRecord) -> None: ...

    async def list(
        self, *, owner: str | None = None, limit: int = 100
    ) -> list[tuple[str, ThreadRecord]]: ...


class InMemoryThreadStore:
    """Keeps threads in this process. For development and tests."""

    def __init__(self) -> None:
        self._records: dict[str, ThreadRecord] = {}

    async def get(self, thread_id: str) -> ThreadRecord | None:
        return self._records.get(thread_id)

    async def put(self, thread_id: str, record: ThreadRecord) -> None:
        self._records[thread_id] = record

    async def list(
        self, *, owner: str | None = None, limit: int = 100
    ) -> list[tuple[str, ThreadRecord]]:
        items = [item for item in self._records.items() if item[1].owner == owner]
        items.sort(key=lambda item: item[1].updated_at, reverse=True)
        return items[:limit]


def _table_name(table: str) -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", table):
        raise ValueError(f"invalid table name: {table!r}")
    return table


class SqliteThreadStore:
    """One row per thread in a SQLite file. For a single server."""

    def __init__(self, path: str | Path, *, table: str = DEFAULT_TABLE) -> None:
        self._path = str(path)
        self._table = _table_name(table)
        with self._connect() as db:
            db.execute(
                f"CREATE TABLE IF NOT EXISTS {self._table} ("
                " id TEXT PRIMARY KEY, owner TEXT, record TEXT NOT NULL,"
                " updated_at REAL NOT NULL)"
            )
            db.execute(
                f"CREATE INDEX IF NOT EXISTS {self._table}_owner_updated"
                f" ON {self._table} (owner, updated_at DESC)"
            )

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self._path)

    def _get(self, thread_id: str) -> ThreadRecord | None:
        with self._connect() as db:
            row = db.execute(
                f"SELECT record FROM {self._table} WHERE id = ?", (thread_id,)
            ).fetchone()
        return None if row is None else ThreadRecord.from_json(row[0])

    def _put(self, thread_id: str, record: ThreadRecord) -> None:
        with self._connect() as db:
            db.execute(
                f"INSERT INTO {self._table} (id, owner, record, updated_at)"
                " VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET"
                " owner = excluded.owner, record = excluded.record,"
                " updated_at = excluded.updated_at",
                (thread_id, record.owner, record.to_json(), record.updated_at),
            )

    def _list(self, owner: str | None, limit: int) -> list[tuple[str, ThreadRecord]]:
        with self._connect() as db:
            rows = db.execute(
                f"SELECT id, record FROM {self._table} WHERE owner IS ?"
                " ORDER BY updated_at DESC LIMIT ?",
                (owner, limit),
            ).fetchall()
        return [(row[0], ThreadRecord.from_json(row[1])) for row in rows]

    async def get(self, thread_id: str) -> ThreadRecord | None:
        return await asyncio.to_thread(self._get, thread_id)

    async def put(self, thread_id: str, record: ThreadRecord) -> None:
        await asyncio.to_thread(self._put, thread_id, record)

    async def list(
        self, *, owner: str | None = None, limit: int = 100
    ) -> list[tuple[str, ThreadRecord]]:
        return await asyncio.to_thread(self._list, owner, limit)


class PostgresThreadStore:
    """One JSONB row per thread, through a psycopg 3 `AsyncConnectionPool`.

    Needs `pip install "assistant-stream[postgres]"`. Use `connect(dsn)` to
    open a pool and create the table, or pass your own pool and call `setup()`.
    """

    def __init__(self, pool: Any, *, table: str = DEFAULT_TABLE) -> None:
        self._pool = pool
        self._table = _table_name(table)
        self._owns_pool = False

    @classmethod
    async def connect(
        cls, dsn: str, *, table: str = DEFAULT_TABLE
    ) -> PostgresThreadStore:
        from psycopg_pool import AsyncConnectionPool

        pool = AsyncConnectionPool(dsn, open=False)
        await pool.open()
        store = cls(pool, table=table)
        store._owns_pool = True
        await store.setup()
        return store

    async def setup(self) -> None:
        """Create the table and index if they do not exist."""
        async with self._pool.connection() as db:
            await db.execute(
                f"CREATE TABLE IF NOT EXISTS {self._table} ("
                " id TEXT PRIMARY KEY, owner TEXT, record JSONB NOT NULL,"
                " updated_at DOUBLE PRECISION NOT NULL)"
            )
            await db.execute(
                f"CREATE INDEX IF NOT EXISTS {self._table}_owner_updated"
                f" ON {self._table} (owner, updated_at DESC)"
            )

    async def close(self) -> None:
        """Close the pool if `connect()` opened it."""
        if self._owns_pool:
            await self._pool.close()

    async def get(self, thread_id: str) -> ThreadRecord | None:
        async with self._pool.connection() as db:
            cursor = await db.execute(
                f"SELECT record::text FROM {self._table} WHERE id = %s", (thread_id,)
            )
            row = await cursor.fetchone()
        return None if row is None else ThreadRecord.from_json(row[0])

    async def put(self, thread_id: str, record: ThreadRecord) -> None:
        async with self._pool.connection() as db:
            await db.execute(
                f"INSERT INTO {self._table} (id, owner, record, updated_at)"
                " VALUES (%s, %s, %s::jsonb, %s) ON CONFLICT (id) DO UPDATE SET"
                " owner = excluded.owner, record = excluded.record,"
                " updated_at = excluded.updated_at",
                (thread_id, record.owner, record.to_json(), record.updated_at),
            )

    async def list(
        self, *, owner: str | None = None, limit: int = 100
    ) -> list[tuple[str, ThreadRecord]]:
        async with self._pool.connection() as db:
            cursor = await db.execute(
                f"SELECT id, record::text FROM {self._table}"
                " WHERE owner IS NOT DISTINCT FROM %s::text"
                " ORDER BY updated_at DESC LIMIT %s",
                (owner, limit),
            )
            rows = await cursor.fetchall()
        return [(row[0], ThreadRecord.from_json(row[1])) for row in rows]
