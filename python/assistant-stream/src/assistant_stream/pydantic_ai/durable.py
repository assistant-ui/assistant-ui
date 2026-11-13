"""Durable AG-UI threads for a Pydantic AI agent.

A run started by POST /agent keeps going when the browser goes away. Its AG-UI
frames are written to a resumable stream (`assistant_stream.resumable`), and the
thread transcript is written to a `ThreadStore`. A client that comes back reads
the transcript and, while the run is still going, replays its frames from the
first one and follows it to the end.
"""

from __future__ import annotations

import asyncio
import inspect
from collections.abc import AsyncIterator, Awaitable, Callable, Sequence
from dataclasses import replace
from typing import Any, Generic

from ag_ui.core import Message, RunAgentInput
from pydantic import ValidationError
from pydantic_ai import CancellationToken
from pydantic_ai.agent import AbstractAgent
from pydantic_ai.messages import ModelMessage
from pydantic_ai.tools import AgentDepsT
from pydantic_ai.ui.ag_ui import AGUIAdapter
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, StreamingResponse
from starlette.routing import Route

from assistant_stream.pydantic_ai.threads import (
    InMemoryThreadStore,
    ThreadRecord,
    ThreadStore,
)
from assistant_stream.resumable import (
    ResumableStreamContext,
    ResumableStreamError,
    ResumableStreamRole,
    create_in_memory_resumable_stream_store,
    create_resumable_stream_context,
)

SSE = "text/event-stream"
DEFAULT_STREAM_TTL_MS = 60 * 60 * 1000

_MaybeAwaitable = Any | Awaitable[Any]
RunOptions = Callable[[Request, RunAgentInput], _MaybeAwaitable]
"""Returns keyword arguments for `AGUIAdapter.run_stream` (deps, model_settings, ...)."""
Owner = Callable[[Request], _MaybeAwaitable]
"""Returns the id of the user making the request, or None to refuse it."""


class _Unauthorized(Exception):
    pass


async def _resolve(value: Any) -> Any:
    return await value if inspect.isawaitable(value) else value


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
    """Serves a Pydantic AI agent over AG-UI with runs that outlive the request.

    Args:
        agent: The Pydantic AI agent.
        threads: Where thread transcripts live. In memory by default; use
            `SqliteThreadStore` or `PostgresThreadStore` to keep them.
        streams: Where each run's frames live while it runs. In memory by
            default; use a Redis store when more than one worker serves the app.
        owner: Returns the id of the user making a request (sync or async).
            Threads are then scoped to that user, and a request for which it
            returns None is refused with 401. Without it, every client sees
            every thread.
        run_options: Returns extra keyword arguments for
            `AGUIAdapter.run_stream`, such as `deps` (sync or async).
        adapter_options: Extra keyword arguments for `AGUIAdapter`.
    """

    def __init__(
        self,
        agent: AbstractAgent[AgentDepsT, Any],
        *,
        threads: ThreadStore | None = None,
        streams: ResumableStreamContext | None = None,
        owner: Owner | None = None,
        run_options: RunOptions | None = None,
        adapter_options: dict[str, Any] | None = None,
    ) -> None:
        self.agent = agent
        self.threads: ThreadStore = threads or InMemoryThreadStore()
        self.streams = streams or create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(),
            ttl_ms=DEFAULT_STREAM_TTL_MS,
        )
        self._owner = owner
        self._run_options = run_options
        self._adapter_options = adapter_options or {}
        self._tokens: dict[str, CancellationToken] = {}

    async def start_run(self, request: Request) -> Response:
        """POST /agent: start a run and stream its frames."""
        try:
            owner = await self._request_owner(request)
        except _Unauthorized:
            return _unauthorized()
        try:
            run_input = AGUIAdapter.build_run_input(await request.body())
        except ValidationError as error:
            return JSONResponse(
                {"error": error.errors(include_url=False, include_context=False)},
                status_code=422,
            )

        thread_id = run_input.thread_id
        run_id = run_input.run_id
        previous = await self.threads.get(thread_id)
        if previous is not None and previous.owner != owner:
            return _not_found()

        stream_id = _stream_id(thread_id, run_id)
        status = await self._safe_status(stream_id)
        if status is None:
            return JSONResponse({"error": "invalid thread or run id"}, status_code=400)
        if status != "missing":
            return JSONResponse({"error": "run already exists"}, status_code=409)

        adapter = AGUIAdapter(
            agent=self.agent,
            run_input=run_input,
            accept=SSE,
            **self._adapter_options,
        )
        options = (
            await _resolve(self._run_options(request, run_input))
            if self._run_options
            else {}
        )
        input_messages = _dump(run_input.messages)
        token = CancellationToken()
        ready: asyncio.Future[None] = asyncio.get_running_loop().create_future()
        producer_started = asyncio.Event()
        producer_task: asyncio.Task[None] | None = None
        producer = False
        settled = False

        on_acquire = self.streams._on_acquire
        wait_until = self.streams._wait_until

        def acquire(acquired_stream_id: str, role: ResumableStreamRole) -> None:
            nonlocal producer
            producer = role == "producer"
            if on_acquire is not None:
                on_acquire(acquired_stream_id, role)

        def track_producer(task: asyncio.Task[None]) -> None:
            nonlocal producer_task
            if producer_task is None:
                producer_task = task
                task.add_done_callback(lambda _: producer_started.set())
            if wait_until is not None:
                wait_until(task)

        async def settle(new_messages: Sequence[ModelMessage]) -> None:
            nonlocal settled
            settled = True
            await self.threads.put_if_current(
                thread_id,
                ThreadRecord(
                    messages=input_messages
                    + _dump(AGUIAdapter.dump_messages(new_messages)),
                    stream_id=stream_id,
                    run_id=run_id,
                    running=False,
                    owner=owner,
                ),
            )

        async def on_complete(result: Any) -> None:
            await settle(result.new_messages())

        async def on_cancel(cancelled: Any) -> None:
            await settle(cancelled.new_messages())

        async def make_stream() -> AsyncIterator[bytes]:
            try:
                producer_started.set()
                await asyncio.shield(ready)
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

        try:
            body = await replace(
                self.streams, _on_acquire=acquire, _wait_until=track_producer
            ).run(stream_id, make_stream)
            if producer:
                self._tokens[stream_id] = token
                record = ThreadRecord(
                    messages=input_messages,
                    stream_id=stream_id,
                    run_id=run_id,
                    running=True,
                    owner=owner,
                )
                while not (
                    settled or (producer_task is not None and producer_task.done())
                ):
                    if await self.threads.put_if_stream(
                        thread_id,
                        record,
                        expected=previous.stream_id if previous is not None else None,
                    ):
                        break
                    previous = await self.threads.get(thread_id)
                    if previous is not None and previous.owner != owner:
                        token.cancel()
                        ready.set_result(None)
                        return _not_found()
                await producer_started.wait()
                if settled or (producer_task is not None and producer_task.done()):
                    self._tokens.pop(stream_id, None)
                    await settle([])
                elif previous is not None and previous.running and previous.stream_id:
                    self._cancel_local(previous.stream_id)
                if not ready.done():
                    ready.set_result(None)
        except BaseException as error:
            if producer and not ready.done():
                ready.set_exception(error)
            raise
        return StreamingResponse(body, media_type=SSE)

    async def get_thread(
        self, thread_id: str, *, owner: str | None = None
    ) -> dict[str, Any] | None:
        """The thread's messages and whether a run is still going, or None."""
        record = await self._record(thread_id, owner)
        if record is None:
            return None
        while True:
            running = await self._is_running(record)
            if running:
                break
            latest = await self._record(thread_id, owner)
            if latest is None:
                return None
            if latest.stream_id == record.stream_id:
                record = latest
                break
            record = latest
        return {
            "id": thread_id,
            "messages": record.messages,
            "running": running,
            "runId": record.run_id,
        }

    async def list_threads(
        self, *, owner: str | None = None, limit: int = 100
    ) -> list[dict[str, Any]]:
        """The owner's threads, most recently updated first."""
        return [
            {
                "id": thread_id,
                "title": _title(record.messages),
                "running": await self._is_running(record),
                "updatedAt": record.updated_at,
            }
            for thread_id, record in await self.threads.list(owner=owner, limit=limit)
        ]

    async def resume_stream(
        self, thread_id: str, *, owner: str | None = None
    ) -> AsyncIterator[bytes] | None:
        """The latest run's frames from the first one, following it live."""
        record = await self._record(thread_id, owner)
        if record is None or not record.stream_id:
            return None
        try:
            return await self.streams.resume(record.stream_id)
        except ResumableStreamError:
            return None

    async def cancel(
        self, thread_id: str, run_id: str | None = None, *, owner: str | None = None
    ) -> bool:
        """Cancel the thread's run, or only run `run_id` when given, so a late
        cancel for a superseded run cannot stop its replacement.

        Reaches only runs on this process.
        """
        record = await self._record(thread_id, owner)
        if record is None:
            return False
        if not record.running or not record.stream_id:
            return False
        if run_id is not None and record.run_id != run_id:
            return False
        return self._cancel_local(record.stream_id)

    def routes(self, prefix: str = "") -> list[Route]:
        """Starlette routes for the AG-UI endpoint and the thread endpoints.

        POST {prefix}/agent, GET {prefix}/threads, GET {prefix}/threads/{id},
        GET {prefix}/threads/{id}/stream, POST {prefix}/threads/{id}/cancel.
        """

        def scoped(
            handler: Callable[[Request, str | None], Awaitable[Response]],
        ) -> Callable[[Request], Awaitable[Response]]:
            async def endpoint(request: Request) -> Response:
                try:
                    owner = await self._request_owner(request)
                except _Unauthorized:
                    return _unauthorized()
                return await handler(request, owner)

            return endpoint

        async def list_threads(request: Request, owner: str | None) -> Response:
            return JSONResponse(await self.list_threads(owner=owner))

        async def get_thread(request: Request, owner: str | None) -> Response:
            thread = await self.get_thread(
                request.path_params["thread_id"], owner=owner
            )
            return _not_found() if thread is None else JSONResponse(thread)

        async def stream(request: Request, owner: str | None) -> Response:
            thread_id = request.path_params["thread_id"]
            if await self._record(thread_id, owner) is None:
                return _not_found()
            body = await self.resume_stream(thread_id, owner=owner)
            return StreamingResponse(body or _empty_stream(), media_type=SSE)

        async def cancel(request: Request, owner: str | None) -> Response:
            cancelled = await self.cancel(
                request.path_params["thread_id"],
                request.query_params.get("run"),
                owner=owner,
            )
            return JSONResponse({"cancelled": cancelled})

        threads = f"{prefix}/threads"
        return [
            Route(f"{prefix}/agent", self.start_run, methods=["POST"]),
            Route(threads, scoped(list_threads), methods=["GET"]),
            Route(f"{threads}/{{thread_id}}", scoped(get_thread), methods=["GET"]),
            Route(f"{threads}/{{thread_id}}/stream", scoped(stream), methods=["GET"]),
            Route(f"{threads}/{{thread_id}}/cancel", scoped(cancel), methods=["POST"]),
        ]

    async def _request_owner(self, request: Request) -> str | None:
        if self._owner is None:
            return None
        owner = await _resolve(self._owner(request))
        if owner is None:
            raise _Unauthorized
        return str(owner)

    async def _record(self, thread_id: str, owner: str | None) -> ThreadRecord | None:
        record = await self.threads.get(thread_id)
        if record is None or record.owner != owner:
            return None
        return record

    async def _is_running(self, record: ThreadRecord) -> bool:
        if not record.running or not record.stream_id:
            return False
        # A run whose stream is gone died with its server and will not finish.
        return await self._safe_status(record.stream_id) == "streaming"

    def _cancel_local(self, stream_id: str) -> bool:
        token = self._tokens.get(stream_id)
        if token is None:
            return False
        token.cancel()
        return True

    async def _safe_status(self, stream_id: str) -> str | None:
        try:
            return await self.streams.status(stream_id)
        except ResumableStreamError:
            return None


def _stream_id(thread_id: str, run_id: str) -> str:
    # The length prefix keeps the id unambiguous when either part contains ".".
    return f"{len(thread_id)}-{thread_id}.{run_id}"


def _not_found() -> Response:
    return JSONResponse({"error": "thread not found"}, status_code=404)


def _unauthorized() -> Response:
    return JSONResponse({"error": "unauthorized"}, status_code=401)
