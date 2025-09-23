#!/usr/bin/env python3
"""
Assistant Transport Backend with LangGraph - FastAPI + assistant-stream + LangGraph server
"""

import os
import asyncio
from typing import Dict, Any, List, Optional, Union, Sequence, Annotated
from contextlib import asynccontextmanager
import uvicorn
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from assistant_stream.serialization import DataStreamResponse
from assistant_stream import RunController, create_run
from assistant_stream.modules.langgraph import append_langgraph_event, get_tool_call_subgraph_state

from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph
from langgraph.graph import add_messages
from langgraph.prebuilt import ToolNode

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage, BaseMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from typing import TypedDict

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


class ChatRequest(BaseModel):
    """Request payload for the chat endpoint."""
    commands: List[Union[AddMessageCommand, AddToolResultCommand]] = Field(
        ..., description="List of commands to execute"
    )
    system: Optional[str] = Field(None, description="System prompt")
    tools: Optional[Dict[str, Any]] = Field(None, description="Available tools")
    runConfig: Optional[Dict[str, Any]] = Field(None, description="Run configuration")
    state: Optional[Dict[str, Any]] = Field(None, description="State")


# Define LangGraph state
class GraphState(TypedDict):
    """State for the conversation graph."""
    messages: Annotated[Sequence[BaseMessage], add_messages]


# Define subagent state
class SubagentState(TypedDict):
    """State for the subagent."""
    messages: Annotated[Sequence[BaseMessage], add_messages]
    task: str
    result: str


# Create the Task tool
@tool
def task_tool(task_description: str) -> str:
    """
    Execute a complex task using a subagent.

    Args:
        task_description: Description of the task to perform

    Returns:
        The result of the task execution
    """
    # This is a placeholder - the actual execution will be handled by the subgraph
    return f"Task '{task_description}' will be executed by the subagent."


# Subagent node for executing tasks
async def subagent_node(state: SubagentState) -> Dict[str, Any]:
    """Subagent that executes the task."""
    messages = state.get("messages", [])
    task = state.get("task", "")

    # Initialize a simpler LLM for the subagent
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
        streaming=True
    )

    # Create a prompt for the subagent
    subagent_messages = [
        SystemMessage(content=f"You are a helpful subagent. Execute this task: {task}"),
        HumanMessage(content=f"Please complete the following task: {task}")
    ]

    # Generate response
    if os.getenv("OPENAI_API_KEY"):
        response = await llm.ainvoke(subagent_messages)
        result = response.content
    else:
        result = f"Mock subagent result for task: {task}"

    return {
        "messages": [AIMessage(content=result)],
        "result": result
    }


def create_subagent_graph() -> CompiledStateGraph:
    """Create the subagent graph."""
    workflow = StateGraph(SubagentState)

    # Add the subagent node
    workflow.add_node("execute_task", subagent_node)

    # Set entry and exit points
    workflow.set_entry_point("execute_task")
    workflow.add_edge("execute_task", END)

    return workflow.compile()


async def agent_node(state: GraphState) -> Dict[str, Any]:
    """Main agent node that can call tools."""
    messages = state.get("messages", [])

    # Initialize the LLM with tool binding
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
        streaming=True,
    )

    # Bind the Task tool to the LLM
    llm_with_tools = llm.bind_tools([task_tool])

    # Check if OpenAI API key is set
    if os.getenv("OPENAI_API_KEY"):
        response = await llm_with_tools.ainvoke(messages)
    else:
        # Mock response with a tool call for testing
        print("⚠️ No OpenAI API key found - using mock response with tool call")
        response = AIMessage(
            content="I'll help you with that task.",
            tool_calls=[{
                "id": "task_001",
                "name": "task_tool",
                "args": {"task_description": "Complete the requested task"}
            }]
        )

    return {"messages": [response]}


def should_call_tools(state: GraphState) -> str:
    """Determine if tools should be called."""
    messages = state.get("messages", [])
    if not messages:
        return "end"

    last_message = messages[-1]
    # Check if the last message has tool calls
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"

    return "end"


async def tool_executor_node(state: GraphState) -> Dict[str, Any]:
    """Execute tool calls, including Task tool which spawns subagents."""
    messages = state.get("messages", [])
    if not messages:
        return {"messages": []}

    last_message = messages[-1]
    if not hasattr(last_message, 'tool_calls') or not last_message.tool_calls:
        return {"messages": []}

    # Process each tool call
    tool_messages = []
    for tool_call in last_message.tool_calls:
        if tool_call["name"] == "task_tool":
            # Extract task description
            task_description = tool_call["args"].get("task_description", "")

            # Create and run the subagent graph

            # Initialize subagent state
            subagent_state = {
                "messages": [],
                "task": task_description,
                "result": ""
            }

            # Run the subagent
            final_state = await subagent_graph.ainvoke(subagent_state)

            # Create tool message with the result
            tool_message = ToolMessage(
                content=final_state.get("result", "Task completed"),
                tool_call_id=tool_call["id"],
                artifact={"subgraph_state": final_state}
            )
            tool_messages.append(tool_message)
        else:
            # Handle other tools if any
            tool_message = ToolMessage(
                content=f"Executed tool {tool_call['name']}",
                tool_call_id=tool_call["id"]
            )
            tool_messages.append(tool_message)

    return {"messages": tool_messages}


subagent_graph = create_subagent_graph()

def create_graph() -> CompiledStateGraph:
    """Create and compile the LangGraph with subgraph support."""
    # Create the main workflow
    workflow = StateGraph(GraphState)

    # Add nodes
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_executor_node)

    # Set entry point
    workflow.set_entry_point("agent")

    # Add conditional edges
    workflow.add_conditional_edges(
        "agent",
        should_call_tools,
        {
            "tools": "tools",
            "end": END
        }
    )

    # After tools, go back to agent for potential follow-up
    workflow.add_edge("tools", "agent")

    # Compile the graph
    return workflow.compile()

graph = create_graph()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    print("🚀 Assistant Transport Backend with LangGraph starting up...")
    yield
    print("🛑 Assistant Transport Backend with LangGraph shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Assistant Transport Backend with LangGraph",
    description="A server implementing the assistant-transport protocol with LangGraph and subgraphs",
    version="0.2.0",
    lifespan=lifespan,
)

# Configure CORS
cors_origins = ["*"]  # Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


@app.post("/assistant")
async def chat_endpoint(request: ChatRequest):
    """Chat endpoint using LangGraph with streaming and subgraph support."""

    async def run_callback(controller: RunController):
        """Callback function for the run controller."""
        # Initialize controller state if needed
        if controller.state is None:
            controller.state = {}
        if "messages" not in controller.state:
            controller.state["messages"] = []

        input_messages = []

        # Process commands
        for command in request.commands:
            if command.type == "add-message":
                # Extract text from parts
                text_parts = [
                    part.text for part in command.message.parts
                    if part.type == "text" and part.text
                ]
                if text_parts:
                    input_messages.append(HumanMessage(content=" ".join(text_parts)))
            elif command.type == "add-tool-result":
                # Handle tool results
                input_messages.append(ToolMessage(
                    content=str(command.result),
                    tool_call_id=command.toolCallId
                ))

        # Add messages to controller state
        for message in input_messages:
            controller.state["messages"].append(message.model_dump())

        # Create initial state for LangGraph
        input_state = {"messages": input_messages}

        # Stream with subgraph support
        async for namespace, event_type, chunk in graph.astream(
            input_state,
            stream_mode=["messages", "updates"],
            subgraphs=True
        ):
            state = get_tool_call_subgraph_state(
                controller,
                subgraph_node="tools",
                namespace=namespace,
                artifact_field_name="subgraph_state",
                default_state={}
            )
            # Append the event normally
            append_langgraph_event(
                state,
                namespace,
                event_type,
                chunk
            )

    # Create streaming response using assistant-stream
    stream = create_run(run_callback, state=request.state)

    return DataStreamResponse(stream)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "assistant-transport-backend-langgraph"}


def main():
    """Main entry point for running the server."""
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8010"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    log_level = os.getenv("LOG_LEVEL", "info").lower()

    print(f"🌟 Starting Assistant Transport Backend with LangGraph on {host}:{port}")
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