from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional
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

    def get_keepalive_token(self) -> Optional[str]:
        """
        Returns the chunk emitted as a keepalive while the stream is idle,
        or None if the format has no benign keepalive token.
        """
        return None

    @abstractmethod
    async def encode_stream(
        self, stream: AsyncGenerator[AssistantStreamChunk, None]
    ) -> AsyncGenerator[str, None]:
        """
        Encode the stream of AssistantStreamChunk into a specific format.
        This method must be implemented by subclasses.
        """
        pass
