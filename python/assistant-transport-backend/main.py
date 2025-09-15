#!/usr/bin/env python3
"""
Assistant Transport Backend - Simple FastAPI + assistant-stream server

This server implements the assistant-transport protocol with static responses.
"""

import os
import asyncio
import random
from typing import Dict, Any, List, Optional, Union
from contextlib import asynccontextmanager
import uvicorn 

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from assistant_stream.serialization import DataStreamResponse
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
    # Additional fields that may be sent by the frontend
    runConfig: Optional[Dict[str, Any]] = Field(None, description="Run configuration")
    state: Optional[Dict[str, Any]] = Field(None, description="State")


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
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
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

            if (request.commands[0].type == "add-message"):
                controller.state["messages"].append(request.commands[0].message.model_dump())
            if (request.commands[0].type == "add-tool-result"):
                controller.state["messages"][-1]["parts"][-1]["result"] = request.commands[0].result

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
    
    return DataStreamResponse(stream)


def main():
    """Main entry point for running the server."""
    host = os.getenv("HOST", "0.0.0.0")
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