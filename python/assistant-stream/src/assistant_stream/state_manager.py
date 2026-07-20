import asyncio
from typing import Any, Callable, Dict, List, Sequence, Union

from assistant_stream.assistant_stream_chunk import (
    ObjectStreamOperation,
    UpdateStateChunk,
)
from assistant_stream.state import Flusher, AssistantState, StateDraft
from assistant_stream.state_proxy import StateProxy


class StateManager:
    """Manages state operations with efficient batching and local updates."""

    def __init__(
        self,
        put_chunk_callback: Callable[[UpdateStateChunk], None],
        state_data: Any | None = None,
    ):
        """Initialize with callback for sending state updates."""
        self._state = AssistantState(state_data)
        self._put_chunk_callback = put_chunk_callback
        self._loop = asyncio.get_running_loop()
        self._flusher = Flusher(self._emit_operations, self._loop.call_soon_threadsafe)
        self._draft = StateDraft(self._state, self._flusher.add)
        self._state_proxy = StateProxy(self._draft, [])

    @property
    def state(self) -> Any:
        """Access the state proxy object for making state updates.

        If state is None, returns None directly instead of a proxy.
        Otherwise returns a proxy object for the state.
        """
        if self._state.state is None:
            return None
        return self._state_proxy

    @property
    def state_data(self) -> Dict[str, Any]:
        """Current state data."""
        return self._state.state

    def add_operations(self, operations: List[ObjectStreamOperation]) -> None:
        """Apply operations locally and add them to the pending batch."""
        self._draft.add_operations(operations)

    def append_text(self, path: Sequence[Union[str, int]], value: str) -> None:
        """Append text at a path using an explicit append-text delta operation."""
        self._draft.append_text(path, value)

    def flush(self) -> None:
        """Explicitly flush any pending operations.

        This should be called before the run completes to ensure all state updates are sent.
        """
        self._flusher.flush()

    def get_value_at_path(self, path: List[str]) -> Any:
        """Get value at path, raising KeyError for invalid paths."""
        return self._draft.get_value_at_path(path)

    def _emit_operations(self, operations: List[ObjectStreamOperation]) -> None:
        self._put_chunk_callback(UpdateStateChunk(operations=operations))
