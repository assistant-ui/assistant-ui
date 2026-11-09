"""Durable AG-UI threads for a Pydantic AI agent.

A run started by POST /agent keeps going when the browser goes away. Its AG-UI
frames are written to a resumable stream (`assistant_stream.resumable`), and the
thread transcript is written to a `ThreadStore`. A client that comes back reads
the transcript and, while the run is still going, replays its frames from the
first one and follows it to the end.
"""

from __future__ import annotations

import asyncio
import json
import sqlite3
import time
from collections.abc import AsyncIterator, Callable, Sequence
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Generic, Protocol

from ag_ui.core import Message, RunAgentInput
from assistant_stream.resumable import ResumableStreamContext
from pydantic import ValidationError
from pydantic_ai import CancellationToken
from pydantic_ai.agent import AbstractAgent
from pydantic_ai.messages import ModelMessage
from pydantic_ai.tools import AgentDepsT
from pydantic_ai.ui.ag_ui import AGUIAdapter
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, StreamingResponse
from starlette.routing import Route

SSE = "text/event-stream"

RunOptions = Callable[[Request, RunAgentInput], dict[str, Any]]


@dataclass
class ThreadRecord:
    """Everything a client needs to restore a thread, written in one piece.

    While `running` is true, `messages` holds only the run's input. The run's
    output reaches the client once, from the stream named by `stream_id`.
    """

    messages: list[dict[str, Any]] = field(default_factory=list)
    stream_id: str | None = None
    running: bool = False
    updated_at: float = field(default_factory=time.time)


class ThreadStore(Protocol):
    async def get(self, thread_id: str) -> ThreadRecord | None: ...

    async def put(self, thread_id: str, record: ThreadRecord) -> None: ...

    async def list(self) -> list[tuple[str, ThreadRecord]]: ...


class InMemoryThreadStore:
    def __init__(self) -> None:
        self._records: dict[str, ThreadRecord] = {}

    async def get(self, thread_id: str) -> ThreadRecord | None:
        return self._records.get(thread_id)

    async def put(self, thread_id: str, record: ThreadRecord) -> None:
        self._records[thread_id] = record

    async def list(self) -> list[tuple[str, ThreadRecord]]:
        return sorted(
            self._records.items(), key=lambda item: item[1].updated_at, reverse=True
        )


class SqliteThreadStore:
    """One row per thread. Swap for Postgres in production; the shape is the same."""

    def __init__(self, path: str | Path) -> None:
        self._path = str(path)
        with self._connect() as db:
            db.execute(
                "CREATE TABLE IF NOT EXISTS threads ("
                " id TEXT PRIMARY KEY, record TEXT NOT NULL, updated_at REAL NOT NULL)"
            )

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self._path)

    def _get(self, thread_id: str) -> ThreadRecord | None:
        with self._connect() as db:
            row = db.execute(
                "SELECT record FROM threads WHERE id = ?", (thread_id,)
            ).fetchone()
        return None if row is None else ThreadRecord(**json.loads(row[0]))

    def _put(self, thread_id: str, record: ThreadRecord) -> None:
        with self._connect() as db:
            db.execute(
                "INSERT INTO threads (id, record, updated_at) VALUES (?, ?, ?)"
                " ON CONFLICT(id) DO UPDATE SET record = excluded.record,"
                " updated_at = excluded.updated_at",
                (thread_id, json.dumps(asdict(record)), record.updated_at),
            )

    def _list(self) -> list[tuple[str, ThreadRecord]]:
        with self._connect() as db:
            rows = db.execute(
                "SELECT id, record FROM threads ORDER BY updated_at DESC"
            ).fetchall()
        return [(row[0], ThreadRecord(**json.loads(row[1]))) for row in rows]

    async def get(self, thread_id: str) -> ThreadRecord | None:
        return await asyncio.to_thread(self._get, thread_id)

    async def put(self, thread_id: str, record: ThreadRecord) -> None:
        await asyncio.to_thread(self._put, thread_id, record)

    async def list(self) -> list[tuple[str, ThreadRecord]]:
        return await asyncio.to_thread(self._list)


class PostgresThreadStore:
    """One JSONB row per thread, through psycopg 3 (`pip install "psycopg[binary,pool]"`)."""

    def __init__(self, pool: Any) -> None:
        self._pool = pool

    @classmethod
    async def connect(cls, dsn: str) -> PostgresThreadStore:
        from psycopg_pool import AsyncConnectionPool

        pool = AsyncConnectionPool(dsn, open=False)
        await pool.open()
        store = cls(pool)
        async with pool.connection() as db:
            await db.execute(
                "CREATE TABLE IF NOT EXISTS aui_threads ("
                " id TEXT PRIMARY KEY, record JSONB NOT NULL,"
                " updated_at DOUBLE PRECISION NOT NULL)"
            )
        return store

    async def close(self) -> None:
        await self._pool.close()

    async def get(self, thread_id: str) -> ThreadRecord | None:
        async with self._pool.connection() as db:
            cursor = await db.execute(
                "SELECT record::text FROM aui_threads WHERE id = %s", (thread_id,)
            )
            row = await cursor.fetchone()
        return None if row is None else ThreadRecord(**json.loads(row[0]))

    async def put(self, thread_id: str, record: ThreadRecord) -> None:
        async with self._pool.connection() as db:
            await db.execute(
                "INSERT INTO aui_threads (id, record, updated_at)"
                " VALUES (%s, %s::jsonb, %s)"
                " ON CONFLICT (id) DO UPDATE SET record = excluded.record,"
                " updated_at = excluded.updated_at",
                (thread_id, json.dumps(asdict(record)), record.updated_at),
            )

    async def list(self) -> list[tuple[str, ThreadRecord]]:
        async with self._pool.connection() as db:
            cursor = await db.execute(
                "SELECT id, record::text FROM aui_threads ORDER BY updated_at DESC"
            )
            rows = await cursor.fetchall()
        return [(row[0], ThreadRecord(**json.loads(row[1]))) for row in rows]


def _dump(messages: Sequence[Message]) -> list[dict[str, Any]]:
    return [
        message.model_dump(mode="json", by_alias=True, exclude_none=True)
        for message in messages
    ]


def _title(messages: Sequence[dict[str, Any]]) -> str:
    for message in messages:
        if message.get("role") == "user":
            content = message.get("content")
            if isinstance(content, str):
                return content[:80]
            if isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        return str(part.get("text", ""))[:80]
    return "New thread"


async def _empty_stream() -> AsyncIterator[bytes]:
    return
    yield


class DurableAGUI(Generic[AgentDepsT]):
    """Serves a Pydantic AI agent over AG-UI with runs that outlive the request."""

    def __init__(
        self,
        agent: AbstractAgent[AgentDepsT, Any],
        *,
        threads: ThreadStore,
        streams: ResumableStreamContext,
        run_options: RunOptions | None = None,
        adapter_options: dict[str, Any] | None = None,
    ) -> None:
        self.agent = agent
        self.threads = threads
        self.streams = streams
        self._run_options = run_options
        self._adapter_options = adapter_options or {}
        self._tokens: dict[str, CancellationToken] = {}

    async def start_run(self, request: Request) -> Response:
        try:
            run_input = AGUIAdapter.build_run_input(await request.body())
        except ValidationError as error:
            return JSONResponse({"error": error.errors()}, status_code=422)

        thread_id = run_input.thread_id
        stream_id = f"{thread_id}.{run_input.run_id}"
        status = await self._safe_status(stream_id)
        if status is None:
            return JSONResponse({"error": "invalid thread or run id"}, status_code=400)
        if status != "missing":
            return JSONResponse({"error": "run already exists"}, status_code=409)

        previous = await self.threads.get(thread_id)
        if previous is not None and previous.running and previous.stream_id:
            self._cancel_local(previous.stream_id)

        adapter = AGUIAdapter(
            agent=self.agent,
            run_input=run_input,
            accept=SSE,
            **self._adapter_options,
        )
        input_messages = _dump(run_input.messages)
        await self.threads.put(
            thread_id,
            ThreadRecord(messages=input_messages, stream_id=stream_id, running=True),
        )

        options = self._run_options(request, run_input) if self._run_options else {}
        token = CancellationToken()
        self._tokens[stream_id] = token
        settled = False

        async def settle(new_messages: Sequence[ModelMessage]) -> None:
            nonlocal settled
            settled = True
            current = await self.threads.get(thread_id)
            if current is not None and current.stream_id != stream_id:
                return
            await self.threads.put(
                thread_id,
                ThreadRecord(
                    messages=input_messages
                    + _dump(AGUIAdapter.dump_messages(new_messages)),
                    stream_id=stream_id,
                    running=False,
                ),
            )

        async def on_complete(result: Any) -> None:
            await settle(result.new_messages())

        async def on_cancel(cancelled: Any) -> None:
            await settle(cancelled.new_messages())

        async def make_stream() -> AsyncIterator[bytes]:
            try:
                events = adapter.run_stream(
                    cancellation_token=token,
                    on_complete=on_complete,
                    on_cancel=on_cancel,
                    **options,
                )
                async for frame in adapter.encode_stream(events):
                    yield frame.encode("utf-8")
            finally:
                self._tokens.pop(stream_id, None)
                if not settled:
                    await settle([])

        body = await self.streams.run(stream_id, make_stream)
        return StreamingResponse(body, media_type=SSE)

    async def get_thread(self, thread_id: str) -> dict[str, Any] | None:
        record = await self.threads.get(thread_id)
        if record is None:
            return None
        running = record.running
        if running and record.stream_id:
            # A run whose stream is gone died with its server and will not finish.
            running = await self._safe_status(record.stream_id) == "streaming"
        return {"id": thread_id, "messages": record.messages, "running": running}

    async def list_threads(self) -> list[dict[str, Any]]:
        return [
            {
                "id": thread_id,
                "title": _title(record.messages),
                "running": record.running,
                "updatedAt": record.updated_at,
            }
            for thread_id, record in await self.threads.list()
        ]

    async def stream(self, thread_id: str) -> Response:
        record = await self.threads.get(thread_id)
        body = None
        if record is not None and record.stream_id:
            try:
                body = await self.streams.resume(record.stream_id)
            except Exception:
                body = None
        return StreamingResponse(body or _empty_stream(), media_type=SSE)

    async def cancel(self, thread_id: str) -> bool:
        record = await self.threads.get(thread_id)
        if record is None or not record.running or not record.stream_id:
            return False
        return self._cancel_local(record.stream_id)

    def _cancel_local(self, stream_id: str) -> bool:
        token = self._tokens.get(stream_id)
        if token is None:
            return False
        token.cancel()
        return True

    async def _safe_status(self, stream_id: str) -> str | None:
        try:
            return await self.streams.status(stream_id)
        except Exception:
            return None

    def routes(self, prefix: str = "") -> list[Route]:
        async def start_run(request: Request) -> Response:
            return await self.start_run(request)

        async def list_threads(request: Request) -> Response:
            return JSONResponse(await self.list_threads())

        async def get_thread(request: Request) -> Response:
            thread = await self.get_thread(request.path_params["thread_id"])
            if thread is None:
                return JSONResponse({"error": "thread not found"}, status_code=404)
            return JSONResponse(thread)

        async def stream(request: Request) -> Response:
            return await self.stream(request.path_params["thread_id"])

        async def cancel(request: Request) -> Response:
            cancelled = await self.cancel(request.path_params["thread_id"])
            return JSONResponse({"cancelled": cancelled})

        return [
            Route(f"{prefix}/agent", start_run, methods=["POST"]),
            Route(f"{prefix}/threads", list_threads, methods=["GET"]),
            Route(f"{prefix}/threads/{{thread_id}}", get_thread, methods=["GET"]),
            Route(f"{prefix}/threads/{{thread_id}}/stream", stream, methods=["GET"]),
            Route(f"{prefix}/threads/{{thread_id}}/cancel", cancel, methods=["POST"]),
        ]
