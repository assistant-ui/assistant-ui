#!/usr/bin/env python3
"""
Assistant Transport Backend with LangGraph - FastAPI + assistant-stream + LangGraph server
"""

import json
import os
from collections.abc import Sequence
from contextlib import asynccontextmanager
from typing import Annotated, Any, TypedDict
from uuid import uuid4

import uvicorn
from assistant_stream import RunController, create_run
from assistant_stream.modules.langgraph import append_langgraph_event, get_tool_call_subgraph_state
from assistant_stream.serialization import DataStreamResponse
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.channels import DeltaChannel
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, StateGraph, add_messages
from langgraph.graph.state import CompiledStateGraph
from pydantic import BaseModel, ConfigDict, Field

# Load environment variables
load_dotenv()

_postgres_checkpointer_context = None


class MessagePart(BaseModel):
    """A part of a user message."""
    type: str = Field(..., description="The type of message part")
    text: str | None = Field(None, description="Text content")
    image: str | None = Field(None, description="Image URL or data")


class UserMessage(BaseModel):
    """A user message."""
    role: str = Field(default="user", description="Message role")
    parts: list[MessagePart] = Field(..., description="Message parts")


class AddMessageCommand(BaseModel):
    """Command to add a new message to the conversation."""
    type: str = Field(default="add-message", description="Command type")
    message: UserMessage = Field(..., description="User message")


class AddToolResultCommand(BaseModel):
    """Command to add a tool result to the conversation."""
    model_config = ConfigDict(populate_by_name=True)

    type: str = Field(default="add-tool-result", description="Command type")
    tool_call_id: str = Field(..., alias="toolCallId", description="ID of the tool call")
    tool_name: str | None = Field(None, alias="toolName", description="Name of the tool")
    result: Any = Field(..., description="Tool execution result")
    is_error: bool | None = Field(None, alias="isError", description="Whether the tool failed")
    artifact: Any | None = Field(None, description="UI-only tool result artifact")
    model_content: Any | None = Field(
        None, alias="modelContent", description="Tool result content for the model"
    )


class ChatRequest(BaseModel):
    """Request payload for the chat endpoint."""
    model_config = ConfigDict(populate_by_name=True)

    commands: list[AddMessageCommand | AddToolResultCommand] = Field(
        ..., description="List of commands to execute"
    )
    system: str | None = Field(None, description="System prompt")
    tools: dict[str, Any] | None = Field(None, description="Available tools")
    run_config: dict[str, Any] | None = Field(
        None, alias="runConfig", description="Run configuration"
    )
    thread_id: str | None = Field(None, alias="threadId", description="Assistant UI thread ID")
    state: dict[str, Any] | None = Field(None, description="State")


def get_thread_id(request: ChatRequest) -> str:
    """Use persistent checkpoints only when the AssistantTransport request identifies a thread."""
    return request.thread_id or f"anonymous-{uuid4()}"


def add_messages_delta(
    state: Sequence[BaseMessage],
    writes: Sequence[BaseMessage | Sequence[BaseMessage]],
) -> list[BaseMessage]:
    result = list(state)
    for write in writes:
        if isinstance(write, BaseMessage):
            result = add_messages(result, [write])
        else:
            result = add_messages(result, list(write))
    return result


def request_tool_schemas(tools: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not tools:
        return []

    schemas = []
    for name, tool_definition in tools.items():
        if name in TOOL_BY_NAME or not isinstance(tool_definition, dict):
            continue

        parameters = tool_definition.get("parameters") or {
            "type": "object",
            "properties": {},
        }
        schemas.append(
            {
                "type": "function",
                "function": {
                    "name": name,
                    "description": tool_definition.get("description", ""),
                    "parameters": parameters,
                },
            }
        )
    return schemas


def bindable_tools(tools: dict[str, Any] | None) -> list[Any]:
    return [*TOOLS, *request_tool_schemas(tools)]


def tool_result_content(command: AddToolResultCommand) -> str:
    content = command.model_content if command.model_content is not None else command.result
    return content if isinstance(content, str) else json.dumps(content)


# Define LangGraph state
class GraphState(TypedDict, total=False):
    """State for the conversation graph."""
    messages: Annotated[
        Sequence[BaseMessage],
        DeltaChannel(reducer=add_messages_delta, snapshot_frequency=50),
    ]
    tools: dict[str, Any] | None


# Define subagent state
class SubagentState(TypedDict):
    """State for the subagent."""
    messages: Annotated[
        Sequence[BaseMessage],
        DeltaChannel(reducer=add_messages_delta, snapshot_frequency=50),
    ]
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


@tool
def calculate_sum(numbers: list[float]) -> dict[str, Any]:
    """
    Add a list of numbers.

    Args:
        numbers: Numbers to add together.
    """
    return {
        "numbers": numbers,
        "sum": sum(numbers),
        "count": len(numbers),
    }


@tool
def save_note(title: str, body: str) -> dict[str, Any]:
    """
    Save a sample note and return a note ID.

    Args:
        title: Short note title.
        body: Note body.
    """
    note_seed = f"{title}\n{body}"
    note_id = sum((index + 1) * ord(char) for index, char in enumerate(note_seed))
    return {
        "id": f"note-{note_id % 100000}",
        "title": title,
        "body": body,
        "saved": True,
    }


TOOLS = [task_tool, calculate_sum, save_note]
TOOL_BY_NAME = {tool.name: tool for tool in TOOLS}


# Subagent node for executing tasks
async def subagent_node(state: SubagentState) -> dict[str, Any]:
    """Subagent that executes the task."""
    task = state.get("task", "")

    # Create a prompt for the subagent
    subagent_messages = [
        SystemMessage(content=f"You are a helpful subagent. Execute this task: {task}"),
        HumanMessage(content=f"Please complete the following task: {task}")
    ]

    # Generate response
    if os.getenv("OPENAI_API_KEY"):
        # Initialize a simpler LLM for the subagent
        llm = ChatOpenAI(
            model="gpt-5.4-nano",
            temperature=0.7,
            streaming=True
        )
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


async def agent_node(state: GraphState) -> dict[str, Any]:
    """Main agent node that can call tools."""
    messages = state.get("messages", [])
    tools = state.get("tools")

    # Check if OpenAI API key is set
    if os.getenv("OPENAI_API_KEY"):
        # Initialize the LLM with tool binding
        llm = ChatOpenAI(
            model="gpt-5.4-nano",
            temperature=0.7,
            streaming=True,
        )

        # Bind server tools plus request-provided frontend tool declarations.
        llm_with_tools = llm.bind_tools(bindable_tools(tools))
        response = await llm_with_tools.ainvoke(messages)
    elif messages and isinstance(messages[-1], ToolMessage):
        response = AIMessage(
            content=f"Task complete: {messages[-1].content}",
        )
    else:
        # Mock response with a tool call for testing
        print("⚠️ No OpenAI API key found - using mock response with tool call")
        last_content = messages[-1].content if messages else ""
        if "weather" in str(last_content).lower() and tools and "get_weather" in tools:
            tool_call = {
                "id": "weather_001",
                "name": "get_weather",
                "args": {"location": "San Francisco", "unit": "fahrenheit"},
            }
        elif "sum" in str(last_content).lower() or "add" in str(last_content).lower():
            tool_call = {
                "id": "sum_001",
                "name": "calculate_sum",
                "args": {"numbers": [2, 3, 5]},
            }
        elif "note" in str(last_content).lower():
            tool_call = {
                "id": "note_001",
                "name": "save_note",
                "args": {"title": "Smoke test", "body": "Saved from mock mode"},
            }
        else:
            tool_call = {
                "id": "task_001",
                "name": "task_tool",
                "args": {"task_description": "Complete the requested task"},
            }

        response = AIMessage(content="I'll call a tool for that.", tool_calls=[tool_call])

    return {"messages": [response]}


def should_call_tools(state: GraphState) -> str:
    """Run only backend-owned tools. Frontend tools are returned to the client."""
    messages = state.get("messages", [])
    if not messages:
        return "end"

    last_message = messages[-1]
    if (
        hasattr(last_message, 'tool_calls')
        and last_message.tool_calls
        and any(tool_call["name"] in TOOL_BY_NAME for tool_call in last_message.tool_calls)
    ):
        return "tools"

    return "end"


async def tool_executor_node(state: GraphState) -> dict[str, Any]:
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
        tool_name = tool_call["name"]
        if tool_name == "task_tool":
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
            tool = TOOL_BY_NAME.get(tool_name)
            if tool is None:
                result = {"error": f"Unknown tool: {tool_name}"}
            else:
                result = tool.invoke(tool_call.get("args", {}))

            tool_message = ToolMessage(
                content=json.dumps(result),
                tool_call_id=tool_call["id"],
                name=tool_name,
                artifact=result,
            )
            tool_messages.append(tool_message)

    return {"messages": tool_messages}


subagent_graph = create_subagent_graph()

async def configure_checkpointer_from_env() -> None:
    """Switch the graph to the configured persistent checkpointer, when present."""
    postgres_url = os.getenv("LANGGRAPH_POSTGRES_URL") or os.getenv("DATABASE_URL")
    if not postgres_url:
        return

    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

    global _postgres_checkpointer_context, graph
    if _postgres_checkpointer_context is not None:
        return

    _postgres_checkpointer_context = AsyncPostgresSaver.from_conn_string(postgres_url)
    checkpointer = await _postgres_checkpointer_context.__aenter__()
    await checkpointer.setup()
    graph = create_graph(checkpointer)


def create_graph(checkpointer=None) -> CompiledStateGraph:
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

    # Compile with a checkpointer so DeltaChannel is exercised across thread turns.
    return workflow.compile(checkpointer=checkpointer or InMemorySaver())

graph = create_graph()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    print("🚀 Assistant Transport Backend with LangGraph starting up...")
    await configure_checkpointer_from_env()
    try:
        yield
    finally:
        if _postgres_checkpointer_context is not None:
            await _postgres_checkpointer_context.__aexit__(None, None, None)
        print("🛑 Assistant Transport Backend with LangGraph shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Assistant Transport Backend with LangGraph",
    description=(
        "A server implementing the assistant-transport protocol with LangGraph and subgraphs"
    ),
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
                    content=tool_result_content(command),
                    tool_call_id=command.tool_call_id,
                    name=command.tool_name,
                    artifact=command.artifact if command.artifact is not None else command.result,
                    status="error" if command.is_error else "success",
                ))

        # Add messages to controller state
        for message in input_messages:
            controller.state["messages"].append(message.model_dump())

        # Create initial state for LangGraph
        input_state = {"messages": input_messages, "tools": request.tools}

        # Stream with subgraph support
        config = {
            "configurable": {
                "thread_id": get_thread_id(request),
            }
        }

        async for namespace, event_type, chunk in graph.astream(
            input_state,
            config=config,
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
