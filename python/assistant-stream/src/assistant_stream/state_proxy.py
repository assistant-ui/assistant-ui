from typing import Any, List, Optional, Union, TYPE_CHECKING


# Avoid circular import
if TYPE_CHECKING:
    from assistant_stream.state_manager import StateManager


class StateProxy:
    """Proxy object for state access and updates using dictionary-style access.

    Example:
        state_proxy["user"]["name"] = "John"
        name = state_proxy["user"]["name"]
        state_proxy["messages"] += "Hello"
        state_proxy["items"].append("item")
    """

    def _get_value(self):
        return self._manager.get_value_at_path(self._path)

    def __init__(
        self,
        state_manager: "StateManager",
        path: Optional[List[str]] | None = None,
    ) -> None:
        """Initialize with state manager and current path."""
        self._manager = state_manager
        self._path = path or []

    def __getitem__(self, key: Union[str, int]) -> Union["StateProxy", Any]:
        """Access nested values with dict-style syntax. Returns primitives directly except strings."""
        current_value = self._manager.get_value_at_path(self._path)

        # Handle list indexing
        if isinstance(current_value, list):
            try:
                index = int(key)
                list_len = len(current_value)

                # Handle negative indices
                if index < 0:
                    index = list_len + index

                # Validate index is in bounds
                if index < 0 or index >= list_len:
                    raise KeyError(key)

                # Use the normalized index as string key
                str_key = str(index)
            except (ValueError, TypeError):
                raise KeyError(key)
        else:
            # For dicts, use string representation of key
            str_key = str(key)

            # Validate key exists
            if isinstance(current_value, dict):
                if str_key not in current_value:
                    raise KeyError(key)
            elif not isinstance(current_value, list):
                raise KeyError(key)

        # Get value at path
        value = self._manager.get_value_at_path(self._path + [str_key])

        # Return primitives directly (including strings)
        if value is None or isinstance(value, (int, float, bool, str)):
            return value

        # Return proxy only for collections
        return StateProxy(self._manager, self._path + [str_key])

    def __setitem__(self, key: Union[str, int], value: Any) -> None:
        """Set value with dict-style syntax."""
        current_value = self._manager.get_value_at_path(self._path)

        # Handle list indexing
        if isinstance(current_value, list):
            try:
                index = int(key)
                list_len = len(current_value)

                # Handle negative indices
                if index < 0:
                    index = list_len + index

                # Validate index is in bounds
                if index < 0 or index >= list_len:
                    raise KeyError(key)

                # Use the normalized index as string key
                str_key = str(index)
            except (ValueError, TypeError):
                raise KeyError(key)
        else:
            # For dicts and other types, use string representation of key
            str_key = str(key)

        self._manager.add_operations(
            [{"type": "set", "path": self._path + [str_key], "value": value}]
        )

    def __iadd__(self, other: Any) -> "StateProxy":
        """Support += for strings and lists."""
        current_value = self._manager.get_value_at_path(self._path)

        # String concatenation
        if isinstance(current_value, str):
            if not isinstance(other, str):
                raise TypeError(
                    f"Can only concatenate str (not '{type(other).__name__}') to str"
                )

            self._manager.add_operations(
                [{"type": "append-text", "path": self._path, "value": other}]
            )
            return self

        # List extension
        if isinstance(current_value, list):
            try:
                # Ensure other is iterable
                iterator = iter(other)

                # Add each item at the end of the list
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
            except TypeError:
                raise TypeError(
                    f"can only concatenate list (not '{type(other).__name__}') to list"
                )

        raise TypeError(
            f"unsupported operand type(s) for +=: '{type(current_value).__name__}' and '{type(other).__name__}'"
        )

    def __repr__(self) -> str:
        """String representation of the value."""
        return repr(self._manager.get_value_at_path(self._path))

    def __str__(self) -> str:
        """String representation of the value."""
        return str(self._manager.get_value_at_path(self._path))

    def __len__(self) -> int:
        """Length of the value."""
        return len(self._manager.get_value_at_path(self._path))

    def __contains__(self, item: Any) -> bool:
        """Check if item is in the value."""
        return item in self._manager.get_value_at_path(self._path)

    def __eq__(self, other: Any) -> bool:
        """Compare equality with another value."""
        return self._manager.get_value_at_path(self._path) == other

    def __ne__(self, other: Any) -> bool:
        """Compare inequality with another value."""
        return self._manager.get_value_at_path(self._path) != other

    def __hash__(self) -> int:
        """Hash the underlying value if hashable."""
        value = self._manager.get_value_at_path(self._path)
        if isinstance(value, (str, int, float, bool, tuple)):
            return hash(value)
        raise TypeError(f"unhashable type: '{type(value).__name__}'")

    def __bool__(self) -> bool:
        """Truth value of the underlying value."""
        return bool(self._manager.get_value_at_path(self._path))

    def __int__(self) -> int:
        """Convert to int if possible."""
        return int(self._manager.get_value_at_path(self._path))

    def __float__(self) -> float:
        """Convert to float if possible."""
        return float(self._manager.get_value_at_path(self._path))

    def __add__(self, other: Any) -> Any:
        """Add operation for strings and lists."""
        value = self._manager.get_value_at_path(self._path)
        if isinstance(value, str) and isinstance(other, str):
            return value + other
        if isinstance(value, list) and hasattr(other, "__iter__"):
            return value + list(other)
        return NotImplemented

    def __getattr__(self, name: str) -> Any:
        """Forward attribute access to the underlying value."""
        value = self._manager.get_value_at_path(self._path)

        # Handle string methods
        if isinstance(value, str):
            attr = getattr(value, name)
            if callable(attr):

                def method_wrapper(*args, **kwargs):
                    result = attr(*args, **kwargs)
                    return self if result is value else result

                return method_wrapper
            return attr

        # Forward non-modifying methods for lists and dicts
        try:
            attr = getattr(value, name)
            if callable(attr):
                return lambda *args, **kwargs: attr(*args, **kwargs)
            return attr
        except (AttributeError, TypeError):
            pass

        raise AttributeError(
            f"'{type(value).__name__}' object has no attribute '{name}'"
        )

    def __iter__(self):
        """Make the proxy iterable."""
        return iter(self._manager.get_value_at_path(self._path))

    # Efficient list operations
    def append(self, item: Any) -> None:
        """Append an item to a list."""
        value = self._manager.get_value_at_path(self._path)
        if not isinstance(value, list):
            raise TypeError(f"'append' not supported for type {type(value).__name__}")

        self._manager.add_operations(
            [{"type": "set", "path": self._path + [str(len(value))], "value": item}]
        )

    def extend(self, iterable: Any) -> None:
        """Extend a list with items from an iterable."""
        if isinstance(iterable, StateProxy):
            iterable = iterable._manager.get_value_at_path(iterable._path)
        self.__iadd__(iterable)

    def clear(self) -> None:
        """Clear a list or dictionary."""
        value = self._manager.get_value_at_path(self._path)

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
        value = self._manager.get_value_at_path(self._path)
        if not isinstance(value, dict):
            raise TypeError(f"'get' not supported for type {type(value).__name__}")

        try:
            return self[key]
        except KeyError:
            return default

    def keys(self):
        """Dictionary keys view."""
        value = self._manager.get_value_at_path(self._path)
        if not isinstance(value, dict):
            raise TypeError(f"'keys' not supported for type {type(value).__name__}")
        return value.keys()

    def values(self):
        """Dictionary values view."""
        value = self._manager.get_value_at_path(self._path)
        if not isinstance(value, dict):
            raise TypeError(f"'values' not supported for type {type(value).__name__}")
        return value.values()

    def items(self):
        """Dictionary items view."""
        value = self._manager.get_value_at_path(self._path)
        if not isinstance(value, dict):
            raise TypeError(f"'items' not supported for type {type(value).__name__}")
        return value.items()

    def setdefault(self, key, default=None):
        """Set default value if key doesn't exist."""
        value = self._manager.get_value_at_path(self._path)
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

    def update(self, *args, **kwargs):
        """Not supported - would require sending entire dictionary."""
        raise NotImplementedError("Use individual assignments instead")

    def popitem(self):
        """Not supported - would require sending entire dictionary."""
        raise NotImplementedError(
            "Would require sending the entire dictionary over the network"
        )
