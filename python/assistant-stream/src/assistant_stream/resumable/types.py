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
    async def acquire(
        self, stream_id: str, *, ttl_ms: int | None = None
    ) -> ResumableStreamRole: ...

    async def acquire_lease(
        self, stream_id: str, *, ttl_ms: int | None = None
    ) -> ResumableStreamAcquisition: ...

    async def append(
        self,
        stream_id: str,
        chunk: bytes,
        lease: ResumableStreamLease | None = None,
    ) -> None: ...

    async def finalize(
        self,
        stream_id: str,
        status: Literal["done", "error"],
        error: str | None = None,
        lease: ResumableStreamLease | None = None,
    ) -> None: ...

    def read(
        self, stream_id: str, cursor: str, signal: CancellationSignal
    ) -> AsyncIterator[ResumableStreamEntry]: ...

    async def status(self, stream_id: str) -> ResumableStreamStatus: ...

    async def delete(self, stream_id: str) -> None: ...
