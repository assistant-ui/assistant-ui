import asyncio


class AssistantStream:
    def __init__(self, queue: asyncio.Queue):
        self.queue = queue
