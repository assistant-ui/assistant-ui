from assistant_stream.assistant_stream_chunk import (
    AssistantStreamChunk,
    ToolCallArgsTextFinishChunk,
    ToolCallDeltaChunk,
)
import json
import logging
from typing import AsyncGenerator, Any
from assistant_stream.serialization.assistant_stream_response import (
    AssistantStreamResponse,
)
from assistant_stream.serialization.heartbeat import (
    DATA_STREAM_KEEPALIVE_LINE,
    HeartbeatOption,
)
from assistant_stream.serialization.stream_encoder import StreamEncoder
from assistant_stream.serialization.tool_args_settle import ToolCallArgsSettler
from assistant_stream.state_proxy import StateProxyJSONEncoder

logger = logging.getLogger(__name__)


class DataStreamEncoder(StreamEncoder):
    def encode_chunk(self, chunk: AssistantStreamChunk) -> str | None:
        if chunk.type == "text-delta":
            if hasattr(chunk, 'parent_id') and chunk.parent_id:
                return f"aui-text-delta:{json.dumps({'textDelta': chunk.text_delta, 'parentId': chunk.parent_id}, cls=StateProxyJSONEncoder)}\n"
            else:
                return f"0:{json.dumps(chunk.text_delta, cls=StateProxyJSONEncoder)}\n"
        elif chunk.type == "reasoning-part-start":
            if chunk.unstable_summary is None:
                return None
            # Reasoning otherwise reaches the wire only through its deltas,
            # which cannot carry a summary and emit nothing at all for a part
            # that never appends text.
            value: dict[str, Any] = {"unstable_summary": chunk.unstable_summary}
            if chunk.parent_id is not None:
                value["parentId"] = chunk.parent_id
            return f"aui-reasoning-part-start:{json.dumps(value, cls=StateProxyJSONEncoder)}\n"
        elif chunk.type == "reasoning-delta":
            if hasattr(chunk, 'parent_id') and chunk.parent_id:
                return f"aui-reasoning-delta:{json.dumps({'reasoningDelta': chunk.reasoning_delta, 'parentId': chunk.parent_id}, cls=StateProxyJSONEncoder)}\n"
            else:
                return f"g:{json.dumps(chunk.reasoning_delta, cls=StateProxyJSONEncoder)}\n"
        elif chunk.type == "tool-call-begin":
            data = {"toolCallId": chunk.tool_call_id, "toolName": chunk.tool_name}
            if hasattr(chunk, 'parent_id') and chunk.parent_id:
                data["parentId"] = chunk.parent_id
            return f'b:{json.dumps(data, cls=StateProxyJSONEncoder)}\n'
        elif chunk.type == "tool-call-delta":
            return f'c:{json.dumps({ "toolCallId": chunk.tool_call_id, "argsTextDelta": chunk.args_text_delta }, cls=StateProxyJSONEncoder)}\n'
        elif chunk.type == "tool-call-args-text-finish":
            return f'c:{json.dumps({ "toolCallId": chunk.tool_call_id, "argsTextDelta": chunk.args_text_delta, "isFinal": True }, cls=StateProxyJSONEncoder)}\n'
        elif chunk.type == "tool-result":
            res = {"toolCallId": chunk.tool_call_id, "result": chunk.result}
            if chunk.artifact is not None:
                res["artifact"] = chunk.artifact
            if chunk.is_error:
                res["isError"] = chunk.is_error
            return f"a:{json.dumps(res, cls=StateProxyJSONEncoder)}\n"
        elif chunk.type == "data":
            return f"2:{json.dumps([chunk.data], cls=StateProxyJSONEncoder)}\n"
        elif chunk.type == "error":
            return f"3:{json.dumps(chunk.error, cls=StateProxyJSONEncoder)}\n"
        elif chunk.type == "source":
            source_data = {
                "sourceType": chunk.source_type,
                "id": chunk.id,
                "url": chunk.url
            }
            if chunk.title is not None:
                source_data["title"] = chunk.title
            if hasattr(chunk, 'parent_id') and chunk.parent_id:
                source_data["parentId"] = chunk.parent_id
            return f"h:{json.dumps(source_data, cls=StateProxyJSONEncoder)}\n"
        elif chunk.type == "update-state":
            return f"aui-state:{json.dumps(chunk.operations, cls=StateProxyJSONEncoder)}\n"
        elif chunk.type == "annotations":
            return f"8:{json.dumps(chunk.annotations, cls=StateProxyJSONEncoder)}\n"
        elif chunk.type == "step-start":
            return f"f:{json.dumps({'messageId': chunk.message_id}, cls=StateProxyJSONEncoder)}\n"
        elif chunk.type == "step-finish":
            payload = {
                "finishReason": chunk.finish_reason,
                "usage": {
                    "inputTokens": chunk.input_tokens,
                    "outputTokens": chunk.output_tokens,
                },
                "isContinued": chunk.is_continued,
            }
            return f"e:{json.dumps(payload, cls=StateProxyJSONEncoder)}\n"
        elif chunk.type == "file":
            file_data = {"data": chunk.data, "mimeType": chunk.mime_type}
            return f"k:{json.dumps(file_data, cls=StateProxyJSONEncoder)}\n"
        return None

    def get_media_type(self) -> str:
        return "text/plain"

    def get_keepalive_token(self) -> str:
        return DATA_STREAM_KEEPALIVE_LINE

    async def encode_stream(
        self, stream: AsyncGenerator[AssistantStreamChunk, None]
    ) -> AsyncGenerator[str, None]:
        def warn(reason: str, detail: str) -> None:
            logger.warning("Dropped data-stream chunk (%s): %s", reason, detail)

        def finish_tool_call_args(
            tool_call_id: str, args_text_delta: str, _: bool
        ) -> list[str]:
            finish = self.encode_chunk(
                ToolCallArgsTextFinishChunk(
                    tool_call_id=tool_call_id,
                    args_text_delta=args_text_delta,
                )
            )
            if finish is not None:
                return [finish]
            return []

        tool_call_args = ToolCallArgsSettler(
            finish_tool_call_args,
            warn,
            emit_empty_args_text=True,
        )

        async for chunk in stream:
            if chunk.type in ("step-finish", "error"):
                for finish in tool_call_args.finish_open():
                    yield finish
            if chunk.type == "tool-call-begin":
                tool_call_args.begin(chunk.tool_call_id)
            elif chunk.type == "tool-result":
                tool_call_args.settle_without_emitting(chunk.tool_call_id)
            elif chunk.type == "tool-call-delta":
                if not tool_call_args.append(chunk.tool_call_id):
                    continue
            elif chunk.type == "tool-call-args-text-finish":
                frames = tool_call_args.finish(
                    chunk.tool_call_id, chunk.args_text_delta
                )
                if not frames:
                    continue
                for frame in frames:
                    yield frame
                continue
            encoded = self.encode_chunk(chunk)
            if encoded is None:
                continue
            yield encoded
        for finish in tool_call_args.finish_open():
            yield finish


class DataStreamResponse(AssistantStreamResponse):
    def __init__(
        self,
        stream: AsyncGenerator[AssistantStreamChunk, None],
        heartbeat: HeartbeatOption = False,
    ):
        super().__init__(stream, DataStreamEncoder(), heartbeat=heartbeat)
