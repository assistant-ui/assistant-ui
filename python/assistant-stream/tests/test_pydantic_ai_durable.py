"""DurableAGUI: runs survive a closed client, and a reopened thread has every message once."""

from __future__ import annotations

import asyncio
import json
import os
import socket
import threading
import time
import uuid
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from dataclasses import replace
from pathlib import Path

import pytest

pytest.importorskip("pydantic_ai.ui.ag_ui", reason="needs the pydantic-ai extra")

import httpx
import uvicorn
from ag_ui.core import RunAgentInput
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage, UserPromptPart
from pydantic_ai.models.function import AgentInfo, FunctionModel
from pydantic_ai.ui.ag_ui import AGUIAdapter
from starlette.applications import Starlette
from starlette.requests import Request

from assistant_stream.pydantic_ai import (
    DurableAGUI,
    InMemoryThreadStore,
    PostgresThreadStore,
    SqliteThreadStore,
    ThreadRecord,
)
from assistant_stream.pydantic_ai.durable import KEEPALIVE_LINE, SSE
from assistant_stream.resumable import (
    create_in_memory_resumable_stream_store,
    create_resumable_stream_context,
    validate_stream_id,
)

WORDS = [f"w{index} " for index in range(12)]
GATE_AFTER = 3


class Model:
    """Streams WORDS, pausing after the first few until the test opens the gate."""

    def __init__(self) -> None:
        self.gate = threading.Event()
        self.calls = 0

    async def stream(
        self, messages: list[ModelMessage], info: AgentInfo
    ) -> AsyncIterator[str]:
        self.calls += 1
        for index, word in enumerate(WORDS):
            if index == GATE_AFTER:
                while not self.gate.is_set():
                    await asyncio.sleep(0.01)
            yield word


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


async def _thread_store(kind: str, tmp_path: Path):
    if kind == "postgres":
        return await PostgresThreadStore.connect(os.environ["DATABASE_URL"])
    return SqliteThreadStore(tmp_path / "threads.db")


def _stream_store(kind: str):
    """The store, and a coroutine function that removes its keys and closes it."""
    if kind == "redis":
        from redis.asyncio import Redis

        from assistant_stream.resumable import create_redis_resumable_stream_store

        client = Redis.from_url(os.environ["REDIS_URL"])
        prefix = f"aui-test-{uuid.uuid4().hex}"

        async def cleanup() -> None:
            keys = [key async for key in client.scan_iter(match=f"{prefix}*")]
            if keys:
                await client.delete(*keys)
            await client.aclose()

        return create_redis_resumable_stream_store(client, key_prefix=prefix), cleanup

    async def nothing() -> None:
        return None

    return create_in_memory_resumable_stream_store(), nothing


BACKENDS = [
    pytest.param(("sqlite", "memory"), id="sqlite+memory"),
    pytest.param(
        ("postgres", "redis"),
        id="postgres+redis",
        marks=pytest.mark.skipif(
            not (os.environ.get("DATABASE_URL") and os.environ.get("REDIS_URL")),
            reason="needs DATABASE_URL and REDIS_URL",
        ),
    ),
]


THREAD_BACKENDS = [
    "memory",
    "sqlite",
    pytest.param(
        "postgres",
        marks=pytest.mark.skipif(
            not os.environ.get("DATABASE_URL"), reason="needs DATABASE_URL"
        ),
    ),
]


class Server:
    def __init__(self, base_url: str, model: Model, app: Starlette) -> None:
        self.base_url = base_url
        self.model = model
        self.app = app

    @property
    def durable(self) -> DurableAGUI[None]:
        return self.app.state.durable

    def call(self, coroutine):
        return asyncio.run_coroutine_threadsafe(coroutine, self.app.state.loop).result(
            10
        )


def _user_header(request: Request) -> str | None:
    return request.headers.get("x-user")


@pytest.fixture(params=BACKENDS)
def server(request: pytest.FixtureRequest, tmp_path: Path) -> Iterator[Server]:
    threads_kind, streams_kind = request.param
    yield from _serve(tmp_path, threads_kind, streams_kind, owner=None)


@pytest.fixture
def owned_server(tmp_path: Path) -> Iterator[Server]:
    yield from _serve(tmp_path, "sqlite", "memory", owner=_user_header)


def _serve(
    tmp_path: Path, threads_kind: str, streams_kind: str, owner
) -> Iterator[Server]:
    model = Model()

    @asynccontextmanager
    async def lifespan(app: Starlette):
        threads = await _thread_store(threads_kind, tmp_path)
        store, cleanup_streams = _stream_store(streams_kind)
        streams = create_resumable_stream_context(store=store)
        app.state.durable = DurableAGUI(
            Agent(FunctionModel(stream_function=model.stream)),
            threads=threads,
            streams=streams,
            owner=owner,
        )
        app.state.loop = asyncio.get_running_loop()
        app.router.routes.extend(app.state.durable.routes())
        try:
            yield
        finally:
            model.gate.set()
            if isinstance(threads, PostgresThreadStore):
                await threads.close()
            await cleanup_streams()

    app = Starlette(lifespan=lifespan)
    port = _free_port()
    config = uvicorn.Config(app, port=port, log_level="warning", lifespan="on")
    uvicorn_server = uvicorn.Server(config)
    thread = threading.Thread(target=uvicorn_server.run, daemon=True)
    thread.start()
    deadline = time.monotonic() + 10
    while not uvicorn_server.started:
        assert time.monotonic() < deadline, "server did not start"
        time.sleep(0.02)
    try:
        yield Server(f"http://127.0.0.1:{port}", model, app)
    finally:
        model.gate.set()
        uvicorn_server.should_exit = True
        thread.join(timeout=10)


def _run_input(thread_id: str, messages: list[dict], run_id: str | None = None) -> dict:
    return {
        "threadId": thread_id,
        "runId": run_id or uuid.uuid4().hex,
        "state": {},
        "messages": messages,
        "tools": [],
        "context": [],
        "forwardedProps": {},
    }


def _user(text: str) -> dict:
    return {"id": uuid.uuid4().hex, "role": "user", "content": text}


def _events(lines: Iterator[str]) -> Iterator[dict]:
    for line in lines:
        if line.startswith("data: "):
            yield json.loads(line[len("data: ") :])


def _text(events: list[dict]) -> str:
    return "".join(
        event["delta"] for event in events if event["type"] == "TEXT_MESSAGE_CONTENT"
    )


def _wait_until(predicate, timeout: float = 10) -> None:
    deadline = time.monotonic() + timeout
    while not predicate():
        assert time.monotonic() < deadline, "condition not met in time"
        time.sleep(0.02)


def _thread(client: httpx.Client, thread_id: str) -> dict:
    response = client.get(f"/threads/{thread_id}")
    response.raise_for_status()
    return response.json()


def _assistant_texts(thread: dict) -> list[str]:
    return [
        message.get("content", "")
        for message in thread["messages"]
        if message["role"] == "assistant"
    ]


async def _start_run(durable: DurableAGUI, run_input: dict):
    async def receive():
        return {"type": "http.request", "body": json.dumps(run_input).encode()}

    return await durable.start_run(
        Request(
            {"type": "http", "method": "POST", "path": "/agent", "headers": []},
            receive,
        )
    )


async def _start_run_as(durable: DurableAGUI, run_input: dict, user: str):
    async def receive():
        return {"type": "http.request", "body": json.dumps(run_input).encode()}

    return await durable.start_run(
        Request(
            {
                "type": "http",
                "method": "POST",
                "path": "/agent",
                "headers": [(b"x-user", user.encode())],
            },
            receive,
        )
    )


def test_concurrent_starts_by_two_owners_do_not_share_a_stream() -> None:
    async def scenario() -> None:
        bob_waiting = asyncio.Event()
        release_bob = asyncio.Event()
        started = asyncio.Event()
        release_model = asyncio.Event()
        prompts: list[list[str]] = []

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            prompts.append(
                [
                    part.content
                    for message in messages
                    for part in message.parts
                    if isinstance(part, UserPromptPart)
                ]
            )
            yield "Alice's answer"
            started.set()
            await release_model.wait()

        async def options(request: Request, run_input):
            if request.headers.get("x-user") == "bob":
                bob_waiting.set()
                await release_bob.wait()
            return {}

        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(),
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=stream)),
            streams=streams,
            owner=_user_header,
            run_options=options,
        )
        # Both pass the owner check while the thread does not exist yet.
        bob = asyncio.create_task(
            _start_run_as(durable, _run_input("thread", [_user("Bob")], "run"), "bob")
        )
        await bob_waiting.wait()
        alice = await _start_run_as(
            durable, _run_input("thread", [_user("Alice")], "run"), "alice"
        )
        await started.wait()
        release_bob.set()
        intruder = await bob

        try:
            assert alice.status_code == 200
            assert intruder.status_code == 404
            assert not hasattr(intruder, "body_iterator")
        finally:
            release_model.set()

        async def alice_done() -> dict:
            while True:
                thread = await durable.get_thread("thread", owner="alice")
                if thread is not None and not thread["running"]:
                    return thread
                await asyncio.sleep(0.01)

        thread = await asyncio.wait_for(alice_done(), timeout=5)
        assert _assistant_texts(thread) == ["Alice's answer"]
        assert await durable.get_thread("thread", owner="bob") is None
        assert prompts == [["Alice"]]

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


def test_owned_runs_refuse_the_same_bad_ids_as_ownerless_ones() -> None:
    async def scenario() -> None:
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=Model().stream)),
            owner=_user_header,
        )
        for thread_id, run_id in [("bad id", "run"), ("a/b", "run"), ("t", "x" * 300)]:
            response = await _start_run_as(
                durable, _run_input(thread_id, [_user("Hi")], run_id), "alice"
            )
            assert response.status_code == 400, (thread_id, run_id)

    asyncio.run(scenario())


def test_owner_scoped_stream_ids_are_valid_and_distinct() -> None:
    from assistant_stream.pydantic_ai.durable import _stream_id

    assert _stream_id("t", "r") == "1-t.r"
    alice = _stream_id("t", "r", "alice")
    bob = _stream_id("t", "r", "bob")
    assert alice != bob
    assert _stream_id("t", "r", "alice") == alice
    long = _stream_id("t" * 200, "r" * 200, "o" * 200)
    assert long.startswith("o-")
    for stream_id in (alice, bob, long, _stream_id("t", "r", "a/b c\n")):
        validate_stream_id(stream_id)


def test_start_run_is_visible_and_cancellable_before_producer_runs() -> None:
    async def scenario() -> None:
        model = Model()
        model.gate.set()
        finished = asyncio.Event()
        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(),
            on_finalize=lambda *_: finished.set(),
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=model.stream)), streams=streams
        )
        question = _user("Hi")

        response = await _start_run(durable, _run_input("thread", [question], "run"))

        assert response.status_code == 200
        assert await durable.get_thread("thread") == {
            "id": "thread",
            "messages": [question],
            "running": True,
            "runId": "run",
        }
        assert await durable.cancel("thread", "run") is True
        assert model.calls == 0

        await finished.wait()

        assert model.calls == 0
        assert await durable.get_thread("thread") == {
            "id": "thread",
            "messages": [question],
            "running": False,
            "runId": "run",
        }

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


def test_get_thread_includes_answer_when_run_finishes_during_status_check(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def scenario() -> None:
        started = asyncio.Event()
        release = asyncio.Event()
        finished = asyncio.Event()

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            yield "Hello "
            started.set()
            await release.wait()
            yield "again"

        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(),
            on_finalize=lambda *_: finished.set(),
        )
        durable = DurableAGUI(Agent(FunctionModel(stream_function=stream)), streams=streams)
        question = _user("Hi")
        await _start_run(durable, _run_input("thread", [question], "run"))
        await started.wait()
        status = streams.status

        async def finish_during_status_check(stream_id: str):
            release.set()
            await finished.wait()
            return await status(stream_id)

        monkeypatch.setattr(streams, "status", finish_during_status_check)

        thread = await durable.get_thread("thread")

        assert thread is not None
        assert thread["running"] is False
        assert thread["runId"] == "run"
        assert thread["messages"][0] == question
        assert _assistant_texts(thread) == ["Hello again"]

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


def test_cancel_reaches_producer_after_concurrent_starts() -> None:
    async def scenario() -> None:
        duplicate_waiting = asyncio.Event()
        release_duplicate = asyncio.Event()
        started = asyncio.Event()
        release_model = asyncio.Event()
        cancelled = asyncio.Event()
        finished = asyncio.Event()
        calls = 0

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            nonlocal calls
            calls += 1
            yield "Partial answer"
            started.set()
            try:
                await release_model.wait()
            except asyncio.CancelledError:
                cancelled.set()
                raise
            yield " completed"

        async def options(request: Request, run_input):
            if run_input.messages[0].content == "Duplicate":
                duplicate_waiting.set()
                await release_duplicate.wait()
            return {}

        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(),
            on_finalize=lambda *_: finished.set(),
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=stream)),
            streams=streams,
            run_options=options,
        )
        question = _user("Original")
        duplicate = asyncio.create_task(
            _start_run(durable, _run_input("thread", [_user("Duplicate")], "run"))
        )
        await duplicate_waiting.wait()
        producer = await _start_run(durable, _run_input("thread", [question], "run"))
        await started.wait()
        release_duplicate.set()
        consumer = await duplicate

        try:
            assert producer.status_code == consumer.status_code == 200
            assert await durable.cancel("thread", "run") is True
            try:
                await asyncio.wait_for(cancelled.wait(), timeout=1)
            except asyncio.TimeoutError:
                pytest.fail("cancel did not reach the producer")
        finally:
            release_model.set()
            await asyncio.wait_for(finished.wait(), timeout=5)

        assert calls == 1
        thread = await durable.get_thread("thread")
        assert thread is not None
        assert thread["running"] is False
        assert thread["messages"][0] == question
        assert _assistant_texts(thread) == ["Partial answer"]

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


@pytest.mark.parametrize("first_run", ["first", "second"])
@pytest.mark.parametrize("kind", ["memory", "sqlite"])
def test_concurrent_distinct_runs_cancel_the_superseded_producer(
    first_run: str, kind: str, tmp_path: Path
) -> None:
    async def scenario() -> None:
        questions = {"first": _user("First"), "second": _user("Second")}
        waiting = {run_id: asyncio.Event() for run_id in questions}
        release = {run_id: asyncio.Event() for run_id in questions}
        started = {run_id: asyncio.Event() for run_id in questions}
        cancelled = {run_id: asyncio.Event() for run_id in questions}
        finished = {run_id: asyncio.Event() for run_id in questions}
        release_model = asyncio.Event()

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            run_id = messages[-1].parts[-1].content.lower()
            yield f"Partial {run_id}"
            started[run_id].set()
            try:
                await release_model.wait()
            except asyncio.CancelledError:
                cancelled[run_id].set()
                raise
            yield " completed"

        async def options(request: Request, run_input):
            waiting[run_input.run_id].set()
            await release[run_input.run_id].wait()
            return {}

        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(),
            on_finalize=lambda stream_id, *_: finished[stream_id.rsplit(".", 1)[1]].set(),
        )
        threads = (
            InMemoryThreadStore()
            if kind == "memory"
            else SqliteThreadStore(tmp_path / "threads.db")
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=stream)),
            threads=threads,
            streams=streams,
            run_options=options,
        )
        history = _user("Earlier")
        inputs = {
            run_id: _run_input("thread", [history, question], run_id)
            for run_id, question in questions.items()
        }
        starts = {
            run_id: asyncio.create_task(_start_run(durable, run_input))
            for run_id, run_input in inputs.items()
        }
        await asyncio.gather(*(event.wait() for event in waiting.values()))
        winner = "second" if first_run == "first" else "first"

        try:
            release[first_run].set()
            assert (await starts[first_run]).status_code == 200
            await started[first_run].wait()
            release[winner].set()
            assert (await starts[winner]).status_code == 200
            await started[winner].wait()

            record = await threads.get("thread")
            assert record is not None
            assert record.run_id == winner
            assert record.stream_id == f"6-thread.{winner}"
            assert record.messages == inputs[winner]["messages"]
            assert record.running is True
            try:
                await asyncio.wait_for(cancelled[first_run].wait(), timeout=1)
            except asyncio.TimeoutError:
                pytest.fail("superseding the run did not cancel its producer")
            await finished[first_run].wait()

            assert cancelled[winner].is_set() is False
            assert await durable.get_thread("thread") == {
                "id": "thread",
                "messages": inputs[winner]["messages"],
                "running": True,
                "runId": winner,
            }
        finally:
            release_model.set()
            await asyncio.gather(*(event.wait() for event in finished.values()))

        thread = await durable.get_thread("thread")
        assert thread is not None
        assert thread["runId"] == winner
        assert thread["running"] is False
        assert thread["messages"][:2] == inputs[winner]["messages"]
        assert len(thread["messages"]) == 3
        assert _assistant_texts(thread) == [f"Partial {winner} completed"]

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


@pytest.mark.parametrize("kind", ["memory", "sqlite"])
def test_dead_producer_does_not_reclaim_a_concurrent_run(
    kind: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def scenario() -> None:
        claiming = asyncio.Event()
        release_claim = asyncio.Event()
        started = asyncio.Event()
        release_model = asyncio.Event()
        cancelled = asyncio.Event()
        producers = []
        threads = (
            InMemoryThreadStore()
            if kind == "memory"
            else SqliteThreadStore(tmp_path / "threads.db")
        )
        put_if_stream = threads.put_if_stream

        async def pause_first_claim(thread_id, record, *, expected):
            if record.run_id == "first":
                claiming.set()
                await release_claim.wait()
            return await put_if_stream(thread_id, record, expected=expected)

        monkeypatch.setattr(threads, "put_if_stream", pause_first_claim)

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            yield "Partial answer"
            started.set()
            try:
                await release_model.wait()
            except asyncio.CancelledError:
                cancelled.set()
                raise
            yield " completed"

        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(), wait_until=producers.append
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=stream)), threads=threads, streams=streams
        )
        first = asyncio.create_task(
            _start_run(durable, _run_input("thread", [_user("First")], "first"))
        )
        await claiming.wait()
        producers[0].cancel()
        await asyncio.gather(producers[0], return_exceptions=True)
        question = _user("Second")

        try:
            assert (
                await _start_run(durable, _run_input("thread", [question], "second"))
            ).status_code == 200
            await started.wait()
            release_claim.set()
            assert (await first).status_code == 200
            assert "6-thread.first" not in durable._tokens
        finally:
            release_claim.set()
            release_model.set()
            await first
            await asyncio.gather(*producers[1:])

        assert cancelled.is_set() is False
        record = await threads.get("thread")
        assert record is not None
        assert record.run_id == "second"
        assert record.stream_id == "6-thread.second"
        assert record.running is False
        thread = await durable.get_thread("thread")
        assert thread is not None
        assert thread["runId"] == "second"
        assert thread["messages"][0] == question
        assert _assistant_texts(thread) == ["Partial answer completed"]

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


@pytest.mark.parametrize("kind", THREAD_BACKENDS)
def test_producer_cancelled_at_registration_never_claims_a_live_thread(
    kind: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def scenario() -> None:
        started = asyncio.Event()
        release_model = asyncio.Event()
        producers: list[asyncio.Task[None]] = []
        threads = await _shared_threads(kind, tmp_path)
        writes: list[ThreadRecord] = []

        def cancel_second_producer(task: asyncio.Task[None]) -> None:
            producers.append(task)
            if len(producers) == 2:
                task.cancel()

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            yield "Partial answer"
            started.set()
            await release_model.wait()
            yield " completed"

        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(),
            wait_until=cancel_second_producer,
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=stream)), threads=threads, streams=streams
        )
        question = _user("First")
        try:
            assert (
                await _start_run(durable, _run_input("thread", [question], "first"))
            ).status_code == 200
            await started.wait()
            live = await threads.get("thread")
            assert live is not None and live.running is True
            put_if_stream = threads.put_if_stream

            async def track_claim(thread_id, record, *, expected):
                claimed = await put_if_stream(thread_id, record, expected=expected)
                if claimed:
                    writes.append(record)
                return claimed

            monkeypatch.setattr(threads, "put_if_stream", track_claim)
            assert (
                await _start_run(
                    durable, _run_input("thread", [_user("Second")], "second")
                )
            ).status_code == 200

            assert writes == []
            assert await threads.get("thread") == live
            resumed = await durable.resume_stream("thread")
            assert resumed is not None
            release_model.set()
            frames = _frames([chunk async for chunk in resumed])
            await asyncio.gather(*producers, return_exceptions=True)
            assert frames[0]["runId"] == "first"
            assert _text(frames) == "Partial answer completed"
            thread = await durable.get_thread("thread")
            assert thread is not None
            assert thread["runId"] == "first"
            assert thread["running"] is False
            assert thread["messages"][0] == question
            assert _assistant_texts(thread) == ["Partial answer completed"]
        finally:
            release_model.set()
            await asyncio.gather(*producers, return_exceptions=True)
            await _drop(threads)

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


@pytest.mark.parametrize("kind", THREAD_BACKENDS)
def test_producer_cancelled_at_registration_preserves_another_owners_finished_thread(
    kind: str, tmp_path: Path
) -> None:
    async def scenario() -> None:
        alice_waiting = asyncio.Event()
        release_alice = asyncio.Event()
        producers: list[asyncio.Task[None]] = []
        threads = await _shared_threads(kind, tmp_path)
        model = Model()
        model.gate.set()

        def cancel_second_producer(task: asyncio.Task[None]) -> None:
            producers.append(task)
            if len(producers) == 2:
                task.cancel()

        async def options(request: Request, run_input):
            if request.headers.get("x-user") == "alice":
                alice_waiting.set()
                await release_alice.wait()
            return {}

        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(),
            wait_until=cancel_second_producer,
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=model.stream)),
            threads=threads,
            streams=streams,
            owner=_user_header,
            run_options=options,
        )
        alice = asyncio.create_task(
            _start_run_as(durable, _run_input("thread", [_user("Alice")], "run"), "alice")
        )
        try:
            await alice_waiting.wait()
            assert await threads.get("thread") is None
            question = _user("Bob")
            assert (
                await _start_run_as(
                    durable, _run_input("thread", [question], "run"), "bob"
                )
            ).status_code == 200
            await asyncio.gather(*producers)
            previous = await threads.get("thread")
            assert previous is not None
            assert previous.owner == "bob"
            assert previous.running is False
            assert previous.messages[0] == question
            assert _assistant_texts({"messages": previous.messages}) == ["".join(WORDS)]

            release_alice.set()
            assert (await alice).status_code == 200

            assert producers[1].cancelled()
            assert await threads.get("thread") == previous
            await asyncio.gather(*producers, return_exceptions=True)
            assert await threads.get("thread") == previous
            assert await durable.get_thread("thread", owner="alice") is None
            thread = await durable.get_thread("thread", owner="bob")
            assert thread is not None
            assert thread["running"] is False
            assert thread["messages"] == previous.messages
            assert model.calls == 1
        finally:
            release_alice.set()
            await asyncio.gather(alice, return_exceptions=True)
            await asyncio.gather(*producers, return_exceptions=True)
            await _drop(threads)

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


@pytest.mark.parametrize("kind", THREAD_BACKENDS)
def test_producer_cancelled_at_registration_saves_input_when_previous_stream_is_missing(
    kind: str, tmp_path: Path
) -> None:
    async def scenario() -> None:
        producers: list[asyncio.Task[None]] = []
        threads = await _shared_threads(kind, tmp_path)
        model = Model()

        def cancel_producer(task: asyncio.Task[None]) -> None:
            producers.append(task)
            if len(producers) == 1:
                task.cancel()

        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(), wait_until=cancel_producer
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=model.stream)),
            threads=threads,
            streams=streams,
            owner=_user_header,
        )
        previous = ThreadRecord(
            messages=[_user("Existing")],
            stream_id="6-thread.existing",
            run_id="existing",
            running=True,
            owner="alice",
        )
        question = _user("New")
        try:
            await threads.put("thread", previous)
            assert await streams.status(previous.stream_id) == "missing"

            assert (
                await _start_run_as(
                    durable, _run_input("thread", [question], "run"), "alice"
                )
            ).status_code == 200
            await asyncio.gather(*producers, return_exceptions=True)

            assert producers[0].cancelled()
            record = await threads.get("thread")
            assert record is not None
            assert record.messages == [question]
            assert record.running is False
            assert record.run_id == "run"
            assert record.owner == "alice"
            assert model.calls == 0
        finally:
            await asyncio.gather(*producers, return_exceptions=True)
            await _drop(threads)

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


@pytest.mark.parametrize("kind", THREAD_BACKENDS)
@pytest.mark.parametrize("superseded", [False, True], ids=["finished", "third-run"])
def test_producer_cancelled_at_registration_updates_only_the_finished_run(
    kind: str, superseded: bool, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def scenario() -> None:
        release_model = asyncio.Event()
        producers: list[asyncio.Task[None]] = []
        threads = await _shared_threads(kind, tmp_path)
        writes: list[tuple[str | None, bool]] = []
        third: ThreadRecord | None = None

        def cancel_second_producer(task: asyncio.Task[None]) -> None:
            producers.append(task)
            if len(producers) == 2:
                task.cancel()

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            if messages[-1].parts[-1].content == "Third":
                await release_model.wait()
            yield "Answer"

        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(),
            wait_until=cancel_second_producer,
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=stream)), threads=threads, streams=streams
        )
        first_question = _user("First")
        second_question = _user("Second")
        third_question = _user("Third")
        try:
            assert (
                await _start_run(durable, _run_input("thread", [first_question], "first"))
            ).status_code == 200
            await asyncio.gather(*producers)
            previous = await threads.get("thread")
            assert previous is not None and previous.running is False
            assert previous.run_id == "first"
            assert previous.messages[0] == first_question
            assert _assistant_texts({"messages": previous.messages}) == ["Answer"]
            input_messages = [*previous.messages, second_question]
            put_if_stream = threads.put_if_stream

            async def interleave_third_run(thread_id, record, *, expected):
                nonlocal third
                if record.run_id == "second" and superseded:
                    assert (
                        await _start_run(
                            durable,
                            _run_input("thread", [*input_messages, third_question], "third"),
                        )
                    ).status_code == 200
                    third = await threads.get("thread")
                    assert third is not None and third.running is True
                written = await put_if_stream(thread_id, record, expected=expected)
                if record.run_id == "second":
                    writes.append((expected, written))
                return written

            monkeypatch.setattr(threads, "put_if_stream", interleave_third_run)
            assert (
                await _start_run(durable, _run_input("thread", input_messages, "second"))
            ).status_code == 200
            record = await threads.get("thread")
            assert record is not None
            if superseded:
                assert record == third
                assert record.run_id == "third"
                assert record.messages == [*input_messages, third_question]
                assert record.running is True
            else:
                assert record.run_id == "second"
                assert record.stream_id == "6-thread.second"
                assert record.messages == input_messages
                assert record.running is False
            assert writes == [(previous.stream_id, not superseded)]
            assert "6-thread.second" not in durable._tokens
            release_model.set()
            await asyncio.gather(*producers, return_exceptions=True)
            thread = await durable.get_thread("thread")
            assert thread is not None
            assert thread["runId"] == ("third" if superseded else "second")
            assert thread["running"] is False
            if superseded:
                assert thread["messages"][:-1] == [*input_messages, third_question]
                assert _assistant_texts(thread) == ["Answer", "Answer"]
            else:
                assert thread["messages"] == input_messages
            assert producers[1].cancelled()
            assert await durable.cancel("thread", "second") is False
        finally:
            release_model.set()
            await asyncio.gather(*producers, return_exceptions=True)
            await _drop(threads)

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


@pytest.mark.parametrize("kind", THREAD_BACKENDS)
def test_dead_claim_rollback_does_not_overwrite_a_third_run(
    kind: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def scenario() -> None:
        started = asyncio.Event()
        release_model = asyncio.Event()
        producers: list[asyncio.Task[None]] = []
        threads = await _shared_threads(kind, tmp_path)
        rollbacks: list[bool] = []
        third: ThreadRecord | None = None

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            yield f"Partial {messages[-1].parts[-1].content}"
            started.set()
            await release_model.wait()
            yield " completed"

        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(), wait_until=producers.append
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=stream)), threads=threads, streams=streams
        )
        try:
            await _start_run(durable, _run_input("thread", [_user("First")], "first"))
            await started.wait()
            second_producer = len(producers)
            put_if_stream = threads.put_if_stream

            async def interleave_third_run(thread_id, record, *, expected):
                nonlocal third
                claimed = await put_if_stream(thread_id, record, expected=expected)
                if record.run_id == "second":
                    assert claimed
                    producers[second_producer].cancel()
                    await asyncio.gather(
                        producers[second_producer], return_exceptions=True
                    )
                    started.clear()
                    assert (
                        await _start_run(
                            durable, _run_input("thread", [_user("Third")], "third")
                        )
                    ).status_code == 200
                    await started.wait()
                    third = await threads.get("thread")
                    assert third is not None and third.running is True
                elif record.run_id == "first":
                    rollbacks.append(claimed)
                return claimed

            monkeypatch.setattr(threads, "put_if_stream", interleave_third_run)
            assert (
                await _start_run(
                    durable, _run_input("thread", [_user("Second")], "second")
                )
            ).status_code == 200

            assert await threads.get("thread") == third
            assert rollbacks == [False]
            release_model.set()
            await asyncio.gather(*producers, return_exceptions=True)
            thread = await durable.get_thread("thread")
            assert thread is not None
            assert thread["runId"] == "third"
            assert thread["running"] is False
            assert _assistant_texts(thread) == ["Partial Third completed"]
        finally:
            release_model.set()
            await asyncio.gather(*producers, return_exceptions=True)
            await _drop(threads)

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


@pytest.mark.parametrize("kind", THREAD_BACKENDS)
@pytest.mark.parametrize("state", ["settled", "cancel_requested"])
def test_dead_claim_rollback_uses_the_previous_runs_current_state(
    kind: str, state: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def scenario() -> None:
        started = asyncio.Event()
        release_model = asyncio.Event()
        waiting = asyncio.Event()
        release_options = asyncio.Event()
        finalizing = asyncio.Event()
        release_finalize = asyncio.Event()
        producers: list[asyncio.Task[None]] = []
        threads = await _shared_threads(kind, tmp_path)
        store = create_in_memory_resumable_stream_store()
        finalize = store.finalize

        async def pause_finalization(stream_id, *args, **kwargs):
            if stream_id == "6-thread.first":
                finalizing.set()
                await release_finalize.wait()
            return await finalize(stream_id, *args, **kwargs)

        monkeypatch.setattr(store, "finalize", pause_finalization)

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            yield "Partial answer"
            started.set()
            await release_model.wait()
            yield " completed"

        async def options(request: Request, run_input):
            if run_input.run_id == "second":
                waiting.set()
                await release_options.wait()
            return {}

        streams = create_resumable_stream_context(
            store=store, wait_until=producers.append
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=stream)),
            threads=threads,
            streams=streams,
            run_options=options,
            cancel_poll_interval=None,
        )
        second = None
        try:
            await _start_run(durable, _run_input("thread", [_user("First")], "first"))
            await started.wait()
            second = asyncio.create_task(
                _start_run(durable, _run_input("thread", [_user("Second")], "second"))
            )
            await waiting.wait()
            if state == "settled":
                release_model.set()
                await finalizing.wait()
            else:
                assert await threads.request_cancel("thread", "6-thread.first")
            current = await threads.get("thread")
            assert current is not None
            assert current.running is (state != "settled")
            assert current.cancel_requested is (state == "cancel_requested")
            assert await streams.status("6-thread.first") == "streaming"

            second_producer = len(producers)
            put_if_stream = threads.put_if_stream
            restored: list[ThreadRecord] = []

            async def die_after_claim(thread_id, record, *, expected):
                claimed = await put_if_stream(thread_id, record, expected=expected)
                if record.run_id == "second":
                    assert claimed
                    producers[second_producer].cancel()
                    await asyncio.gather(
                        producers[second_producer], return_exceptions=True
                    )
                elif claimed:
                    restored.append(record)
                return claimed

            monkeypatch.setattr(threads, "put_if_stream", die_after_claim)
            release_options.set()
            assert (await second).status_code == 200
            record = await threads.get("thread")
            assert record is not None
            if state == "settled":
                assert record.running is False
                assert record.run_id == "second"
                assert restored == []
            else:
                assert record == current
                assert record.cancel_requested is True
                assert restored == [current]
        finally:
            release_options.set()
            release_model.set()
            release_finalize.set()
            if second is not None:
                await second
            await asyncio.gather(*producers, return_exceptions=True)
            await _drop(threads)

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


@pytest.mark.parametrize("kind", THREAD_BACKENDS)
@pytest.mark.parametrize("state", ["settled", "cancel_requested"])
def test_dead_claim_rollback_restores_a_change_that_lands_during_the_claim(
    kind: str, state: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def scenario() -> None:
        started = asyncio.Event()
        release_model = asyncio.Event()
        finalizing = asyncio.Event()
        release_finalize = asyncio.Event()
        producers: list[asyncio.Task[None]] = []
        threads = await _shared_threads(kind, tmp_path)
        store = create_in_memory_resumable_stream_store()
        finalize = store.finalize

        async def pause_finalization(stream_id, *args, **kwargs):
            if stream_id == "6-thread.first":
                finalizing.set()
                await release_finalize.wait()
            return await finalize(stream_id, *args, **kwargs)

        monkeypatch.setattr(store, "finalize", pause_finalization)

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            yield "Partial answer"
            started.set()
            await release_model.wait()
            yield " completed"

        streams = create_resumable_stream_context(
            store=store, wait_until=producers.append
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=stream)),
            threads=threads,
            streams=streams,
            cancel_poll_interval=None,
        )
        changed: ThreadRecord | None = None
        try:
            await _start_run(durable, _run_input("thread", [_user("First")], "first"))
            await started.wait()
            second_producer = len(producers)

            async def change_then_die(record, write):
                nonlocal changed
                if record.run_id != "second" or not record.running:
                    await write()
                    return
                if state == "settled":
                    release_model.set()
                    await finalizing.wait()
                else:
                    assert await threads.request_cancel("thread", "6-thread.first")
                changed = await threads.get("thread")
                assert await write(), "the second run did not claim the thread"
                producers[second_producer].cancel()
                await asyncio.gather(producers[second_producer], return_exceptions=True)

            _on_claim(monkeypatch, threads, change_then_die)
            assert (
                await _start_run(
                    durable, _run_input("thread", [_user("Second")], "second")
                )
            ).status_code == 200

            assert changed is not None
            assert changed.running is (state != "settled")
            assert changed.cancel_requested is (state == "cancel_requested")
            assert await threads.get("thread") == changed
        finally:
            release_model.set()
            release_finalize.set()
            await asyncio.gather(*producers, return_exceptions=True)
            await _drop(threads)

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


@pytest.mark.parametrize("kind", ["memory", "sqlite"])
def test_producer_dead_after_its_claim_gives_the_thread_back_to_the_live_run(
    kind: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def scenario() -> None:
        started = asyncio.Event()
        release_model = asyncio.Event()
        cancelled = asyncio.Event()
        producers: list[asyncio.Task[None]] = []
        threads = (
            InMemoryThreadStore()
            if kind == "memory"
            else SqliteThreadStore(tmp_path / "threads.db")
        )

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            yield "Partial answer"
            started.set()
            try:
                await release_model.wait()
            except asyncio.CancelledError:
                cancelled.set()
                raise
            yield " completed"

        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(), wait_until=producers.append
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=stream)), threads=threads, streams=streams
        )
        question = _user("First")
        try:
            assert (
                await _start_run(durable, _run_input("thread", [question], "first"))
            ).status_code == 200
            await started.wait()
            live = await threads.get("thread")
            assert live is not None and live.running is True

            second_producer = len(producers)
            put_if_stream = threads.put_if_stream

            async def die_after_claim(thread_id, record, *, expected):
                claimed = await put_if_stream(thread_id, record, expected=expected)
                if record.run_id == "second":
                    assert claimed, "the second run did not claim the thread"
                    producers[second_producer].cancel()
                    await asyncio.gather(
                        producers[second_producer], return_exceptions=True
                    )
                return claimed

            monkeypatch.setattr(threads, "put_if_stream", die_after_claim)
            assert (
                await _start_run(
                    durable, _run_input("thread", [_user("Second")], "second")
                )
            ).status_code == 200

            assert await threads.get("thread") == live
        finally:
            release_model.set()
            await asyncio.gather(*producers, return_exceptions=True)

        assert cancelled.is_set() is False
        thread = await durable.get_thread("thread")
        assert thread is not None
        assert thread["runId"] == "first"
        assert thread["running"] is False
        assert thread["messages"][0] == question
        assert _assistant_texts(thread) == ["Partial answer completed"]

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


@pytest.mark.parametrize("kind", ["memory", "sqlite"])
def test_producer_dead_after_its_claim_does_not_restore_a_run_that_finished(
    kind: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def scenario() -> None:
        waiting = asyncio.Event()
        release_options = asyncio.Event()
        producers: list[asyncio.Task[None]] = []
        threads = (
            InMemoryThreadStore()
            if kind == "memory"
            else SqliteThreadStore(tmp_path / "threads.db")
        )

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            yield "Answer"

        async def options(request: Request, run_input):
            if run_input.run_id == "second":
                waiting.set()
                await release_options.wait()
            return {}

        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(), wait_until=producers.append
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=stream)),
            threads=threads,
            streams=streams,
            run_options=options,
        )
        question = _user("Second")
        try:
            assert (
                await _start_run(durable, _run_input("thread", [_user("First")], "first"))
            ).status_code == 200
            second = asyncio.create_task(
                _start_run(durable, _run_input("thread", [question], "second"))
            )
            await waiting.wait()
            await asyncio.gather(*producers, return_exceptions=True)
            finished = await threads.get("thread")
            assert finished is not None and finished.running is False

            second_producer = len(producers)
            put_if_stream = threads.put_if_stream

            async def die_after_claim(thread_id, record, *, expected):
                claimed = await put_if_stream(thread_id, record, expected=expected)
                if record.run_id == "second":
                    producers[second_producer].cancel()
                    await asyncio.gather(
                        producers[second_producer], return_exceptions=True
                    )
                return claimed

            monkeypatch.setattr(threads, "put_if_stream", die_after_claim)
            release_options.set()
            assert (await second).status_code == 200
        finally:
            release_options.set()
            await asyncio.gather(*producers, return_exceptions=True)

        record = await threads.get("thread")
        assert record is not None
        assert record.running is False
        assert record.run_id == "second"
        assert record.messages == [question]

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


@pytest.mark.parametrize("kind", ["memory", "sqlite"])
def test_producer_dead_before_first_claim_leaves_existing_record_untouched(
    kind: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def scenario() -> None:
        producers = []

        def cancel_producer(task: asyncio.Task[None]) -> None:
            producers.append(task)
            task.cancel()

        model = Model()
        threads = (
            InMemoryThreadStore()
            if kind == "memory"
            else SqliteThreadStore(tmp_path / "threads.db")
        )
        existing = ThreadRecord(
            messages=[_user("Existing")],
            stream_id="6-thread.existing",
            run_id="existing",
            running=True,
        )
        await threads.put("thread", existing)
        stream_store = create_in_memory_resumable_stream_store()
        await stream_store.acquire(existing.stream_id)
        assert await stream_store.status(existing.stream_id) == "streaming"
        streams = create_resumable_stream_context(
            store=stream_store, wait_until=cancel_producer
        )
        run = type(streams).run

        async def finish_before_claim(context, stream_id, make_stream):
            body = await run(context, stream_id, make_stream)
            await asyncio.gather(*producers, return_exceptions=True)
            return body

        monkeypatch.setattr(type(streams), "run", finish_before_claim)
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=model.stream)),
            threads=threads,
            streams=streams,
        )

        assert (
            await _start_run(durable, _run_input("thread", [_user("New")], "run"))
        ).status_code == 200

        assert await threads.get("thread") == existing
        assert model.calls == 0
        assert "6-thread.run" not in durable._tokens

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


def test_producer_cancelled_during_startup_does_not_leave_a_running_record(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def scenario() -> None:
        installing = asyncio.Event()
        release_install = asyncio.Event()
        producers = []
        model = Model()
        threads = InMemoryThreadStore()

        for method_name in ("put", "put_if_current", "put_if_stream"):
            write = getattr(threads, method_name)

            async def pause_install(thread_id, record, write=write, **kwargs):
                if record.running:
                    installing.set()
                    await release_install.wait()
                return await write(thread_id, record, **kwargs)

            monkeypatch.setattr(threads, method_name, pause_install)

        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(), wait_until=producers.append
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=model.stream)),
            threads=threads,
            streams=streams,
        )
        question = _user("Hi")
        start = asyncio.create_task(
            _start_run(durable, _run_input("thread", [question], "run"))
        )
        await installing.wait()
        assert len(producers) == 1
        producers[0].cancel()
        await asyncio.gather(*producers, return_exceptions=True)
        release_install.set()

        assert (await start).status_code == 200
        assert model.calls == 0
        record = await threads.get("thread")
        assert record is not None
        assert record.running is False
        assert record.run_id == "run"
        assert record.messages == [question]
        assert await durable.cancel("thread", "run") is False

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


def test_producer_cancelled_before_entering_stream_does_not_leave_a_running_record() -> None:
    async def scenario() -> None:
        producers = []

        def cancel_producer(task: asyncio.Task[None]) -> None:
            producers.append(task)
            task.cancel()

        model = Model()
        streams = create_resumable_stream_context(
            store=create_in_memory_resumable_stream_store(), wait_until=cancel_producer
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=model.stream)), streams=streams
        )
        question = _user("Hi")

        assert (
            await _start_run(durable, _run_input("thread", [question], "run"))
        ).status_code == 200
        await asyncio.gather(*producers, return_exceptions=True)

        record = await durable.threads.get("thread")
        assert record is not None
        assert record.running is False
        assert record.run_id == "run"
        assert record.messages == [question]
        assert model.calls == 0
        assert await durable.cancel("thread", "run") is False
        assert "6-thread.run" not in durable._tokens

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


def test_cancelled_startup_is_not_replaced_by_its_pending_cleanup(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def scenario() -> None:
        tasks: list[asyncio.Task[None]] = []
        finalizing = asyncio.Event()
        release = asyncio.Event()
        store = create_in_memory_resumable_stream_store()
        finalize = store.finalize

        async def delayed_finalize(*args, **kwargs):
            finalizing.set()
            await release.wait()
            return await finalize(*args, **kwargs)

        def cancel_producer(task: asyncio.Task[None]) -> None:
            tasks.append(task)
            if len(tasks) == 1:
                task.cancel()

        monkeypatch.setattr(store, "finalize", delayed_finalize)
        streams = create_resumable_stream_context(
            store=store, wait_until=cancel_producer
        )
        model = Model()
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=model.stream)), streams=streams
        )
        question = _user("Hi")
        try:
            response = await _start_run(
                durable, _run_input("thread", [question], "run")
            )
            await asyncio.wait_for(finalizing.wait(), timeout=1)
            record = await durable.threads.get("thread")
            assert response.status_code == 200
            assert record is not None
            assert record.messages == [question]
            assert record.running is False
            assert model.calls == 0
            assert await durable.cancel("thread", "run") is False
            assert tasks[0].cancelled()
            assert len(tasks) == 2 and not tasks[1].done()
        finally:
            release.set()
            await asyncio.gather(*tasks, return_exceptions=True)

        assert await streams.status("6-thread.run") == "error"

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


def _start_and_disconnect(client: httpx.Client, thread_id: str, messages: list[dict]):
    """POST a run, read until the gate holds it mid-answer, then drop the connection."""
    seen: list[dict] = []
    with client.stream(
        "POST", "/agent", json=_run_input(thread_id, messages)
    ) as response:
        assert response.status_code == 200
        for event in _events(response.iter_lines()):
            seen.append(event)
            if _text(seen) == "".join(WORDS[:GATE_AFTER]):
                break
    return seen


def test_run_finishes_after_the_client_disconnects(server: Server) -> None:
    thread_id = uuid.uuid4().hex
    question = _user("Hi")
    with httpx.Client(base_url=server.base_url, timeout=10) as client:
        before = _start_and_disconnect(client, thread_id, [question])
        assert _text(before) == "".join(WORDS[:GATE_AFTER])

        reopened = _thread(client, thread_id)
        assert reopened["running"] is True
        assert reopened["messages"] == [question]

        server.model.gate.set()
        with client.stream("GET", f"/threads/{thread_id}/stream") as response:
            replay = list(_events(response.iter_lines()))

        assert [event["type"] for event in replay][0] == "RUN_STARTED"
        assert replay[-1]["type"] == "RUN_FINISHED"
        assert _text(replay) == "".join(WORDS)
        assert replay[: len(before)] == before

        _wait_until(lambda: _thread(client, thread_id)["running"] is False)
        finished = _thread(client, thread_id)
        assert finished["messages"][0] == question
        assert _assistant_texts(finished) == ["".join(WORDS)]
        assert server.model.calls == 1


def test_a_thread_reopened_after_the_run_has_every_message_once(server: Server) -> None:
    thread_id = uuid.uuid4().hex
    first = _user("First")
    with httpx.Client(base_url=server.base_url, timeout=10) as client:
        _start_and_disconnect(client, thread_id, [first])
        server.model.gate.set()
        _wait_until(lambda: _thread(client, thread_id)["running"] is False)

        restored = _thread(client, thread_id)["messages"]
        second = _user("Second")
        with client.stream(
            "POST", "/agent", json=_run_input(thread_id, [*restored, second])
        ) as response:
            list(response.iter_lines())

        final = _thread(client, thread_id)
        assert final["running"] is False
        assert [message["role"] for message in final["messages"]] == [
            "user",
            "assistant",
            "user",
            "assistant",
        ]
        assert len({message["id"] for message in final["messages"]}) == 4
        assert _assistant_texts(final) == ["".join(WORDS)] * 2

        listed = client.get("/threads").json()
        assert (listed[0]["id"], listed[0]["title"]) == (thread_id, "First")


def test_cancel_stops_the_run_and_keeps_the_partial_answer(server: Server) -> None:
    thread_id = uuid.uuid4().hex
    with httpx.Client(base_url=server.base_url, timeout=10) as client:
        _start_and_disconnect(client, thread_id, [_user("Hi")])

        assert client.post(f"/threads/{thread_id}/cancel").json() == {"cancelled": True}

        _wait_until(lambda: _thread(client, thread_id)["running"] is False)
        assert _assistant_texts(_thread(client, thread_id)) == [
            "".join(WORDS[:GATE_AFTER])
        ]
        with client.stream("GET", f"/threads/{thread_id}/stream") as response:
            replay = list(_events(response.iter_lines()))
        assert _text(replay) == "".join(WORDS[:GATE_AFTER])
        assert client.post(f"/threads/{thread_id}/cancel").json() == {
            "cancelled": False
        }


def test_a_cancel_naming_another_run_leaves_the_current_run_alone(
    server: Server,
) -> None:
    thread_id = uuid.uuid4().hex
    with httpx.Client(base_url=server.base_url, timeout=10) as client:
        _start_and_disconnect(client, thread_id, [_user("Hi")])

        stale = client.post(f"/threads/{thread_id}/cancel", params={"run": "earlier"})
        assert stale.json() == {"cancelled": False}
        assert _thread(client, thread_id)["running"] is True

        server.model.gate.set()
        _wait_until(lambda: _thread(client, thread_id)["running"] is False)
        assert _assistant_texts(_thread(client, thread_id)) == ["".join(WORDS)]


def test_a_run_whose_stream_is_gone_is_not_reported_running(server: Server) -> None:
    thread_id = uuid.uuid4().hex
    with httpx.Client(base_url=server.base_url, timeout=10) as client:
        _start_and_disconnect(client, thread_id, [_user("Hi")])
        record = server.call(server.durable.threads.get(thread_id))
        server.call(server.durable.streams.delete(record.stream_id))

        assert _thread(client, thread_id)["running"] is False
        assert client.get("/threads").json()[0]["running"] is False
        with client.stream("GET", f"/threads/{thread_id}/stream") as response:
            assert list(_events(response.iter_lines())) == []


def test_unknown_thread_is_404_and_bad_ids_are_rejected(server: Server) -> None:
    with httpx.Client(base_url=server.base_url, timeout=10) as client:
        assert client.get("/threads/missing").status_code == 404
        assert (
            client.post("/agent", json=_run_input("bad id", [_user("x")])).status_code
            == 400
        )
        assert client.post("/agent", content=b"{}").status_code == 422


def test_threads_are_scoped_to_their_owner(owned_server: Server) -> None:
    thread_id = uuid.uuid4().hex
    alice = {"x-user": "alice"}
    bob = {"x-user": "bob"}
    with httpx.Client(base_url=owned_server.base_url, timeout=10) as client:
        assert client.get("/threads").status_code == 401
        assert (
            client.post("/agent", json=_run_input(thread_id, [_user("x")])).status_code
            == 401
        )

        client.headers.update(alice)
        _start_and_disconnect(client, thread_id, [_user("Mine")])

        assert client.get("/threads", headers=bob).json() == []
        assert client.get(f"/threads/{thread_id}", headers=bob).status_code == 404
        assert (
            client.get(f"/threads/{thread_id}/stream", headers=bob).status_code == 404
        )
        assert client.post(f"/threads/{thread_id}/cancel", headers=bob).json() == {
            "cancelled": False
        }
        hijack = client.post(
            "/agent", json=_run_input(thread_id, [_user("Theirs")]), headers=bob
        )
        assert hijack.status_code == 404
        own_run = _thread(client, thread_id)["runId"]
        replay = client.post(
            "/agent", json=_run_input(thread_id, [_user("x")], own_run), headers=bob
        )
        assert replay.status_code == 404

        assert _thread(client, thread_id)["running"] is True
        owned_server.model.gate.set()
        _wait_until(lambda: _thread(client, thread_id)["running"] is False)
        assert _assistant_texts(_thread(client, thread_id)) == ["".join(WORDS)]
        assert [thread["id"] for thread in client.get("/threads").json()] == [thread_id]


def test_defaults_keep_threads_and_streams_in_memory() -> None:
    durable = DurableAGUI(Agent(FunctionModel(stream_function=Model().stream)))
    assert isinstance(durable.threads, InMemoryThreadStore)
    assert [route.path for route in durable.routes("/api")] == [
        "/api/agent",
        "/api/threads",
        "/api/threads/{thread_id}",
        "/api/threads/{thread_id}/stream",
        "/api/threads/{thread_id}/cancel",
    ]


@pytest.mark.parametrize(
    "kind",
    [
        "memory",
        "sqlite",
        pytest.param(
            "postgres",
            marks=pytest.mark.skipif(
                not os.environ.get("DATABASE_URL"), reason="needs DATABASE_URL"
            ),
        ),
    ],
)
def test_thread_stores_list_by_owner_newest_first(kind: str, tmp_path: Path) -> None:
    async def scenario() -> None:
        if kind == "postgres":
            store = await PostgresThreadStore.connect(
                os.environ["DATABASE_URL"], table=f"t_{uuid.uuid4().hex}"
            )
        elif kind == "sqlite":
            store = SqliteThreadStore(tmp_path / "threads.db")
        else:
            store = InMemoryThreadStore()
        await store.put("a", ThreadRecord(owner="alice", updated_at=1))
        await store.put("b", ThreadRecord(owner="alice", updated_at=3))
        await store.put("c", ThreadRecord(owner="bob", updated_at=2))
        await store.put("d", ThreadRecord(updated_at=4))
        assert [i for i, _ in await store.list(owner="alice")] == ["b", "a"]
        assert [i for i, _ in await store.list(owner="alice", limit=1)] == ["b"]
        assert [i for i, _ in await store.list()] == ["d"]
        await store.put("a", ThreadRecord(owner="alice", running=True, updated_at=5))
        record = await store.get("a")
        assert record is not None and record.running is True
        assert [i for i, _ in await store.list(owner="alice")] == ["a", "b"]
        assert await store.get("missing") is None

        await store.put("s", ThreadRecord(stream_id="one", running=True))
        assert not await store.put_if_current("s", ThreadRecord(stream_id="two"))
        assert await store.put_if_current("s", ThreadRecord(stream_id="one"))
        record = await store.get("s")
        assert record is not None and record.running is False
        assert not await store.put_if_current("missing", ThreadRecord(stream_id="one"))
        with pytest.raises(ValueError):
            await store.list(limit=-1)

        if isinstance(store, PostgresThreadStore):
            async with store._pool.connection() as db:
                await db.execute(f"DROP TABLE {store._table}")
            await store.close()

    asyncio.run(scenario())


@pytest.mark.parametrize(
    "kind",
    [
        "memory",
        "sqlite",
        pytest.param(
            "postgres",
            marks=pytest.mark.skipif(
                not os.environ.get("DATABASE_URL"), reason="needs DATABASE_URL"
            ),
        ),
    ],
)
@pytest.mark.parametrize(
    "initial, expected, writes",
    [
        pytest.param(ThreadRecord(stream_id="old"), "old", True, id="matches"),
        pytest.param(ThreadRecord(stream_id="old"), "other", False, id="differs"),
        pytest.param(None, None, True, id="missing"),
        pytest.param(ThreadRecord(), None, True, id="unset"),
        pytest.param(ThreadRecord(stream_id="old"), None, False, id="set"),
        pytest.param(None, "old", False, id="missing-with-expectation"),
        pytest.param(ThreadRecord(), "old", False, id="unset-with-expectation"),
    ],
)
def test_thread_stores_put_if_stream(
    kind: str,
    initial: ThreadRecord | None,
    expected: str | None,
    writes: bool,
    tmp_path: Path,
) -> None:
    async def scenario() -> None:
        if kind == "postgres":
            store = await PostgresThreadStore.connect(
                os.environ["DATABASE_URL"], table=f"t_{uuid.uuid4().hex}"
            )
        elif kind == "sqlite":
            store = SqliteThreadStore(tmp_path / "threads.db")
        else:
            store = InMemoryThreadStore()
        try:
            if initial is not None:
                await store.put("thread", initial)
            replacement = ThreadRecord(
                messages=[_user("New")],
                stream_id="new",
                run_id="run",
                running=True,
                owner="alice",
                updated_at=10,
            )

            assert await store.put_if_stream(
                "thread", replacement, expected=expected
            ) is writes
            assert await store.get("thread") == (replacement if writes else initial)
            assert [i for i, _ in await store.list(owner="alice")] == (
                ["thread"] if writes else []
            )
        finally:
            if isinstance(store, PostgresThreadStore):
                async with store._pool.connection() as db:
                    await db.execute(f"DROP TABLE {store._table}")
                await store.close()

    asyncio.run(scenario())


@pytest.mark.parametrize(
    "kind",
    [
        "memory",
        "sqlite",
        pytest.param(
            "postgres",
            marks=pytest.mark.skipif(
                not os.environ.get("DATABASE_URL"), reason="needs DATABASE_URL"
            ),
        ),
    ],
)
@pytest.mark.parametrize(
    "initial",
    [None, ThreadRecord(), ThreadRecord(stream_id="old")],
    ids=["missing", "unset", "set"],
)
def test_thread_stores_put_if_stream_has_one_concurrent_winner(
    kind: str, initial: ThreadRecord | None, tmp_path: Path
) -> None:
    async def scenario() -> None:
        if kind == "postgres":
            store = await PostgresThreadStore.connect(
                os.environ["DATABASE_URL"], table=f"t_{uuid.uuid4().hex}"
            )
            other = PostgresThreadStore(store._pool, table=store._name)
        elif kind == "sqlite":
            store = SqliteThreadStore(tmp_path / "threads.db")
            other = SqliteThreadStore(tmp_path / "threads.db")
        else:
            store = other = InMemoryThreadStore()
        try:
            if initial is not None:
                await store.put("thread", initial)
            records = [
                ThreadRecord(stream_id="one", owner="alice", updated_at=1),
                ThreadRecord(stream_id="two", owner="bob", updated_at=2),
            ]
            expected = initial.stream_id if initial is not None else None
            results = await asyncio.gather(
                store.put_if_stream("thread", records[0], expected=expected),
                other.put_if_stream("thread", records[1], expected=expected),
            )

            assert results.count(True) == 1
            winner = records[results.index(True)]
            assert await store.get("thread") == winner
            assert await other.get("thread") == winner
        finally:
            if isinstance(store, PostgresThreadStore):
                async with store._pool.connection() as db:
                    await db.execute(f"DROP TABLE {store._table}")
                await store.close()

    asyncio.run(scenario())


def test_sqlite_store_rejects_an_unsafe_table_name(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        SqliteThreadStore(tmp_path / "threads.db", table="threads; DROP TABLE x")
    with pytest.raises(ValueError):
        SqliteThreadStore(":memory:")
    SqliteThreadStore(tmp_path / "threads.db", table="order")


def test_a_cancel_naming_the_current_run_stops_it(server: Server) -> None:
    thread_id = uuid.uuid4().hex
    run_id = uuid.uuid4().hex
    with httpx.Client(base_url=server.base_url, timeout=10) as client:
        with client.stream(
            "POST", "/agent", json=_run_input(thread_id, [_user("Hi")], run_id)
        ) as response:
            for event in _events(response.iter_lines()):
                if event["type"] == "TEXT_MESSAGE_CONTENT":
                    break

        assert _thread(client, thread_id)["runId"] == run_id
        cancelled = client.post(f"/threads/{thread_id}/cancel", params={"run": run_id})
        assert cancelled.json() == {"cancelled": True}
        _wait_until(lambda: _thread(client, thread_id)["running"] is False)


def test_dotted_ids_do_not_collide_across_threads(server: Server) -> None:
    server.model.gate.set()
    with httpx.Client(base_url=server.base_url, timeout=10) as client:
        for thread_id, run_id in [("a", "b.c"), ("a.b", "c")]:
            with client.stream(
                "POST", "/agent", json=_run_input(thread_id, [_user("x")], run_id)
            ) as response:
                assert response.status_code == 200
                list(response.iter_lines())
            assert _assistant_texts(_thread(client, thread_id)) == ["".join(WORDS)]


def test_a_superseded_run_does_not_overwrite_its_replacement(server: Server) -> None:
    thread_id = uuid.uuid4().hex
    with httpx.Client(base_url=server.base_url, timeout=10) as client:
        first = _user("First")
        _start_and_disconnect(client, thread_id, [first])
        second = _user("Second")
        replacement = _run_input(thread_id, [first, second])
        server.model.gate.set()
        with client.stream("POST", "/agent", json=replacement) as response:
            list(response.iter_lines())

        _wait_until(lambda: _thread(client, thread_id)["running"] is False)
        final = _thread(client, thread_id)
        assert final["runId"] == replacement["runId"]
        assert [m["role"] for m in final["messages"]] == ["user", "user", "assistant"]
        assert _assistant_texts(final) == ["".join(WORDS)]


async def _drain(response) -> list[bytes]:
    return [
        chunk if isinstance(chunk, bytes) else chunk.encode()
        async for chunk in response.body_iterator
    ]


def _frames(chunks: list[bytes]) -> list[dict]:
    return list(_events(b"".join(chunks).decode().splitlines()))


def _finished_streams() -> tuple[object, asyncio.Event]:
    finished = asyncio.Event()
    streams = create_resumable_stream_context(
        store=create_in_memory_resumable_stream_store(),
        on_finalize=lambda *_: finished.set(),
    )
    return streams, finished


@pytest.mark.parametrize("flavor", ["sync", "async"])
def test_adapter_factory_builds_the_adapter_for_each_run(flavor: str) -> None:
    built: list[tuple[str, str]] = []
    ran: list[str] = []

    class RecordingAdapter(AGUIAdapter):
        def run_stream(self, **kwargs):
            ran.append(self.run_input.run_id)
            return super().run_stream(**kwargs)

    async def scenario() -> None:
        model = Model()
        model.gate.set()
        agent = Agent(FunctionModel(stream_function=model.stream))

        def build(request: Request, run_input: RunAgentInput) -> AGUIAdapter:
            built.append((request.url.path, run_input.run_id))
            return RecordingAdapter(agent=agent, run_input=run_input, accept=SSE)

        async def build_async(request: Request, run_input: RunAgentInput):
            await asyncio.sleep(0)
            return build(request, run_input)

        durable = DurableAGUI(
            agent, adapter_factory=build if flavor == "sync" else build_async
        )
        response = await _start_run(durable, _run_input("thread", [_user("Hi")], "run"))
        frames = _frames(await _drain(response))

        assert built == [("/agent", "run")]
        assert ran == ["run"]
        assert _text(frames) == "".join(WORDS)
        thread = await durable.get_thread("thread")
        assert thread is not None and _assistant_texts(thread) == ["".join(WORDS)]

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


def test_adapter_factory_and_adapter_options_are_exclusive() -> None:
    agent = Agent(FunctionModel(stream_function=Model().stream))
    for options in ({"manage_system_prompt": "client"}, {}):
        with pytest.raises(ValueError):
            DurableAGUI(
                agent,
                adapter_factory=lambda request, run_input: AGUIAdapter(
                    agent=agent, run_input=run_input
                ),
                adapter_options=options,
            )


def test_run_context_wraps_the_run_in_its_task() -> None:
    events: list[str] = []
    tasks: list[asyncio.Task | None] = []

    async def scenario() -> None:
        started = asyncio.Event()
        release = asyncio.Event()

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            events.append(f"model:{messages[-1].instructions}")
            yield "Hello"
            started.set()
            await release.wait()
            yield " world"

        @asynccontextmanager
        async def per_run(request: Request, run_input: RunAgentInput):
            events.append(f"open:{run_input.run_id}")
            tasks.append(asyncio.current_task())
            try:
                yield {"instructions": "from the context"}
            finally:
                events.append(f"close:{run_input.run_id}")
                tasks.append(asyncio.current_task())

        streams, finished = _finished_streams()
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=stream)),
            streams=streams,
            run_context=per_run,
        )
        response = await _start_run(durable, _run_input("thread", [_user("Hi")], "run"))
        # The client goes away; the run and its context stay open.
        del response
        await started.wait()
        assert events == ["open:run", "model:from the context"]

        release.set()
        await finished.wait()

        assert events == ["open:run", "model:from the context", "close:run"]
        assert tasks[0] is tasks[1] is not None
        thread = await durable.get_thread("thread")
        assert thread is not None and _assistant_texts(thread) == ["Hello world"]

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


def test_run_context_closes_when_the_run_is_cancelled() -> None:
    events: list[str] = []

    async def scenario() -> None:
        started = asyncio.Event()

        async def stream(messages: list[ModelMessage], info: AgentInfo):
            yield "Partial"
            started.set()
            await asyncio.Event().wait()
            yield "never"

        @asynccontextmanager
        async def per_run(request: Request, run_input: RunAgentInput):
            events.append("open")
            try:
                yield None
            finally:
                events.append("close")

        streams, finished = _finished_streams()
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=stream)),
            streams=streams,
            run_context=per_run,
        )
        await _start_run(durable, _run_input("thread", [_user("Hi")], "run"))
        await started.wait()
        assert await durable.cancel("thread", "run") is True
        await finished.wait()

        assert events == ["open", "close"]
        thread = await durable.get_thread("thread")
        assert thread is not None and _assistant_texts(thread) == ["Partial"]

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


async def _gated_durable(**kwargs):
    model = Model()
    streams, finished = _finished_streams()
    durable = DurableAGUI(
        Agent(FunctionModel(stream_function=model.stream)), streams=streams, **kwargs
    )
    return model, durable, finished


async def _read_until_pings(body: AsyncIterator[bytes], pings: int) -> list[bytes]:
    chunks: list[bytes] = []
    async for chunk in body:
        chunks.append(chunk if isinstance(chunk, bytes) else chunk.encode())
        if chunks.count(KEEPALIVE_LINE) >= pings:
            return chunks
    return chunks


def test_keepalive_pings_idle_run_and_resumed_streams() -> None:
    async def scenario() -> None:
        model, durable, finished = await _gated_durable(keepalive_interval=0.05)
        response = await _start_run(durable, _run_input("thread", [_user("Hi")], "run"))
        body = response.body_iterator

        before = await _read_until_pings(body, 2)
        assert _text(_frames(before)) == "".join(WORDS[:GATE_AFTER])

        resumed = await durable.resume_stream("thread")
        assert resumed is not None
        replay = await _read_until_pings(resumed, 2)
        assert _text(_frames(replay)) == "".join(WORDS[:GATE_AFTER])

        model.gate.set()
        rest = [chunk async for chunk in body]
        replay_rest = [chunk async for chunk in resumed]
        await finished.wait()

        live = _frames(before + rest)
        assert live[-1]["type"] == "RUN_FINISHED"
        assert _text(live) == "".join(WORDS)
        assert _frames(replay + replay_rest) == live
        assert all(
            chunk == KEEPALIVE_LINE or chunk.startswith(b"data: ")
            for chunk in before + rest
        )

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


def test_keepalive_is_off_by_default() -> None:
    async def scenario() -> None:
        model, durable, finished = await _gated_durable()
        response = await _start_run(durable, _run_input("thread", [_user("Hi")], "run"))

        async def release_later() -> None:
            await asyncio.sleep(0.2)
            model.gate.set()

        releaser = asyncio.create_task(release_later())
        chunks = await _drain(response)
        await releaser
        assert KEEPALIVE_LINE not in chunks
        assert _text(_frames(chunks)) == "".join(WORDS)

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


def test_keepalive_and_poll_intervals_must_be_positive() -> None:
    agent = Agent(FunctionModel(stream_function=Model().stream))
    for option in ("keepalive_interval", "cancel_poll_interval"):
        for value in (0, -1, float("inf"), float("nan")):
            with pytest.raises(ValueError):
                DurableAGUI(agent, **{option: value})


class _Workers:
    """Two DurableAGUI instances that share a thread store and a stream store,
    like two server processes behind a load balancer."""

    def __init__(self, threads, streams_store, model_stream, **kwargs) -> None:
        self.finished = asyncio.Event()
        self.finalized: list[str] = []

        def on_finalize(stream_id: str, *_: object) -> None:
            self.finalized.append(stream_id)
            self.finished.set()

        def worker(**options) -> DurableAGUI:
            # Each worker has its own context (and so its own producer tasks
            # and hooks) over the same store.
            return DurableAGUI(
                Agent(FunctionModel(stream_function=model_stream)),
                threads=threads,
                streams=create_resumable_stream_context(
                    store=streams_store, on_finalize=on_finalize
                ),
                **options,
            )

        self.a = worker(cancel_poll_interval=0.05, **kwargs)
        self.b = worker(cancel_poll_interval=0.05, **kwargs)


async def _shared_threads(kind: str, tmp_path: Path):
    if kind == "postgres":
        return await PostgresThreadStore.connect(
            os.environ["DATABASE_URL"], table=f"t_{uuid.uuid4().hex}"
        )
    if kind == "sqlite":
        return SqliteThreadStore(tmp_path / "threads.db")
    return InMemoryThreadStore()


def _on_claim(monkeypatch: pytest.MonkeyPatch, threads, hook) -> None:
    """Runs `hook(record, write)` for each conditional write `start_run` makes.

    The write goes through `claim` on stores that have it and through
    `put_if_stream` otherwise; `write()` performs it and returns whether it
    wrote.
    """
    name = "claim" if hasattr(threads, "claim") else "put_if_stream"
    inner = getattr(threads, name)

    async def wrapped(thread_id, record, *, expected):
        result = None

        async def write() -> bool:
            nonlocal result
            result = await inner(thread_id, record, expected=expected)
            return result[0] if name == "claim" else result

        await hook(record, write)
        return result

    monkeypatch.setattr(threads, name, wrapped)


async def _drop(threads) -> None:
    if isinstance(threads, PostgresThreadStore):
        async with threads._pool.connection() as db:
            await db.execute(f"DROP TABLE {threads._table}")
        await threads.close()


SHARED_BACKENDS = [
    pytest.param(("memory", "memory"), id="memory+memory"),
    pytest.param(("sqlite", "memory"), id="sqlite+memory"),
    pytest.param(
        ("postgres", "redis"),
        id="postgres+redis",
        marks=pytest.mark.skipif(
            not (os.environ.get("DATABASE_URL") and os.environ.get("REDIS_URL")),
            reason="needs DATABASE_URL and REDIS_URL",
        ),
    ),
]


def _cancellable_model():
    started = asyncio.Event()
    cancelled = asyncio.Event()

    async def stream(messages: list[ModelMessage], info: AgentInfo):
        yield f"Partial {messages[-1].parts[-1].content}"
        started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            raise
        yield " never"

    return stream, started, cancelled


@pytest.mark.parametrize("backends", SHARED_BACKENDS)
def test_cancel_on_another_worker_stops_the_run(
    backends: tuple[str, str], tmp_path: Path
) -> None:
    async def scenario() -> None:
        threads = await _shared_threads(backends[0], tmp_path)
        streams_store, cleanup = _stream_store(backends[1])
        stream, started, cancelled = _cancellable_model()
        workers = _Workers(threads, streams_store, stream)
        try:
            await _start_run(workers.a, _run_input("thread", [_user("Hi")], "run"))
            await started.wait()

            assert await workers.b.cancel("thread", "other-run") is False
            assert await workers.b.cancel("thread", "run") is True
            await asyncio.wait_for(cancelled.wait(), timeout=5)
            await asyncio.wait_for(workers.finished.wait(), timeout=5)

            thread = await workers.b.get_thread("thread")
            assert thread is not None
            assert thread["running"] is False
            assert _assistant_texts(thread) == ["Partial Hi"]
            record = await threads.get("thread")
            assert record is not None and record.cancel_requested is False
            assert await workers.b.cancel("thread", "run") is False
        finally:
            await _drop(threads)
            await cleanup()

    asyncio.run(asyncio.wait_for(scenario(), timeout=20))


@pytest.mark.parametrize("backends", SHARED_BACKENDS)
def test_a_run_started_on_another_worker_replaces_the_old_one(
    backends: tuple[str, str], tmp_path: Path
) -> None:
    async def scenario() -> None:
        threads = await _shared_threads(backends[0], tmp_path)
        streams_store, cleanup = _stream_store(backends[1])
        stream, started, cancelled = _cancellable_model()
        workers = _Workers(threads, streams_store, stream)
        try:
            await _start_run(workers.a, _run_input("thread", [_user("First")], "one"))
            await started.wait()
            started.clear()
            await _start_run(workers.b, _run_input("thread", [_user("Second")], "two"))
            await started.wait()

            await asyncio.wait_for(cancelled.wait(), timeout=5)
            record = await threads.get("thread")
            assert record is not None
            assert (record.run_id, record.running) == ("two", True)

            assert await workers.a.cancel("thread", "two") is True
            await asyncio.wait_for(
                _until(lambda: len(workers.finalized) == 2), timeout=5
            )
            thread = await workers.a.get_thread("thread")
            assert thread is not None and thread["running"] is False
            assert _assistant_texts(thread) == ["Partial Second"]
        finally:
            await _drop(threads)
            await cleanup()

    asyncio.run(asyncio.wait_for(scenario(), timeout=20))


async def _until(predicate) -> None:
    while not predicate():
        await asyncio.sleep(0.01)


def test_cancel_stays_local_without_store_support() -> None:
    class LegacyStore:
        """A custom store written before request_cancel existed."""

        def __init__(self) -> None:
            self._inner = InMemoryThreadStore()
            self.get = self._inner.get
            self.put = self._inner.put
            self.put_if_current = self._inner.put_if_current
            self.put_if_stream = self._inner.put_if_stream
            self.list = self._inner.list

    async def scenario() -> None:
        stream, started, cancelled = _cancellable_model()
        workers = _Workers(LegacyStore(), create_in_memory_resumable_stream_store(), stream)
        await _start_run(workers.a, _run_input("thread", [_user("Hi")], "run"))
        await started.wait()

        assert await workers.b.cancel("thread", "run") is False
        assert await workers.a.cancel("thread", "run") is True
        await asyncio.wait_for(cancelled.wait(), timeout=5)
        await workers.finished.wait()

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


@pytest.mark.parametrize(
    "kind",
    [
        "memory",
        "sqlite",
        pytest.param(
            "postgres",
            marks=pytest.mark.skipif(
                not os.environ.get("DATABASE_URL"), reason="needs DATABASE_URL"
            ),
        ),
    ],
)
def test_thread_stores_request_cancel(kind: str, tmp_path: Path) -> None:
    async def scenario() -> None:
        store = await _shared_threads(kind, tmp_path)
        try:
            running = ThreadRecord(
                messages=[_user("Hi")],
                stream_id="one",
                run_id="run",
                running=True,
                updated_at=10,
            )
            assert await store.request_cancel("thread", "one") is False
            assert await store.run_state("thread") is None
            await store.put("thread", running)
            assert await store.run_state("thread") == ("one", False)
            assert await store.request_cancel("thread", "two") is False
            assert await store.request_cancel("thread", "one") is True
            record = await store.get("thread")
            assert record == replace(running, cancel_requested=True)
            assert await store.run_state("thread") == ("one", True)

            settled = replace(running, running=False, updated_at=11)
            assert await store.put_if_current("thread", settled)
            assert await store.get("thread") == settled
            assert await store.request_cancel("thread", "one") is False
            assert (await store.get("thread")).cancel_requested is False
        finally:
            await _drop(store)

    asyncio.run(scenario())


def test_thread_records_without_cancel_requested_still_load() -> None:
    old = json.dumps({"messages": [], "stream_id": "one", "running": True})
    assert ThreadRecord.from_json(old).cancel_requested is False


def test_run_context_closes_in_its_task_when_the_stream_store_fails() -> None:
    events: list[tuple[str, asyncio.Task | None]] = []

    class FailingStore:
        """Fails the second append, like a Redis write error mid-run."""

        def __init__(self) -> None:
            self._inner = create_in_memory_resumable_stream_store()
            self._appends = 0

        def __getattr__(self, name: str):
            return getattr(self._inner, name)

        async def append(self, stream_id: str, chunk: bytes, **kwargs) -> None:
            self._appends += 1
            if self._appends == 2:
                raise RuntimeError("store write failed")
            await self._inner.append(stream_id, chunk, **kwargs)

    async def scenario() -> None:
        model = Model()
        model.gate.set()

        @asynccontextmanager
        async def per_run(request: Request, run_input: RunAgentInput):
            events.append(("open", asyncio.current_task()))
            try:
                yield None
            finally:
                events.append(("close", asyncio.current_task()))

        finished = asyncio.Event()
        streams = create_resumable_stream_context(
            store=FailingStore(), on_finalize=lambda *_: finished.set()
        )
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=model.stream)),
            streams=streams,
            run_context=per_run,
        )
        await _start_run(durable, _run_input("thread", [_user("Hi")], "run"))
        await finished.wait()

        assert [name for name, _ in events] == ["open", "close"]
        assert events[0][1] is events[1][1] is not None
        thread = await durable.get_thread("thread")
        assert thread is not None and thread["running"] is False

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


def test_run_context_is_not_opened_for_a_run_cancelled_before_it_starts() -> None:
    opened: list[str] = []

    async def scenario() -> None:
        model = Model()

        @asynccontextmanager
        async def per_run(request: Request, run_input: RunAgentInput):
            opened.append(run_input.run_id)
            yield None

        streams, finished = _finished_streams()
        durable = DurableAGUI(
            Agent(FunctionModel(stream_function=model.stream)),
            streams=streams,
            run_context=per_run,
        )
        await _start_run(durable, _run_input("thread", [_user("Hi")], "run"))
        assert await durable.cancel("thread", "run") is True
        await finished.wait()

        assert opened == []
        assert model.calls == 0

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))


def test_a_client_gone_during_keepalive_closes_the_read_but_not_the_run() -> None:
    async def scenario() -> None:
        model, durable, finished = await _gated_durable(keepalive_interval=0.02)
        response = await _start_run(durable, _run_input("thread", [_user("Hi")], "run"))
        sent: list[bytes] = []

        async def send(message: dict) -> None:
            body = message.get("body", b"")
            if body == KEEPALIVE_LINE:
                raise OSError("client went away")
            sent.append(body)

        with pytest.raises(OSError):
            await response.stream_response(send)

        assert response.body_iterator.ag_frame is None  # closed, nothing pending
        model.gate.set()
        await finished.wait()
        thread = await durable.get_thread("thread")
        assert thread is not None and _assistant_texts(thread) == ["".join(WORDS)]

    asyncio.run(asyncio.wait_for(scenario(), timeout=10))
