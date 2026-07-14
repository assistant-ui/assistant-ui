from __future__ import annotations

from collections.abc import AsyncIterator, Callable, Coroutine, Mapping
from typing import Any

from starlette.responses import JSONResponse, Response, StreamingResponse

from assistant_stream.create_run import RunController, create_run
from assistant_stream.resumable.context import ResumableStreamContext
from assistant_stream.resumable.errors import ResumableStreamError
from assistant_stream.serialization.data_stream import DataStreamEncoder
from assistant_stream.serialization.stream_encoder import StreamEncoder

RESUMABLE_STREAM_ID_HEADER = "x-resumable-stream-id"


async def create_resumable_assistant_stream_response(
    *,
    context: ResumableStreamContext,
    stream_id: str,
    callback: Callable[[RunController], Coroutine[Any, Any, None]],
    encoder: StreamEncoder | None = None,
    headers: Mapping[str, str] | None = None,
) -> Response:
    resolved_encoder = encoder if encoder is not None else DataStreamEncoder()

    async def make_stream() -> AsyncIterator[bytes]:
        async for frame in resolved_encoder.encode_stream(create_run(callback)):
            yield frame.encode("utf-8")

    body = await context.run(stream_id, make_stream)
    return StreamingResponse(
        body,
        media_type=resolved_encoder.get_media_type(),
        headers=_merge_headers(headers, stream_id),
    )


async def create_resume_assistant_stream_response(
    *,
    context: ResumableStreamContext,
    stream_id: str,
    encoder: StreamEncoder | None = None,
    headers: Mapping[str, str] | None = None,
    missing_response: Callable[[], Response] | None = None,
) -> Response:
    try:
        body = await context.resume(stream_id)
    except ResumableStreamError as err:
        if err.code != "invalid-id":
            raise
        body = None
    if body is None:
        if missing_response is not None:
            return missing_response()
        return JSONResponse({"error": "stream not found"}, status_code=404)

    resolved_encoder = encoder if encoder is not None else DataStreamEncoder()
    return StreamingResponse(
        body,
        media_type=resolved_encoder.get_media_type(),
        headers=_merge_headers(headers, stream_id),
    )


def _merge_headers(
    extra: Mapping[str, str] | None, stream_id: str
) -> dict[str, str]:
    merged: dict[str, str] = {}
    if extra is not None:
        for key, value in extra.items():
            if key.lower() != RESUMABLE_STREAM_ID_HEADER:
                merged[key] = value
    merged[RESUMABLE_STREAM_ID_HEADER] = stream_id
    return merged
