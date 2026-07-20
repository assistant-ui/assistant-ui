from abc import ABC, abstractmethod
from typing import AsyncGenerator
from assistant_stream.assistant_stream_chunk import AssistantStreamChunk


class StreamEncoder(ABC):
    """
    Abstract base class for stream encoders, requiring an implementation of `encode_stream`.
    """

    @abstractmethod
    def get_media_type(self) -> str:
        """
        Returns the MIME type of the stream.
        """
        pass

    @abstractmethod
    async def encode_stream(
        self, stream: AsyncGenerator[AssistantStreamChunk, None]
    ) -> AsyncGenerator[str, None]:
        """
        Encode the stream of AssistantStreamChunk into a specific format.
        This method must be implemented by subclasses.
        """
        pass
