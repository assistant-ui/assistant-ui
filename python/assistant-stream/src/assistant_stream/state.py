"""Authoritative state container, mutation proxy, and op batcher.

Backs assistant-transport state streaming: proxy writes become update-state
operations (deep_apply/lookup path semantics) batched for emission. Only the
server side of the wire is implemented (ops-only, no ack).
"""

import threading
from typing import Any, Callable, List, Optional, Protocol, Sequence, Union

from assistant_stream.assistant_stream_chunk import ObjectStreamOperation

StateOperation = ObjectStreamOperation


class StateOpHost(Protocol):
    def get_value_at_path(self, path: List[str]) -> Any: ...

    def add_operations(self, operations: List[StateOperation]) -> None: ...

    def append_text(self, path: Sequence[Union[str, int]], value: str) -> None: ...


def lookup_state(state: Any, path: Sequence[str]) -> Any:
    """Resolve a path against state, raising KeyError for invalid paths."""
    if not path:
        return state

    current = state
    for key in path:
        if isinstance(current, list):
            try:
                idx = int(key)
            except ValueError:
                raise KeyError(key)
            if idx < 0 or idx >= len(current):
                raise KeyError(key)
            current = current[idx]
        elif isinstance(current, dict):
            current = current[key]
        else:
            raise KeyError(key)

    return current


def deep_apply(target: Any, path: Sequence[str], op: StateOperation) -> Any:
    """Apply an operation at a path, returning the updated value.

    Containers along the path are copied rather than mutated. Missing dict
    entries are created; a list index equal to the list length appends.
    Rebuilding the list per operation makes large batched extensions
    quadratic; state lists are expected to stay small.
    """
    if not path:
        op_type = op["type"]
        if op_type == "set":
            return op["value"]
        if op_type == "append-text":
            if target is None:
                return op["value"]
            if not isinstance(target, str):
                path_str = ", ".join(op["path"])
                raise TypeError(f"Expected string at path [{path_str}]")
            return target + op["value"]
        raise TypeError(f"Invalid operation type: {op_type}")

    head, rest = path[0], path[1:]

    if isinstance(target, list):
        try:
            idx = int(head)
        except (TypeError, ValueError):
            raise KeyError(head)
        if idx < 0 or idx > len(target):
            raise KeyError(head)
        if idx == len(target):
            return [*target, deep_apply(None, rest, op)]
        copy = list(target)
        copy[idx] = deep_apply(copy[idx], rest, op)
        return copy

    obj = target if isinstance(target, dict) else {}
    return {**obj, head: deep_apply(obj.get(head), rest, op)}


class AssistantState:
    """Authoritative state container. Applies ops; hands out mutation proxies."""

    def __init__(self, initial_state: Any | None = None):
        self._state = initial_state

    @property
    def state(self) -> Any:
        return self._state

    def apply(self, operations: Sequence[StateOperation]) -> None:
        for op in operations:
            self._state = deep_apply(self._state, op["path"], op)

    def lookup(self, path: Sequence[str]) -> Any:
        return lookup_state(self._state, path)

    def draft(self, on_operations: Callable[[List[StateOperation]], None]) -> "StateProxy":
        """Return a mutation proxy whose writes apply to this container and
        forward the resulting ops to on_operations."""
        return StateProxy(StateDraft(self, on_operations), [])


class StateDraft:
    def __init__(self, state: AssistantState, on_operations: Callable[[List[StateOperation]], None]):
        self._state = state
        self._on_operations = on_operations

    def get_value_at_path(self, path: List[str]) -> Any:
        return self._state.lookup(path)

    def add_operations(self, operations: List[StateOperation]) -> None:
        operations = [op for op in operations if not self._is_writeback(op)]
        if not operations:
            return
        for op in operations:
            if op["type"] == "set":
                _ensure_no_proxy(op["value"])
        self._state.apply(operations)
        self._on_operations(operations)

    def _is_writeback(self, op: StateOperation) -> bool:
        return (
            op["type"] == "set"
            and isinstance(op["value"], StateProxy)
            and op["value"]._manager is self
            and op["value"]._path == op["path"]
        )

    def append_text(self, path: Sequence[Union[str, int]], value: str) -> None:
        if not isinstance(value, str):
            raise TypeError(
                f"Can only append str (not '{type(value).__name__}') as text delta"
            )
        self.add_operations(
            [
                {
                    "type": "append-text",
                    "path": [str(segment) for segment in path],
                    "value": value,
                }
            ]
        )


class Flusher:
    """Batches ops and emits them through a callback.

    A schedule callback (typically loop.call_soon_threadsafe) defers emission;
    flush() emits synchronously so callers can force state ops out ahead of
    other stream chunks. Safe to call add() from worker threads.
    """

    def __init__(
        self,
        emit: Callable[[List[StateOperation]], None],
        schedule: Optional[Callable[[Callable[[], None]], None]] = None,
    ):
        self._emit = emit
        self._schedule = schedule
        self._lock = threading.Lock()
        self._pending: List[StateOperation] = []
        self._scheduled = False

    def add(self, operations: Sequence[StateOperation]) -> None:
        with self._lock:
            self._pending.extend(operations)
            if self._schedule is None or self._scheduled:
                return
            self._scheduled = True
        self._schedule(self.flush)

    def flush(self) -> None:
        with self._lock:
            operations = self._pending
            self._pending = []
            self._scheduled = False
        if operations:
            self._emit(operations)


def _ensure_no_proxy(value: Any) -> None:
    if isinstance(value, StateProxy):
        raise ValueError(
            "Cannot store a StateProxy in state; assign a plain value instead"
        )
    if isinstance(value, dict):
        for item in value.values():
            _ensure_no_proxy(item)
    elif isinstance(value, list):
        for item in value:
            _ensure_no_proxy(item)


class StateProxy:
    """Mutation proxy over live state using dictionary-style access.

    Reads resolve through the current state; writes emit set/append-text ops.
    String assignment that extends the current value emits append-text.
    Array-mutating methods that cannot be expressed as ops raise.

    Example:
        proxy["user"]["name"] = "John"
        name = proxy["user"]["name"]
        proxy["messages"] += "Hello"
        proxy["items"].append("item")
    """

    def _get_value(self):
        return self._manager.get_value_at_path(self._path)

    def __init__(
        self,
        manager: StateOpHost,
        path: Optional[List[str]] = None,
    ) -> None:
        """Initialize with an op host and current path."""
        self._manager = manager
        self._path = path or []

    def _resolve_key(
        self, current_value: Any, key: Union[str, int], require_existing: bool
    ) -> str:
        if isinstance(current_value, list):
            try:
                index = int(key)
            except (ValueError, TypeError):
                raise KeyError(key)
            if index < 0:
                index += len(current_value)
            if index < 0 or index >= len(current_value):
                raise KeyError(key)
            return str(index)

        str_key = str(key)
        if require_existing and (
            not isinstance(current_value, dict) or str_key not in current_value
        ):
            raise KeyError(key)
        return str_key

    def __getitem__(self, key: Union[str, int]) -> Union["StateProxy", Any]:
        """Access nested values with dict-style syntax. Returns primitives directly."""
        current_value = self._get_value()
        str_key = self._resolve_key(current_value, key, require_existing=True)

        value = (
            current_value[int(str_key)]
            if isinstance(current_value, list)
            else current_value[str_key]
        )

        if value is None or isinstance(value, (int, float, bool, str)):
            return value

        return type(self)(self._manager, self._path + [str_key])

    def __setitem__(self, key: Union[str, int], value: Any) -> None:
        """Set value with dict-style syntax."""
        current_value = self._get_value()
        str_key = self._resolve_key(current_value, key, require_existing=False)
        target_path = self._path + [str_key]

        if isinstance(current_value, list):
            current_target_value = current_value[int(str_key)]
        elif isinstance(current_value, dict):
            current_target_value = current_value.get(str_key)
        else:
            current_target_value = None

        # Encode string extensions as append-text. Skip empty current values:
        # any.startswith("") matches all strings and would convert first writes too.
        if (
            isinstance(current_target_value, str)
            and isinstance(value, str)
            and current_target_value
            and value.startswith(current_target_value)
        ):
            delta = value[len(current_target_value) :]
            if delta:
                self._manager.append_text(target_path, delta)
                return

        self._manager.add_operations(
            [{"type": "set", "path": target_path, "value": value}]
        )

    def __iadd__(self, other: Any) -> "StateProxy":
        """Support += on list-valued proxies.

        String += on a leaf goes through __setitem__ instead, since
        __getitem__ returns the raw str rather than a proxy.
        """
        current_value = self._get_value()

        # String concatenation
        if isinstance(current_value, str):
            if not isinstance(other, str):
                raise TypeError(
                    f"Can only concatenate str (not '{type(other).__name__}') to str"
                )

            self._manager.append_text(self._path, other)
            return self

        # List extension
        if isinstance(current_value, list):
            try:
                iterator = iter(other)
            except TypeError:
                raise TypeError(
                    f"can only concatenate list (not '{type(other).__name__}') to list"
                )

            operations = []
            current_len = len(current_value)

            for i, item in enumerate(iterator):
                operations.append(
                    {
                        "type": "set",
                        "path": self._path + [str(current_len + i)],
                        "value": item,
                    }
                )

            if operations:
                self._manager.add_operations(operations)
            return self

        raise TypeError(
            f"unsupported operand type(s) for +=: '{type(current_value).__name__}' and '{type(other).__name__}'"
        )

    def __repr__(self) -> str:
        """String representation of the value."""
        return repr(self._get_value())

    def __str__(self) -> str:
        """String representation of the value."""
        return str(self._get_value())

    def __len__(self) -> int:
        """Length of the value."""
        return len(self._get_value())

    def __contains__(self, item: Any) -> bool:
        """Check if item is in the value."""
        return item in self._get_value()

    def __eq__(self, other: Any) -> bool:
        """Compare equality with another value."""
        return self._get_value() == other

    def __ne__(self, other: Any) -> bool:
        """Compare inequality with another value."""
        return self._get_value() != other

    def __hash__(self) -> int:
        """Hash the underlying value if hashable."""
        value = self._get_value()
        if isinstance(value, (str, int, float, bool, tuple)):
            return hash(value)
        raise TypeError(f"unhashable type: '{type(value).__name__}'")

    def __bool__(self) -> bool:
        """Truth value of the underlying value."""
        return bool(self._get_value())

    def __int__(self) -> int:
        """Convert to int if possible."""
        return int(self._get_value())

    def __float__(self) -> float:
        """Convert to float if possible."""
        return float(self._get_value())

    def __add__(self, other: Any) -> Any:
        """Add operation for strings and lists."""
        value = self._get_value()
        if isinstance(value, str) and isinstance(other, str):
            return value + other
        if isinstance(value, list) and hasattr(other, "__iter__"):
            return value + list(other)
        return NotImplemented

    def __getattr__(self, name: str) -> Any:
        """Forward attribute access to the underlying value."""
        value = self._get_value()

        # Handle string methods
        if isinstance(value, str):
            attr = getattr(value, name)
            if callable(attr):

                def method_wrapper(*args, **kwargs):
                    result = attr(*args, **kwargs)
                    return self if result is value else result

                return method_wrapper
            return attr

        return getattr(value, name)

    def __iter__(self):
        """Make the proxy iterable."""
        return iter(self._get_value())

    # Efficient list operations
    def append(self, item: Any) -> None:
        """Append an item to a list."""
        value = self._get_value()
        if not isinstance(value, list):
            raise TypeError(f"'append' not supported for type {type(value).__name__}")

        self._manager.add_operations(
            [{"type": "set", "path": self._path + [str(len(value))], "value": item}]
        )

    def extend(self, iterable: Any) -> None:
        """Extend a list with items from an iterable."""
        if isinstance(iterable, StateProxy):
            iterable = iterable._get_value()
        self.__iadd__(iterable)

    def clear(self) -> None:
        """Clear a list or dictionary."""
        value = self._get_value()

        if isinstance(value, (list, dict)):
            empty_value = [] if isinstance(value, list) else {}
            self._manager.add_operations(
                [{"type": "set", "path": self._path, "value": empty_value}]
            )
        else:
            raise TypeError(f"'clear' not supported for type {type(value).__name__}")

    # Dictionary operations
    def get(self, key: Any, default: Any = None) -> Any:
        """Get dictionary value with default."""
        value = self._get_value()
        if not isinstance(value, dict):
            raise TypeError(f"'get' not supported for type {type(value).__name__}")

        try:
            return self[key]
        except KeyError:
            return default

    def keys(self):
        """Dictionary keys view."""
        value = self._get_value()
        if not isinstance(value, dict):
            raise TypeError(f"'keys' not supported for type {type(value).__name__}")
        return value.keys()

    def values(self):
        """Dictionary values view."""
        value = self._get_value()
        if not isinstance(value, dict):
            raise TypeError(f"'values' not supported for type {type(value).__name__}")
        return value.values()

    def items(self):
        """Dictionary items view."""
        value = self._get_value()
        if not isinstance(value, dict):
            raise TypeError(f"'items' not supported for type {type(value).__name__}")
        return value.items()

    def setdefault(self, key, default=None):
        """Set default value if key doesn't exist."""
        value = self._get_value()
        if not isinstance(value, dict):
            raise TypeError(
                f"'setdefault' not supported for type {type(value).__name__}"
            )

        if key in value:
            return self[key]

        self[key] = default
        return default

    # Unsupported operations that would be inefficient
    def insert(self, index: int, item: Any) -> None:
        """Not supported - would require sending entire list."""
        raise NotImplementedError("Use indexing or append() instead")

    def pop(self, *args):
        """Not supported - would require sending entire collection."""
        raise NotImplementedError(
            "Would require sending the entire collection over the network"
        )

    def remove(self, item: Any) -> None:
        """Not supported - would require sending entire list."""
        raise NotImplementedError(
            "Would require sending the entire list over the network"
        )

    def sort(self, *args, **kwargs) -> None:
        """Not supported - would require sending entire list."""
        raise NotImplementedError(
            "Would require sending the entire list over the network"
        )

    def reverse(self) -> None:
        """Not supported - would require sending entire list."""
        raise NotImplementedError(
            "Would require sending the entire list over the network"
        )

    def update(self, *args, **kwargs):
        """Not supported - would require sending entire dictionary."""
        raise NotImplementedError("Use individual assignments instead")

    def popitem(self):
        """Not supported - would require sending entire dictionary."""
        raise NotImplementedError(
            "Would require sending the entire dictionary over the network"
        )
