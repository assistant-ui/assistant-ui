from assistant_stream.assistant_stream_chunk import (
    AnnotationsChunk,
    AssistantStreamChunk,
    FileChunk,
    ReasoningDeltaChunk,
    ReasoningPartStartChunk,
    SourceChunk,
    StepFinishChunk,
    StepStartChunk,
    TextDeltaChunk,
    ToolCallBeginChunk,
    ToolCallArgsTextFinishChunk,
    ToolCallDeltaChunk,
    ToolResultChunk,
)
from assistant_stream.serialization.assistant_stream_response import (
    AssistantStreamResponse,
)
from assistant_stream.serialization.heartbeat import (
    SSE_HEARTBEAT_LINE,
    HeartbeatOption,
)
from assistant_stream.serialization.stream_encoder import StreamEncoder
from assistant_stream.state_proxy import StateProxy
from typing import AsyncGenerator, Any
import json
import logging

logger = logging.getLogger(__name__)


class StateProxyJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that can handle StateProxy objects."""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, StateProxy):
            return obj._get_value()
        return super().default(obj)


class _Canonicalizer:
    """Translate the internal flat chunk dialect into the canonical
    assistant-transport wire shape consumed by the TS AssistantTransportDecoder
    and AssistantMessageAccumulator.

    Each content part is framed by `part-start`/`part-finish` at an allocated
    `path`, streamed text flows as `text-delta` into the open part, and chunk
    type names match the TS `AssistantStreamChunk` union. `update-state` and
    `error` are already message-level and pass through unchanged.
    """

    def __init__(self) -> None:
        self._part_counter = 0
        self._append_part: tuple[str, list[int], str | None] | None = None
        self._tool_paths: dict[str, list[int]] = {}
        self._tool_has_args: set[str] = set()
        self._settled_tools: set[str] = set()
        self._warned_reasons: set[str] = set()

    def _warn_once(self, reason: str, detail: str) -> None:
        if reason in self._warned_reasons:
            return
        self._warned_reasons.add(reason)
        logger.warning("Dropped assistant-transport chunk (%s): %s", reason, detail)

    def _next_path(self) -> list[int]:
        path = [self._part_counter]
        self._part_counter += 1
        return path

    def _close_append_part(self) -> list[dict[str, Any]]:
        if self._append_part is None:
            return []
        path = self._append_part[1]
        self._append_part = None
        return [{"type": "part-finish", "path": path}]

    def _start_reasoning_part(
        self, chunk: ReasoningPartStartChunk
    ) -> list[dict[str, Any]]:
        # Registered as the append target so the deltas that follow extend this
        # part instead of opening a second one.
        if chunk.unstable_summary is None:
            return []
        frames = self._close_append_part()
        path = self._next_path()
        part: dict[str, Any] = {
            "type": "reasoning",
            "unstable_summary": chunk.unstable_summary,
        }
        if chunk.parent_id is not None:
            part["parentId"] = chunk.parent_id
        frames.append({"type": "part-start", "part": part, "path": []})
        self._append_part = ("reasoning", path, chunk.parent_id)
        return frames

    def _append_delta(
        self, chunk: TextDeltaChunk | ReasoningDeltaChunk, text: str, kind: str
    ) -> list[dict[str, Any]]:
        parent_id = chunk.parent_id
        if (
            self._append_part is None
            or self._append_part[0] != kind
            or self._append_part[2] != parent_id
        ):
            frames = self._close_append_part()
            path = self._next_path()
            part: dict[str, Any] = {"type": kind}
            if parent_id is not None:
                part["parentId"] = parent_id
            frames.append({"type": "part-start", "part": part, "path": []})
            self._append_part = (kind, path, parent_id)
        else:
            frames = []
            path = self._append_part[1]
        frames.append({"type": "text-delta", "textDelta": text, "path": path})
        return frames

    def _begin_tool_call(self, chunk: ToolCallBeginChunk) -> list[dict[str, Any]]:
        if chunk.tool_call_id in self._tool_paths:
            self._warn_once(
                "duplicate-tool-call-id",
                f"tool-call-begin for {chunk.tool_call_id}",
            )
            return []
        frames = self._close_append_part()
        path = self._next_path()
        self._tool_paths[chunk.tool_call_id] = path
        part: dict[str, Any] = {
            "type": "tool-call",
            "toolCallId": chunk.tool_call_id,
            "toolName": chunk.tool_name,
        }
        if chunk.parent_id is not None:
            part["parentId"] = chunk.parent_id
        frames.append({"type": "part-start", "part": part, "path": []})
        return frames

    def _tool_call_delta(self, chunk: ToolCallDeltaChunk) -> list[dict[str, Any]]:
        path = self._tool_paths.get(chunk.tool_call_id)
        if path is None:
            self._warn_once(
                "unknown-tool-call-id",
                f"tool-call-delta for {chunk.tool_call_id}",
            )
            return []
        if chunk.tool_call_id in self._settled_tools:
            # The path outlives settlement so a deferred result can address the
            # part; arguments cannot still be appended to it.
            self._warn_once(
                "settled-tool-call-id",
                f"tool-call-delta for {chunk.tool_call_id}",
            )
            return []
        self._tool_has_args.add(chunk.tool_call_id)
        return [
            {"type": "text-delta", "textDelta": chunk.args_text_delta, "path": path}
        ]

    def _tool_result(self, chunk: ToolResultChunk) -> list[dict[str, Any]]:
        path = self._tool_paths.get(chunk.tool_call_id)
        result: dict[str, Any] = {
            "type": "result",
            "result": chunk.result,
            "isError": chunk.is_error,
        }
        if chunk.artifact is not None:
            result["artifact"] = chunk.artifact
        if path is None:
            # A result without a matching tool-call part has no part to address;
            # emit it at the message root so it stays on the wire.
            result["path"] = []
            return [result]
        result["path"] = path
        if chunk.tool_call_id in self._settled_tools:
            return [result]
        self._settled_tools.add(chunk.tool_call_id)
        return [result, *self._close_tool_part(chunk.tool_call_id, path)]

    def _finish_tool_call_args(
        self, chunk: ToolCallArgsTextFinishChunk
    ) -> list[dict[str, Any]]:
        # The path stays registered after the args settle: a two-phase
        # human-in-the-loop call closes its arguments first and delivers the
        # result later, and a result that cannot resolve a path is emitted at
        # the message root, where the accumulator drops it.
        path = self._tool_paths.get(chunk.tool_call_id)
        if path is None or chunk.tool_call_id in self._settled_tools:
            return []
        self._settled_tools.add(chunk.tool_call_id)
        frames: list[dict[str, Any]] = []
        if chunk.args_text_delta:
            self._tool_has_args.add(chunk.tool_call_id)
            frames.append(
                {
                    "type": "text-delta",
                    "textDelta": chunk.args_text_delta,
                    "path": path,
                }
            )
        frames.extend(self._close_tool_part(chunk.tool_call_id, path))
        return frames

    def _close_tool_part(
        self, tool_call_id: str, path: list[int]
    ) -> list[dict[str, Any]]:
        frames: list[dict[str, Any]] = []
        if tool_call_id not in self._tool_has_args:
            frames.append({"type": "text-delta", "textDelta": "{}", "path": path})
        self._tool_has_args.discard(tool_call_id)
        frames.append({"type": "tool-call-args-text-finish", "path": path})
        frames.append({"type": "part-finish", "path": path})
        return frames

    def _source(self, chunk: SourceChunk) -> list[dict[str, Any]]:
        frames = self._close_append_part()
        path = self._next_path()
        part: dict[str, Any] = {
            "type": "source",
            "sourceType": chunk.source_type,
            "id": chunk.id,
            "url": chunk.url,
        }
        if chunk.title is not None:
            part["title"] = chunk.title
        if chunk.parent_id is not None:
            part["parentId"] = chunk.parent_id
        frames.append({"type": "part-start", "part": part, "path": []})
        frames.append({"type": "part-finish", "path": path})
        return frames

    def _file(self, chunk: FileChunk) -> list[dict[str, Any]]:
        frames = self._close_append_part()
        path = self._next_path()
        part: dict[str, Any] = {
            "type": "file",
            "data": chunk.data,
            "mimeType": chunk.mime_type,
        }
        if chunk.parent_id is not None:
            part["parentId"] = chunk.parent_id
        frames.append({"type": "part-start", "part": part, "path": []})
        frames.append({"type": "part-finish", "path": path})
        return frames

    def translate(self, chunk: AssistantStreamChunk) -> list[dict[str, Any]]:
        match chunk.type:
            case "text-delta":
                return self._append_delta(chunk, chunk.text_delta, "text")
            case "reasoning-part-start":
                return self._start_reasoning_part(chunk)
            case "reasoning-delta":
                return self._append_delta(chunk, chunk.reasoning_delta, "reasoning")
            case "tool-call-begin":
                return self._begin_tool_call(chunk)
            case "tool-call-delta":
                return self._tool_call_delta(chunk)
            case "tool-call-args-text-finish":
                return self._finish_tool_call_args(chunk)
            case "tool-result":
                return self._tool_result(chunk)
            case "source":
                return self._source(chunk)
            case "file":
                return self._file(chunk)
            case "data":
                # The TS union requires `data` to be an array; wrap single values
                # so a dict payload satisfies the accumulator's array spread.
                return [{"type": "data", "data": [chunk.data]}]
            case "annotations":
                return [{"type": "annotations", "annotations": chunk.annotations}]
            case "step-start":
                return [{"type": "step-start", "messageId": chunk.message_id}]
            case "step-finish":
                return [
                    {
                        "type": "step-finish",
                        "finishReason": chunk.finish_reason,
                        "usage": {
                            "inputTokens": chunk.input_tokens,
                            "outputTokens": chunk.output_tokens,
                        },
                        "isContinued": chunk.is_continued,
                    }
                ]
            case "error":
                return [{"type": "error", "error": chunk.error}]
            case "update-state":
                return [{"type": "update-state", "operations": chunk.operations}]
            case _:
                self._warn_once("unknown-chunk-type", chunk.type)
                return []

    def close(self) -> list[dict[str, Any]]:
        frames = self._close_append_part()
        for tool_call_id, path in self._tool_paths.items():
            if tool_call_id in self._settled_tools:
                continue
            frames.extend(self._close_tool_part(tool_call_id, path))
        self._tool_paths.clear()
        self._settled_tools.clear()
        return frames


class AssistantTransportEncoder(StreamEncoder):
    """
    AssistantTransportEncoder encodes AssistantStreamChunks into the canonical
    assistant-transport SSE wire shape and emits [DONE] when the stream
    completes.
    """

    def get_media_type(self) -> str:
        return "text/event-stream"

    def get_keepalive_token(self) -> str:
        return SSE_HEARTBEAT_LINE

    async def encode_stream(
        self, stream: AsyncGenerator[AssistantStreamChunk, None]
    ) -> AsyncGenerator[str, None]:
        canonicalizer = _Canonicalizer()
        async for chunk in stream:
            for frame in canonicalizer.translate(chunk):
                yield f"data: {json.dumps(frame, cls=StateProxyJSONEncoder)}\n\n"
        for frame in canonicalizer.close():
            yield f"data: {json.dumps(frame, cls=StateProxyJSONEncoder)}\n\n"
        yield "data: [DONE]\n\n"


class AssistantTransportResponse(AssistantStreamResponse):
    def __init__(
        self,
        stream: AsyncGenerator[AssistantStreamChunk, None],
        heartbeat: HeartbeatOption = True,
    ):
        super().__init__(stream, AssistantTransportEncoder(), heartbeat=heartbeat)
