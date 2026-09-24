from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Literal, Protocol


ResumableStreamRole = Literal["producer", "consumer"]
ResumableStreamStatus = Literal["streaming", "done", "error", "missing"]


@dataclass(frozen=True)
class ResumableStreamEntry:
    cursor: str
    chunk: bytes


@dataclass(frozen=True)
class ResumableStreamLease:
    token: str


@dataclass(frozen=True)
class ResumableStreamAcquisition:
    role: ResumableStreamRole
    lease: ResumableStreamLease | None


class CancellationSignal(Protocol):
    def is_set(self) -> bool: ...

    async def wait(self) -> bool: ...


class ResumableStreamStore(Protocol):
    """Stores may also implement acquire_lease and accept a lease keyword on append and finalize; the context then passes each producer its lease, so a producer superseded by a later acquisition cannot change the replacement stream.

    finalize returns False when nothing was finalized, because the stream was already terminal or the lease no longer owns it; a store returning None is taken to have finalized.
    """

    async def acquire(
        self, stream_id: str, *, ttl_ms: int | None = None
    ) -> ResumableStreamRole: ...

    async def append(self, stream_id: str, chunk: bytes) -> None: ...

    async def finalize(
        self,
        stream_id: str,
        status: Literal["done", "error"],
        error: str | None = None,
    ) -> bool | None: ...

    def read(
        self, stream_id: str, cursor: str, signal: CancellationSignal
    ) -> AsyncIterator[ResumableStreamEntry]: ...

    async def status(self, stream_id: str) -> ResumableStreamStatus: ...

    async def delete(self, stream_id: str) -> None: ...
