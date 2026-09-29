import asyncio
from typing import AsyncGenerator, TypeVar


T = TypeVar("T")


def enqueue_threadsafe(
    loop: asyncio.AbstractEventLoop,
    queue: asyncio.Queue[T | None],
    item: T | None,
) -> None:
    loop.call_soon_threadsafe(queue.put_nowait, item)


async def queue_stream(queue: asyncio.Queue[T | None]) -> AsyncGenerator[T, None]:
    while True:
        item = await queue.get()
        if item is None:
            queue.task_done()
            break
        yield item
        queue.task_done()
