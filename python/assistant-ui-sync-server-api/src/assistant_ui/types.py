from typing import TypedDict, Literal, Union, Dict, Any, List, Optional


class TextPart(TypedDict):
    type: Literal["text"]
    text: str


class ImagePart(TypedDict):
    type: Literal["image"]
    image: str


class FilePart(TypedDict):
    type: Literal["file"]
    data: str
    mimeType: str


class ToolCallPart(TypedDict):
    type: Literal["tool-call"]
    toolCallId: str
    toolName: str
    args: Dict[str, Any]


class ToolResultPart(TypedDict):
    type: Literal["tool-result"]
    toolCallId: str
    toolName: str
    result: Any
    isError: Optional[bool]


ContentPart = Union[TextPart, ImagePart, FilePart, ToolCallPart, ToolResultPart]


class SystemMessage(TypedDict):
    role: Literal["system"]
    content: str
    unstable_id: Optional[str]


class UserMessage(TypedDict):
    role: Literal["user"]
    content: List[Union[TextPart, ImagePart, FilePart]]
    unstable_id: Optional[str]


class AssistantMessage(TypedDict):
    role: Literal["assistant"]
    content: List[Union[TextPart, ToolCallPart]]
    unstable_id: Optional[str]


class ToolMessage(TypedDict):
    role: Literal["tool"]
    content: List[ToolResultPart]


Message = Union[SystemMessage, UserMessage, AssistantMessage, ToolMessage]


class ToolParameters(TypedDict):
    type: Literal["object"]
    properties: Dict[str, Any]
    required: Optional[List[str]]
    additionalProperties: Optional[bool]


class Tool(TypedDict, total=False):
    description: str
    parameters: ToolParameters