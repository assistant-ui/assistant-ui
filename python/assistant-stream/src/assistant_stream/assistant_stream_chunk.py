from dataclasses import dataclass
from typing import Any, Union


# Define the data classes for different chunk types
@dataclass
class TextDeltaChunk:
    type: str  # "text-delta"
    text_delta: str

@dataclass
class ToolCallBeginChunk:
    type: str  # "tool-call-begin"
    tool_call_id: str
    tool_name: str

@dataclass
class ToolCallDeltaChunk:
    type: str  # "tool-call-delta"
    tool_call_id: str
    args_text_delta: str

@dataclass
class ToolResultChunk:
    type: str  # "tool-result"
    tool_call_id: str
    result: Any

# Define the union type for AssistantStreamChunk
AssistantStreamChunk = Union[
    TextDeltaChunk,
    ToolCallBeginChunk,
    ToolCallDeltaChunk,
    ToolResultChunk,
]