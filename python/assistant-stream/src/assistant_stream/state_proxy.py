import json
from typing import Any

from assistant_stream.state import StateProxy


class StateProxyJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that can handle StateProxy objects."""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, StateProxy):
            return obj._get_value()
        return super().default(obj)
