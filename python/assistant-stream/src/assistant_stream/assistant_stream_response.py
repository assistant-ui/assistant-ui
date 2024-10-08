from assistant_stream import AssistantStream, DataStreamEncoder
from fastapi.responses import StreamingResponse
from assistant_stream.serialization.data_stream import DataStreamEncoder


class AssistantStreamResponse(StreamingResponse):
    def __init__(self, stream: AssistantStream, stream_format: DataStreamEncoder):
        async def stream_generator():
            while True:
                chunk = await stream.queue.get()
                if chunk is None:
                    break
                yield stream_format.encode(chunk)
                stream.queue.task_done()

        super().__init__(stream_generator(), media_type="text/plain")
