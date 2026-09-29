from collections.abc import Callable
from typing import Generic, TypeVar


Frame = TypeVar("Frame")


class ToolCallArgsSettler(Generic[Frame]):
    def __init__(
        self,
        finish_frames: Callable[[str, str, bool], list[Frame]],
        warn: Callable[[str, str], None],
        *,
        emit_empty_args_text: bool,
    ) -> None:
        self._finish_frames = finish_frames
        self._warn = warn
        self._emit_empty_args_text = emit_empty_args_text
        self._open: dict[str, bool] = {}
        self._settled: set[str] = set()
        self._warned_reasons: set[str] = set()

    def begin(self, tool_call_id: str) -> None:
        self._settled.discard(tool_call_id)
        self._open[tool_call_id] = False

    def append(self, tool_call_id: str) -> bool:
        if tool_call_id not in self._open:
            if tool_call_id in self._settled:
                reason = "settled-tool-call-id"
            else:
                reason = "unknown-tool-call-id"
            self._warn_once(reason, f"tool-call-delta for {tool_call_id}")
            return False
        self._open[tool_call_id] = True
        return True

    def settle_without_emitting(self, tool_call_id: str) -> None:
        self._open.pop(tool_call_id, None)
        self._settled.add(tool_call_id)

    def finish(
        self, tool_call_id: str, args_text_delta: str = ""
    ) -> list[Frame]:
        has_args_text = self._open.pop(tool_call_id, None)
        if has_args_text is None:
            return []
        self._settled.add(tool_call_id)
        if (
            self._emit_empty_args_text
            and not args_text_delta
            and not has_args_text
        ):
            # A decoder that predates `isFinal` appends this delta and settles
            # on what it has, skipping its own empty-object default once any
            # delta has arrived. The frame must therefore carry the default.
            args_text_delta = "{}"
        return self._finish_frames(tool_call_id, args_text_delta, has_args_text)

    def finish_open(self) -> list[Frame]:
        frames: list[Frame] = []
        for tool_call_id in tuple(self._open):
            frames.extend(self.finish(tool_call_id))
        return frames

    def clear(self) -> None:
        self._open.clear()
        self._settled.clear()

    def _warn_once(self, reason: str, detail: str) -> None:
        if reason in self._warned_reasons:
            return
        self._warned_reasons.add(reason)
        self._warn(reason, detail)
