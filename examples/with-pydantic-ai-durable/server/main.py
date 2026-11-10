"""Pydantic AI agent over AG-UI whose threads survive a closed browser.

    uv run uvicorn main:app --port 8000

OPENAI_API_KEY   use OpenAI; without it a demo model streams a slow canned answer
REDIS_URL        keep run streams in Redis (needed with more than one worker)
DATABASE_URL     keep threads in Postgres (postgresql://...); SQLite otherwise
"""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from assistant_stream.pydantic_ai import (
    DurableAGUI,
    PostgresThreadStore,
    SqliteThreadStore,
)
from assistant_stream.resumable import (
    create_in_memory_resumable_stream_store,
    create_resumable_stream_context,
)
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage
from pydantic_ai.models.function import AgentInfo, FunctionModel
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware

DEMO_ANSWER = (
    "This answer streams slowly on purpose. Close the tab or reload the page "
    "while it is still writing. The run keeps going on the server, and when "
    "you come back the thread picks up where the stream is now and finishes. "
    "Every word you see was written once, in order, by the same run."
)


async def demo_stream(
    messages: list[ModelMessage], info: AgentInfo
) -> AsyncIterator[str]:
    delay = float(os.environ.get("DEMO_WORD_DELAY", "0.25"))
    for word in DEMO_ANSWER.split(" "):
        await asyncio.sleep(delay)
        yield word + " "


def build_agent() -> Agent[None, str]:
    if os.environ.get("OPENAI_API_KEY"):
        return Agent(
            os.environ.get("MODEL", "openai:gpt-5.4-mini"),
            instructions="You are a helpful assistant.",
        )
    return Agent(FunctionModel(stream_function=demo_stream))


def build_streams():
    redis_url = os.environ.get("REDIS_URL")
    if redis_url:
        from assistant_stream.resumable import create_redis_resumable_stream_store
        from redis.asyncio import Redis

        store = create_redis_resumable_stream_store(Redis.from_url(redis_url))
    else:
        store = create_in_memory_resumable_stream_store()
    return create_resumable_stream_context(store=store, ttl_ms=60 * 60 * 1000)


@asynccontextmanager
async def lifespan(app: Starlette):
    database_url = os.environ.get("DATABASE_URL")
    postgres = await PostgresThreadStore.connect(database_url) if database_url else None
    threads = postgres or SqliteThreadStore(os.environ.get("SQLITE_PATH", "threads.db"))
    app.state.durable = DurableAGUI(build_agent(), threads=threads, streams=build_streams())
    app.router.routes.extend(app.state.durable.routes())
    try:
        yield
    finally:
        if postgres is not None:
            await postgres.close()


app = Starlette(
    lifespan=lifespan,
    middleware=[
        Middleware(
            CORSMiddleware,
            allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
            allow_methods=["*"],
            allow_headers=["*"],
        )
    ],
)
