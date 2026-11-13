"""Durable AG-UI threads for Pydantic AI agents.

    from assistant_stream.pydantic_ai import DurableAGUI, SqliteThreadStore

    durable = DurableAGUI(agent, threads=SqliteThreadStore("threads.db"))
    app = Starlette(routes=durable.routes())

Needs `pip install "assistant-stream[pydantic-ai]"`.
"""

from assistant_stream.pydantic_ai.threads import (
    CancellableThreadStore,
    InMemoryThreadStore,
    PostgresThreadStore,
    SqliteThreadStore,
    ThreadRecord,
    ThreadStore,
)

try:
    from assistant_stream.pydantic_ai.durable import (
        AdapterFactory,
        DurableAGUI,
        RunContextFactory,
        SSEResponse,
    )
except ImportError as error:  # pragma: no cover - depends on installed extras
    raise ImportError(
        "assistant_stream.pydantic_ai needs Pydantic AI with AG-UI support: "
        'pip install "assistant-stream[pydantic-ai]"'
    ) from error

__all__ = [
    "AdapterFactory",
    "CancellableThreadStore",
    "DurableAGUI",
    "InMemoryThreadStore",
    "PostgresThreadStore",
    "RunContextFactory",
    "SSEResponse",
    "SqliteThreadStore",
    "ThreadRecord",
    "ThreadStore",
]
