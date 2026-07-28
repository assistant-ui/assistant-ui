from assistant_stream.assistant_stream_chunk import AssistantStreamChunk
from assistant_stream.serialization.assistant_stream_response import (
    AssistantStreamResponse,
)
from assistant_stream.serialization.heartbeat import HeartbeatOption
from assistant_stream.serialization.stream_encoder import StreamEncoder
from assistant_stream.state_proxy import StateProxy
from typing import Any, AsyncGenerator, Optional
import json
import logging

logger = logging.getLogger(__name__)


class StateProxyJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that can handle StateProxy objects."""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, StateProxy):
            return obj._get_value()
        return super().default(obj)


class _CanonicalChunkTranslator:
    """Translates the package's flat internal chunks into the canonical
    assistant-transport wire chunks (part-start/path addressing), mirroring the
    part-boundary semantics of the TS AssistantStreamController. Tool-call args
    are addressed by tool_call_id throughout, so they close only on the call's
    own result or at stream end, never by inference from unrelated chunks."""

    def __init__(self) -> None:
        self._part_count = 0
        self._append: Optional[tuple[str, Optional[str], int]] = None
        self._tool_calls: dict[str, dict[str, Any]] = {}
        self._warned_reasons: set[str] = set()

    def _warn_once(self, reason: str, detail: str) -> None:
        if reason in self._warned_reasons:
            return
        self._warned_reasons.add(reason)
        logger.warning(
            "Dropped assistant-transport chunk (%s): %s", reason, detail
        )

    def _close_append_part(self, out: list[dict]) -> None:
        if self._append is None:
            return
        out.append({"type": "part-finish", "path": [self._append[2]]})
        self._append = None

    def _close_args(self, entry: dict[str, Any], out: list[dict]) -> None:
        if entry["args_closed"]:
            return
        entry["args_closed"] = True
        path = [entry["index"]]
        if not entry["has_args_text"]:
            out.append({"type": "text-delta", "textDelta": "{}", "path": path})
        out.append({"type": "tool-call-args-text-finish", "path": path})

    def _open_part(self, part: dict, out: list[dict]) -> int:
        self._close_append_part(out)
        index = self._part_count
        self._part_count += 1
        out.append({"type": "part-start", "part": part, "path": []})
        return index

    def _append_delta(
        self, kind: str, parent_id: Optional[str], text_delta: str, out: list[dict]
    ) -> None:
        if self._append is None or self._append[:2] != (kind, parent_id):
            part: dict = {"type": kind}
            if parent_id is not None:
                part["parentId"] = parent_id
            index = self._open_part(part, out)
            self._append = (kind, parent_id, index)
        out.append(
            {"type": "text-delta", "textDelta": text_delta, "path": [self._append[2]]}
        )

    def translate(self, chunk: AssistantStreamChunk) -> list[dict]:
        out: list[dict] = []
        chunk_type = chunk.type

        if chunk_type == "text-delta":
            self._append_delta("text", chunk.parent_id, chunk.text_delta, out)
        elif chunk_type == "reasoning-delta":
            self._append_delta(
                "reasoning", chunk.parent_id, chunk.reasoning_delta, out
            )
        elif chunk_type == "tool-call-begin":
            if chunk.tool_call_id in self._tool_calls:
                self._warn_once(
                    "duplicate-tool-call-id",
                    f"tool-call-begin for {chunk.tool_call_id}",
                )
            else:
                part = {
                    "type": "tool-call",
                    "toolCallId": chunk.tool_call_id,
                    "toolName": chunk.tool_name,
                }
                if chunk.parent_id is not None:
                    part["parentId"] = chunk.parent_id
                index = self._open_part(part, out)
                self._tool_calls[chunk.tool_call_id] = {
                    "index": index,
                    "has_args_text": False,
                    "args_closed": False,
                    "part_closed": False,
                }
        elif chunk_type == "tool-call-delta":
            entry = self._tool_calls.get(chunk.tool_call_id)
            if entry is None:
                self._warn_once(
                    "unknown-tool-call-id", f"tool-call-delta for {chunk.tool_call_id}"
                )
            elif entry["args_closed"]:
                self._warn_once(
                    "args-already-closed", f"tool-call-delta for {chunk.tool_call_id}"
                )
            else:
                entry["has_args_text"] = True
                out.append(
                    {
                        "type": "text-delta",
                        "textDelta": chunk.args_text_delta,
                        "path": [entry["index"]],
                    }
                )
        elif chunk_type == "tool-result":
            entry = self._tool_calls.get(chunk.tool_call_id)
            if entry is None:
                self._warn_once(
                    "unknown-tool-call-id", f"tool-result for {chunk.tool_call_id}"
                )
            elif entry["part_closed"]:
                self._warn_once(
                    "part-already-closed", f"tool-result for {chunk.tool_call_id}"
                )
            else:
                self._close_args(entry, out)
                path = [entry["index"]]
                result: dict = {
                    "type": "result",
                    "result": chunk.result,
                    "isError": chunk.is_error,
                    "path": path,
                }
                if chunk.artifact is not None:
                    result["artifact"] = chunk.artifact
                out.append(result)
                out.append({"type": "part-finish", "path": path})
                entry["part_closed"] = True
        elif chunk_type == "source":
            part = {
                "type": "source",
                "sourceType": chunk.source_type,
                "id": chunk.id,
                "url": chunk.url,
            }
            if chunk.title is not None:
                part["title"] = chunk.title
            if chunk.parent_id is not None:
                part["parentId"] = chunk.parent_id
            index = self._open_part(part, out)
            out.append({"type": "part-finish", "path": [index]})
        elif chunk_type == "data":
            out.append({"type": "data", "data": [chunk.data], "path": []})
        elif chunk_type == "error":
            out.append({"type": "error", "error": chunk.error, "path": []})
        elif chunk_type == "update-state":
            out.append(
                {"type": "update-state", "operations": chunk.operations, "path": []}
            )
        else:
            self._warn_once("unknown-chunk-type", chunk_type)

        return out

    def flush(self) -> list[dict]:
        out: list[dict] = []
        self._close_append_part(out)
        for entry in self._tool_calls.values():
            if entry["part_closed"]:
                continue
            self._close_args(entry, out)
            out.append({"type": "part-finish", "path": [entry["index"]]})
            entry["part_closed"] = True
        return out


class AssistantTransportEncoder(StreamEncoder):
    """
    AssistantTransportEncoder encodes AssistantStreamChunks into the canonical
    assistant-transport SSE wire format and emits [DONE] when the stream
    completes.
    """

    def get_media_type(self) -> str:
        return "text/event-stream"

    async def encode_stream(
        self, stream: AsyncGenerator[AssistantStreamChunk, None]
    ) -> AsyncGenerator[str, None]:
        translator = _CanonicalChunkTranslator()
        async for chunk in stream:
            for wire_chunk in translator.translate(chunk):
                yield f"data: {json.dumps(wire_chunk, cls=StateProxyJSONEncoder)}\n\n"
        for wire_chunk in translator.flush():
            yield f"data: {json.dumps(wire_chunk, cls=StateProxyJSONEncoder)}\n\n"

        yield "data: [DONE]\n\n"


class AssistantTransportResponse(AssistantStreamResponse):
    def __init__(
        self,
        stream: AsyncGenerator[AssistantStreamChunk, None],
        heartbeat: HeartbeatOption = True,
    ):
        super().__init__(stream, AssistantTransportEncoder(), heartbeat=heartbeat)
