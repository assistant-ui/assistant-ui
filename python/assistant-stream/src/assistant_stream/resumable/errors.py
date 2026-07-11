from __future__ import annotations

import re
from typing import Literal


ResumableStreamErrorCode = Literal["missing", "exists", "finalized", "invalid-id"]

DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

_STREAM_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.:-]{1,256}$")


class ResumableStreamError(Exception):
    def __init__(self, code: ResumableStreamErrorCode, message: str) -> None:
        super().__init__(message)
        self.code = code


def validate_stream_id(stream_id: str) -> None:
    if not _STREAM_ID_PATTERN.match(stream_id):
        raise ResumableStreamError(
            "invalid-id",
            f"Invalid streamId: {stream_id} (must match {_STREAM_ID_PATTERN.pattern})",
        )
