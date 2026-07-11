from contextlib import suppress

from assistant_stream.resumable.context import (
    ResumableStreamContext,
    create_resumable_stream_context,
)
from assistant_stream.resumable.errors import (
    DEFAULT_TTL_MS,
    ResumableStreamError,
    ResumableStreamErrorCode,
    validate_stream_id,
)
from assistant_stream.resumable.response import (
    RESUMABLE_STREAM_ID_HEADER,
    create_resumable_assistant_stream_response,
    create_resume_assistant_stream_response,
)
from assistant_stream.resumable.stores.in_memory import (
    create_in_memory_resumable_stream_store,
)
from assistant_stream.resumable.types import (
    CancellationSignal,
    ResumableStreamEntry,
    ResumableStreamRole,
    ResumableStreamStatus,
    ResumableStreamStore,
)

__all__ = [
    "CancellationSignal",
    "DEFAULT_TTL_MS",
    "RESUMABLE_STREAM_ID_HEADER",
    "ResumableStreamContext",
    "ResumableStreamEntry",
    "ResumableStreamError",
    "ResumableStreamErrorCode",
    "ResumableStreamRole",
    "ResumableStreamStatus",
    "ResumableStreamStore",
    "create_in_memory_resumable_stream_store",
    "create_resumable_assistant_stream_response",
    "create_resumable_stream_context",
    "create_resume_assistant_stream_response",
    "validate_stream_id",
]

with suppress(ImportError):
    from assistant_stream.resumable.stores.redis import (
        RedisLikeClient,
        RedisResumableStreamStore,
        create_redis_resumable_stream_store,
    )

    __all__ += [
        "RedisLikeClient",
        "RedisResumableStreamStore",
        "create_redis_resumable_stream_store",
    ]
