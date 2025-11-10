from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class MessagePart(BaseModel):
    """A part of a user message."""

    type: str = Field(..., description="The type of message part")
    text: Optional[str] = Field(None, description="Text content")
    image: Optional[str] = Field(None, description="Image URL or data")


class UserMessage(BaseModel):
    """A user message."""

    role: str = Field(default="user", description="Message role")
    parts: List[MessagePart] = Field(..., description="Message parts")


class AddMessageCommand(BaseModel):
    """Command to add a new message to the conversation."""

    type: str = Field(default="add-message", description="Command type")
    message: UserMessage = Field(..., description="User message")


class AddToolResultCommand(BaseModel):
    """Command to add a tool result to the conversation."""

    type: str = Field(default="add-tool-result", description="Command type")
    toolCallId: str = Field(..., description="ID of the tool call")
    result: Dict[str, Any] = Field(..., description="Tool execution result")


class AssistantRequest(BaseModel):
    """Request payload for the assistant endpoint."""

    commands: List[Union[AddMessageCommand, AddToolResultCommand]] = Field(
        ..., description="List of commands to execute"
    )
    system: Optional[str] = Field(None, description="System prompt")
    tools: Optional[Dict[str, Any]] = Field(None, description="Available tools")
    runConfig: Optional[Dict[str, Any]] = Field(None, description="Run configuration")
    state: Optional[Dict[str, Any]] = Field(None, description="Current conversation state")
