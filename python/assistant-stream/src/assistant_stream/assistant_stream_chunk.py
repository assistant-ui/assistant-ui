from dataclasses import dataclass
from typing import Any, Union


# Define the data classes for different chunk types
@dataclass
class TextDeltaChunk:
    type: str  # "text-delta"
    textDelta: str

@dataclass
class ToolCallBeginChunk:
    type: str  # "tool-call-begin"
    toolCallId: str
    toolName: str

@dataclass
class ToolCallDeltaChunk:
    type: str  # "tool-call-delta"
    toolCallId: str
    argsTextDelta: str

@dataclass
class ToolResultChunk:
    type: str  # "tool-result"
    toolCallId: str
    result: Any

# Define the union type for AssistantStreamChunk
AssistantStreamChunk = Union[
    TextDeltaChunk,
    ToolCallBeginChunk,
    ToolCallDeltaChunk,
    ToolResultChunk,
]