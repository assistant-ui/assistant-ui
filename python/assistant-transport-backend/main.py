#!/usr/bin/env python3
"""
Assistant Transport Backend - Simple FastAPI + assistant-stream server

This server implements the assistant-transport protocol with static responses.
"""

import os
import asyncio
import random
from typing import Dict, Any, List, Literal, Optional, Union
from contextlib import asynccontextmanager
import uvicorn 

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator
from dotenv import load_dotenv

from assistant_stream.serialization import AssistantTransportResponse
from assistant_stream import RunController, create_run

# Load environment variables
load_dotenv()


class MessagePart(BaseModel):
    """A part of a user message."""
    type: str = Field(..., description="The type of message part")
    text: Optional[str] = Field(None, description="Text content")
    image: Optional[str] = Field(None, description="Image URL or data")


class UserMessage(BaseModel):
    """A user message."""
    role: str = Field(default="user", description="Message role")
    id: str | None = Field(None, description="Client message ID")
    parts: List[MessagePart] = Field(..., description="Message parts")


class AddMessageCommand(BaseModel):
    """Command to add a new message to the conversation."""
    type: Literal["add-message"] = Field(default="add-message", description="Command type")
    message: UserMessage = Field(..., description="User message")


class AddToolResultCommand(BaseModel):
    """Command to add a tool result to the conversation."""
    type: Literal["add-tool-result"] = Field(default="add-tool-result", description="Command type")
    toolCallId: str = Field(..., description="ID of the tool call")
    toolName: Optional[str] = Field(None, description="Name of the tool")
    result: Any = Field(..., description="Tool execution result")
    isError: Optional[bool] = Field(None, description="Whether the tool failed")


BUILT_IN_COMMANDS = ("add-message", "add-tool-result")


class CustomCommand(BaseModel):
    """Any other command, such as one sent with useAssistantTransportSendCommand."""
    model_config = ConfigDict(extra="allow")

    type: str = Field(..., description="Command type")

    @field_validator("type")
    @classmethod
    def not_built_in(cls, value: str) -> str:
        # A built-in command that failed its own model must not pass as custom.
        if value in BUILT_IN_COMMANDS:
            raise ValueError(f"malformed {value} command")
        return value


Command = Union[AddMessageCommand, AddToolResultCommand, CustomCommand]


def only_custom(commands: list) -> bool:
    """Whether every command is custom. Those change state but ask for no reply."""
    return bool(commands) and all(isinstance(command, CustomCommand) for command in commands)


class AssistantRequest(BaseModel):
    """Request payload for the assistant endpoint."""
    commands: List[Command] = Field(
        ..., description="Every command queued since the last request, oldest first"
    )
    system: Optional[str] = Field(None, description="System prompt")
    tools: Optional[Dict[str, Any]] = Field(None, description="Available tools")
    # Additional fields that may be sent by the frontend
    runConfig: Optional[Dict[str, Any]] = Field(None, description="Run configuration")
    state: Optional[Dict[str, Any]] = Field(None, description="State")


def find_tool_call(messages: Any, tool_call_id: str) -> Any:
    """The tool-call part with this id, newest message first, or None.

    Reads by index, so writes to the returned part stream on every
    assistant-stream version (iterated values forward writes from 0.0.37).
    """
    for m in range(len(messages) - 1, -1, -1):
        parts = messages[m].get("parts") or []
        for p in range(len(parts)):
            part = parts[p]
            if part.get("type") == "tool-call" and part.get("toolCallId") == tool_call_id:
                return part
    return None


def apply_commands(state: Any, commands: List[Command]) -> None:
    """Apply every command to the state, oldest first."""
    for command in commands:
        if isinstance(command, AddMessageCommand):
            state["messages"].append(command.message.model_dump())
        elif isinstance(command, AddToolResultCommand):
            part = find_tool_call(state["messages"], command.toolCallId)
            if part is None:
                print(f"⚠️ No tool call {command.toolCallId} for its result")
                continue
            part["result"] = command.result
            if command.isError is not None:
                part["isError"] = command.isError
        # Custom commands land here. This backend has none of its own, so it
        # accepts and skips them; handle your types by `command.type`.


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    print("🚀 Assistant Transport Backend starting up...")
    yield
    print("🛑 Assistant Transport Backend shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Assistant Transport Backend",
    description="A simple server implementing the assistant-transport protocol with static responses",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials="*" not in cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


@app.post("/assistant")
async def assistant_endpoint(request: AssistantRequest): 
    # Create streaming response using assistant-stream
    async def run_callback(controller: RunController):
        """Callback function for the run controller."""
        try:
            print("run_callback")
            await asyncio.sleep(1)

            if controller.state is None:
                controller.state = {}
            controller.state.setdefault("messages", [])
            apply_commands(controller.state, request.commands)
            if only_custom(request.commands):
                return

            await asyncio.sleep(1)

            controller.state["messages"].append({
                "role": "assistant",
                "parts": [
                    {
                        "type": "text",
                        "text": "Hello22"
                    }
                ]
            })

            controller.state["messages"][-1]["parts"].append({
                "type": "tool-call",
                "toolCallId": "tool_" + str(random.randint(0, 1000000)),
                "toolName": "get_weather",
                "argsText": "",
                "done": False,
            })

            await asyncio.sleep(1)

            controller.state["messages"][-1]["parts"][-1]["argsText"] = "{\"location\": \"SF\""

            await asyncio.sleep(1)

            controller.state["messages"][-1]["parts"][-1]["argsText"] =  controller.state["messages"][-1]["parts"][-1]["argsText"] +    "}"
            controller.state["messages"][-1]["parts"][-1]["done"] = True

            await asyncio.sleep(1)

            controller.state["provider"] = "completed"
            print("run_callback3")
        except Exception as e:
            print(f"❌ Error in stream generation: {e}")
            controller.state["provider"] = "error"
            controller.append_text(f"Error: {str(e)}")
    
    # Create streaming response using assistant-stream
    stream = create_run(run_callback, state=request.state)
    
    return AssistantTransportResponse(stream)


def main():
    """Main entry point for running the server."""
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    
    print(f"🌟 Starting Assistant Transport Backend on {host}:{port}")
    print(f"🎯 Debug mode: {debug}")
    print(f"🌍 CORS origins: {cors_origins}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level=log_level,
        access_log=True,
    )


if __name__ == "__main__":
    main()
