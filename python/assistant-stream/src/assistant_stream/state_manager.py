import asyncio
from typing import Any, Callable, Dict, List

from assistant_stream.assistant_stream_chunk import (
    ObjectStreamOperation,
    UpdateStateChunk,
)
from assistant_stream.state_proxy import StateProxy


class StateManager:
    """Manages state operations with efficient batching and local updates."""

    def __init__(
        self,
        put_chunk_callback: Callable[[UpdateStateChunk], None],
        state_data: Any | None = None,
    ):
        """Initialize with callback for sending state updates."""
        self._state_data = state_data
        self._pending_operations = []
        self._update_scheduled = False
        self._put_chunk_callback = put_chunk_callback
        self._loop = asyncio.get_running_loop()
        self._state_proxy = StateProxy(self, [])

    @property
    def state(self) -> Any:
        """Access the state proxy object for making state updates.

        If state is None, returns None directly instead of a proxy.
        Otherwise returns a proxy object for the state.
        """
        if self._state_data is None:
            return None
        return self._state_proxy

    @property
    def state_data(self) -> Dict[str, Any]:
        """Current state data."""
        return self._state_data

    def add_operations(self, operations: List[ObjectStreamOperation]) -> None:
        """Add operations to pending batch and apply locally."""
        # Apply to local state immediately
        for operation in operations:
            self._apply_operation_to_local_state(operation)

        # Add to pending operations
        self._pending_operations.extend(operations)

        # Schedule batch update if needed
        if not self._update_scheduled:
            self._update_scheduled = True
            self._loop.call_soon_threadsafe(self._flush_updates)

    def _flush_updates(self) -> None:
        """Send pending operations as a batch."""
        if self._pending_operations:
            operations_to_send = self._pending_operations.copy()
            self._pending_operations.clear()
            self._put_chunk_callback(UpdateStateChunk(operations=operations_to_send))

        self._update_scheduled = False

    def flush(self) -> None:
        """Explicitly flush any pending operations.

        This should be called before the run completes to ensure all state updates are sent.
        """
        if self._pending_operations:
            self._flush_updates()

    def _apply_operation_to_local_state(self, operation: ObjectStreamOperation) -> None:
        """Apply operation to local state."""
        op_type = operation["type"]

        if op_type == "set":
            self._update_path(operation["path"], lambda _: operation["value"])

        elif op_type == "append-text":

            def append_text(current):
                if not isinstance(current, str):
                    path_str = ", ".join(operation["path"])
                    raise TypeError(f"Expected string at path [{path_str}]")
                return current + operation["value"]

            self._update_path(operation["path"], append_text)

        else:
            raise TypeError(f"Invalid operation type: {op_type}")

    def get_value_at_path(self, path: List[str]) -> Any:
        """Get value at path, raising KeyError for invalid paths."""
        if not path:
            return self._state_data

        # If state is None, we can't navigate further
        if self._state_data is None:
            raise KeyError(path[0] if path else "")

        current = self._state_data

        for key in path:
            try:
                if isinstance(current, list):
                    idx = int(key)
                    if idx < 0 or idx >= len(current):
                        raise KeyError(key)
                    current = current[idx]
                elif isinstance(current, dict):
                    current = current[key]
                else:
                    raise KeyError(key)
            except (ValueError, KeyError, IndexError):
                raise KeyError(key)

        return current

    def _update_path(self, path: List[str], updater: Callable[[Any], Any]) -> None:
        """Update value at path without creating parent objects."""
        # Handle empty path (update root state)
        if not path:
            self._state_data = updater(self._state_data)
            return

        # Initialize state as empty object if it's null
        if self._state_data is None:
            self._state_data = {}

        if not isinstance(self._state_data, (dict, list)):
            raise KeyError(f"Invalid path: [{', '.join(path)}]")

        key, *rest = path

        # Handle list access
        if isinstance(self._state_data, list):
            try:
                idx = int(key)
                if idx < 0 or idx > len(self._state_data):
                    raise KeyError(key)

                if not rest:
                    # For direct update
                    if idx == len(self._state_data):  # Append case
                        value = updater(None)
                        if value is not None:
                            self._state_data.append(value)
                    else:  # Update existing element
                        self._state_data[idx] = updater(self._state_data[idx])
                else:
                    # For nested update
                    if idx == len(self._state_data):
                        raise KeyError(key)

                    # Create a copy for the nested update
                    next_state = self._state_data.copy()

                    # Create a temporary manager for the nested path
                    temp_manager = type(self)(lambda _: None)
                    temp_manager._state_data = next_state[idx]

                    # Update nested path
                    temp_manager._update_path(rest, updater)
                    next_state[idx] = temp_manager._state_data
                    self._state_data = next_state
            except ValueError:
                raise KeyError(key)
        else:  # Handle dict access
            if not rest:
                # For direct update
                if key not in self._state_data and updater(None) is None:
                    return
                self._state_data[key] = updater(self._state_data.get(key))
            else:
                # For nested update
                if key not in self._state_data:
                    raise KeyError(key)

                # Create a copy for the nested update
                next_state = dict(self._state_data)

                # Create a temporary manager for the nested path
                temp_manager = type(self)(lambda _: None)
                temp_manager._state_data = next_state[key]

                # Update nested path
                temp_manager._update_path(rest, updater)
                next_state[key] = temp_manager._state_data
                self._state_data = next_state
