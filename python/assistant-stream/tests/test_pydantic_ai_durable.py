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
from pathlib import Path

import pytest

pytest.importorskip("pydantic_ai.ui.ag_ui", reason="needs the pydantic-ai extra")

import httpx
import uvicorn
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage
from pydantic_ai.models.function import AgentInfo, FunctionModel
from starlette.applications import Starlette
from starlette.requests import Request

from assistant_stream.pydantic_ai import (
    DurableAGUI,
    InMemoryThreadStore,
    PostgresThreadStore,
    SqliteThreadStore,
    ThreadRecord,
)
from assistant_stream.resumable import (
    create_in_memory_resumable_stream_store,
    create_resumable_stream_context,
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
    if kind == "redis":
        from redis.asyncio import Redis

        from assistant_stream.resumable import create_redis_resumable_stream_store

        return create_redis_resumable_stream_store(
            Redis.from_url(os.environ["REDIS_URL"]),
            key_prefix=f"aui-test-{uuid.uuid4().hex}",
        )
    return create_in_memory_resumable_stream_store()


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
        streams = create_resumable_stream_context(store=_stream_store(streams_kind))
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


def _run_input(thread_id: str, messages: list[dict]) -> dict:
    return {
        "threadId": thread_id,
        "runId": uuid.uuid4().hex,
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
        if isinstance(store, PostgresThreadStore):
            await store.close()

    asyncio.run(scenario())


def test_sqlite_store_rejects_an_unsafe_table_name(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        SqliteThreadStore(tmp_path / "threads.db", table="threads; DROP TABLE x")
