import asyncio
from typing import Any, Callable, Dict, List, TYPE_CHECKING

from assistant_stream.assistant_stream_chunk import (
    ObjectStreamOperation,
    ObjectStreamSetOperation,
    ObjectStreamAppendTextOperation,
    UpdateStateChunk,
)

# Avoid circular import
if TYPE_CHECKING:
    from assistant_stream.state_proxy import StateProxy


class StateManager:
    """Manages state operations with efficient batching and local updates."""

    def __init__(self, put_chunk_callback: Callable[[UpdateStateChunk], None]):
        """Initialize with callback for sending state updates."""
        self._state_data = {}
        self._pending_operations = []
        self._update_scheduled = False
        self._put_chunk_callback = put_chunk_callback
        self._loop = asyncio.get_event_loop()
        self.state = StateProxy(self, [])

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

    def _apply_operation_to_local_state(self, operation: ObjectStreamOperation) -> None:
        """Apply operation to local state."""
        if isinstance(operation, ObjectStreamSetOperation):
            self._update_path(operation.path, lambda _: operation.value)
        elif isinstance(operation, ObjectStreamAppendTextOperation):
            def append_text(current):
                if current is None or not isinstance(current, str):
                    path_str = ", ".join(operation.path)
                    raise TypeError(f"Expected string at path [{path_str}]")
                return current + operation.value
                
            self._update_path(operation.path, append_text)
        else:
            raise TypeError(f"Invalid operation type: {type(operation).__name__}")

    def get_value_at_path(self, path: List[str]) -> Any:
        """Get value at path, raising KeyError for invalid paths."""
        if not path:
            return self._state_data
            
        current = self._state_data
        
        for key in path:
            if not isinstance(current, dict) or key not in current:
                raise KeyError(key)
            current = current[key]

        return current
        
    def _update_path(self, path: List[str], updater: Callable[[Any], Any]) -> None:
        """Update value at path without creating parent objects."""
        # Handle empty path (update root state)
        if not path:
            self._state_data = updater(self._state_data)
            return
            
        # Get first key and rest of path
        key, *rest = path
        
        # Validate current state
        if not isinstance(self._state_data, dict):
            raise KeyError(key)
            
        # Handle single key path
        if not rest:
            if key not in self._state_data and updater(None) is None:
                return
            self._state_data[key] = updater(self._state_data.get(key))
            return
            
        # Handle nested path
        if key not in self._state_data:
            raise KeyError(key)
            
        # Get current value and create temporary manager
        current_value = self._state_data[key]
        temp_manager = type(self)(lambda _: None)
        temp_manager._state_data = current_value
        
        # Update nested path
        try:
            temp_manager._update_path(rest, updater)
            self._state_data[key] = temp_manager._state_data
        except KeyError:
            raise
