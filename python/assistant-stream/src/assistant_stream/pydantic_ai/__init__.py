"""Durable AG-UI threads for Pydantic AI agents.

    from assistant_stream.pydantic_ai import DurableAGUI, SqliteThreadStore

    durable = DurableAGUI(agent, threads=SqliteThreadStore("threads.db"))
    app = Starlette(routes=durable.routes())

Needs `pip install "assistant-stream[pydantic-ai]"`.
"""

from assistant_stream.pydantic_ai.threads import (
    InMemoryThreadStore,
    PostgresThreadStore,
    SqliteThreadStore,
    ThreadRecord,
    ThreadStore,
)

try:
    from assistant_stream.pydantic_ai.durable import DurableAGUI
except ImportError as error:  # pragma: no cover - depends on installed extras
    raise ImportError(
        "assistant_stream.pydantic_ai needs Pydantic AI with AG-UI support: "
        'pip install "assistant-stream[pydantic-ai]"'
    ) from error

__all__ = [
    "DurableAGUI",
    "InMemoryThreadStore",
    "PostgresThreadStore",
    "SqliteThreadStore",
    "ThreadRecord",
    "ThreadStore",
]
