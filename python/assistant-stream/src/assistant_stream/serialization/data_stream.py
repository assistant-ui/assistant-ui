from assistant_stream import AssistantStreamChunk
import json


class DataStreamEncoder:
    def __init__(self):
        pass

    def encode(self, chunk: AssistantStreamChunk) -> str:
        if chunk.type == "text-delta":
            return f"0:{json.dumps(chunk.textDelta)}\n"
        elif chunk.type == "tool-call-begin":
            return f"b:{json.dumps({ "toolCallId": chunk.toolCallId, "toolName": chunk.toolName })}\n"
        elif chunk.type == "tool-call-delta":
            return f"c:{json.dumps({ "toolCallId": chunk.toolCallId, "argsTextDelta": chunk.argsTextDelta })}\n"
        elif chunk.type == "tool-result":
            return f"a:{json.dumps({ "toolCallId": chunk.toolCallId, "result": chunk.result })}\n"
        pass
