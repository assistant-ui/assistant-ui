from typing import Any, List, Union, TYPE_CHECKING


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

    def __init__(self, state_manager: "StateManager", path: List[str] = []):
        """Initialize with state manager and current path."""
        self._manager = state_manager
        self._path = path

    def __getitem__(self, key: Union[str, int]) -> Union["StateProxy", Any]:
        """Access nested values with dict-style syntax. Returns primitives directly except strings."""
        str_key = str(key)
        current_value = self._manager.get_value_at_path(self._path)

        # Validate key exists
        if not isinstance(current_value, dict) or str_key not in current_value:
            raise KeyError(key)

        # Get value at path
        value = self._manager.get_value_at_path(self._path + [str_key])

        # Return primitives directly (except strings)
        if value is None or isinstance(value, (int, float, bool)):
            return value

        # Return proxy for collections and strings
        return StateProxy(self._manager, self._path + [str_key])

    def __setitem__(self, key: Union[str, int], value: Any) -> None:
        """Set value with dict-style syntax."""
        self._manager.add_operations(
            [{"type": "set", "path": self._path + [str(key)], "value": value}]
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
