from dataclasses import dataclass
from typing import Any, Dict, List, Literal, TypedDict, Union


# Define the data classes for different chunk types
@dataclass
class TextDeltaChunk:
    text_delta: str
    type: str = "text-delta"


@dataclass
class ToolCallBeginChunk:
    tool_call_id: str
    tool_name: str
    type: str = "tool-call-begin"


@dataclass
class ToolCallDeltaChunk:
    tool_call_id: str
    args_text_delta: str
    type: str = "tool-call-delta"


@dataclass
class ToolResultChunk:
    tool_call_id: str
    result: Any
    artifact: Any | None = None
    is_error: bool = False
    type: str = "tool-result"


@dataclass
class DataChunk:
    data: Any
    type: str = "data"


@dataclass
class ErrorChunk:
    error: str
    type: str = "error"


# Define ObjectStream operation types as TypedDict
class ObjectStreamSetOperation(TypedDict):
    path: List[str]
    value: Any
    type: Literal["set"]


class ObjectStreamAppendTextOperation(TypedDict):
    path: List[str]
    value: str
    type: Literal["append-text"]


ObjectStreamOperation = Union[ObjectStreamSetOperation, ObjectStreamAppendTextOperation]


@dataclass
class UpdateStateChunk:
    operations: List[ObjectStreamOperation]
    type: str = "update-state"


# Define the union type for AssistantStreamChunk
AssistantStreamChunk = Union[
    TextDeltaChunk,
    ToolCallBeginChunk,
    ToolCallDeltaChunk,
    ToolResultChunk,
    DataChunk,
    ErrorChunk,
    UpdateStateChunk,
]
