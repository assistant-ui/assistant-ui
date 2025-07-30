from assistant_stream.assistant_stream_chunk import (
    AssistantStreamChunk,
)
import json
from typing import AsyncGenerator, Any
from assistant_stream.serialization.assistant_stream_response import (
    AssistantStreamResponse,
)
from assistant_stream.serialization.stream_encoder import StreamEncoder
from assistant_stream.state_proxy import StateProxy


class StateProxyJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that can handle StateProxy objects."""
    def default(self, obj: Any) -> Any:
        if isinstance(obj, StateProxy):
            return obj._get_value()
        return super().default(obj)


class DataStreamEncoder(StreamEncoder):
    def __init__(self):
        pass

    def encode_chunk(self, chunk: AssistantStreamChunk) -> str:
        if chunk.type == "text-delta":
            if hasattr(chunk, 'parent_id') and chunk.parent_id:
                return f"aui-text-delta:{json.dumps({'textDelta': chunk.text_delta, 'parentId': chunk.parent_id}, cls=StateProxyJSONEncoder)}\n"
            else:
                return f"0:{json.dumps(chunk.text_delta, cls=StateProxyJSONEncoder)}\n"
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

    def get_media_type(self) -> str:
        return "text/plain"

    async def encode_stream(
        self, stream: AsyncGenerator[AssistantStreamChunk, None]
    ) -> AsyncGenerator[str, None]:
        async for chunk in stream:
            encoded = self.encode_chunk(chunk)
            if encoded is None:
                continue
            yield encoded


class DataStreamResponse(AssistantStreamResponse):
    def __init__(
        self,
        stream: AsyncGenerator[AssistantStreamChunk, None],
    ):
        super().__init__(stream, DataStreamEncoder())
