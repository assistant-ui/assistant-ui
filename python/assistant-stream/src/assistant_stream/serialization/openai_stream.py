from assistant_stream.assistant_stream_chunk import AssistantStreamChunk
import json
import time
import string
import random
from typing import AsyncGenerator
from assistant_stream.serialization.assistant_stream_response import (
    AssistantStreamResponse,
)
from assistant_stream.serialization.stream_encoder import StreamEncoder


def generate_openai_style_id():
    prefix = "chatcmpl-"
    characters = string.ascii_letters + string.digits
    random_id = "".join(random.choices(characters, k=24))
    return prefix + random_id


class OpenAIStreamEncoder(StreamEncoder):
    def __init__(self, model="assistant_stream", system_fingerprint="fp_0000000000"):
        self.id = generate_openai_style_id()
        self.model = model
        self.system_fingerprint = system_fingerprint
        pass

    def get_media_type(self) -> str:
        return "text/event-stream"

    def _create_chunk(self, delta={}, finish_reason=None):
        response = {
            "id": self.id,
            "object": "chat.completion.chunk",
            "created": int(time.time()),
            "model": self.model,
            "system_fingerprint": self.system_fingerprint,
            "choices": [
                {
                    "index": 0,
                    "delta": delta,
                    "logprobs": None,
                    "finish_reason": finish_reason,
                }
            ],
        }
        return f"data: {json.dumps(response, ensure_ascii=False)}\n\n"

    def encode_chunk(self, chunk: AssistantStreamChunk) -> str:
        """
        Encodes the chunk into OpenAI's SSE format.
        """
        if chunk.type == "text-delta":
            # Construct the delta for text content
            return self._create_chunk({"content": chunk.text_delta})
        else:
            # Handle unknown chunk types gracefully
            return ""

    async def encode_stream(
        self, stream: AsyncGenerator[AssistantStreamChunk, None]
    ) -> AsyncGenerator[str, None]:
        """
        Asynchronously encodes chunks into SSE-formatted strings.
        """
        async for chunk in stream:
            encoded_chunk = self.encode_chunk(chunk)
            if encoded_chunk:
                yield encoded_chunk

        yield self._create_chunk(finish_reason="stop")
        yield "data: [DONE]\n\n"


class OpenAIStreamResponse(AssistantStreamResponse):
    def __init__(
        self,
        stream: AsyncGenerator[AssistantStreamChunk, None],
    ):
        """
        Initializes the response with the OpenAI SSE encoder.
        """
        super().__init__(stream, OpenAIStreamEncoder())
