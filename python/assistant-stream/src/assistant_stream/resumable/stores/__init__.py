from contextlib import suppress

from assistant_stream.resumable.stores.in_memory import (
    create_in_memory_resumable_stream_store,
)

__all__ = [
    "create_in_memory_resumable_stream_store",
]

with suppress(ImportError):
    from assistant_stream.resumable.stores.redis import (
        create_redis_resumable_stream_store,
    )

    __all__ += [
        "create_redis_resumable_stream_store",
    ]
