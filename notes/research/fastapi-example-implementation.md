---
date: 2025-11-10T10:46:03+0000
researcher: Claude Code
git_commit: 9d026d09f168cfb6df250670c5504d8d04a629fe
branch: Django
repository: assistant-ui
topic: "The FastAPI example and how it is made"
tags: [research, codebase, fastapi, python, assistant-transport, langgraph, backend]
status: complete
last_updated: 2025-11-10
last_updated_by: Claude Code
---

# Research: FastAPI Example Implementation

**Date**: 2025-11-10T10:46:03+0000
**Researcher**: Claude Code
**Git Commit**: 9d026d09f168cfb6df250670c5504d8d04a629fe
**Branch**: Django
**Repository**: assistant-ui

## Research Question

How is the FastAPI example structured and built in the assistant-ui codebase?

## Summary

The assistant-ui repository contains **4 FastAPI-based Python examples** that demonstrate different implementations of the assistant-transport protocol:

1. **assistant-transport-backend** - Basic implementation with static responses
2. **assistant-transport-backend-langgraph** - Advanced implementation with LangGraph and OpenAI integration
3. **state-test** - State management testing server
4. **assistant-stream-hello-world** - Minimal streaming demonstration

All examples share common patterns: FastAPI with uvicorn server, CORS middleware, environment-based configuration, and integration with the custom `assistant-stream` library. The examples progressively increase in complexity from simple static responses to sophisticated multi-agent workflows with LangGraph.

## Detailed Findings

### Overview of FastAPI Examples

The repository includes 4 FastAPI implementations located in the `/python/` directory:

**1. Basic Transport Backend** (`/python/assistant-transport-backend/`)
- Minimal FastAPI server demonstrating the assistant-transport protocol
- Uses static/mock responses without real AI
- 172 lines of Python code
- Port: 8000

**2. LangGraph Transport Backend** (`/python/assistant-transport-backend-langgraph/`)
- Production-ready implementation with LangGraph state machines
- OpenAI GPT-4o-mini integration
- Support for multi-agent workflows with subgraphs
- 390 lines of Python code
- Port: 8001 (to avoid conflicts)

**3. State Test Server** (`/python/state-test/`)
- Testing harness for state management
- Simple POST endpoint for controller state verification
- Used for testing state initialization and mutations

**4. Stream Hello World** (`/python/assistant-stream-hello-world/`)
- Minimal example demonstrating streaming responses
- Single endpoint at `/api/chat/completions`
- Simplest possible implementation

### Basic Transport Backend Implementation

#### Application Structure

The basic backend (`python/assistant-transport-backend/main.py`) provides a reference implementation showing the minimal requirements for an assistant-transport server.

**FastAPI Application Initialization** (lines 74-79):
```python
app = FastAPI(
    title="Assistant Transport Backend",
    description="A simple server implementing the assistant-transport protocol with static responses",
    version="0.1.0",
    lifespan=lifespan,
)
```

**Single POST Endpoint** (lines 92-147):
- Route: `POST /assistant`
- Accepts `AssistantRequest` containing commands and state
- Returns `DataStreamResponse` for streaming updates

#### Request/Response Flow

**Request Model Structure** (lines 53-63):
- `AssistantRequest` containing:
  - `commands`: List of `AddMessageCommand` or `AddToolResultCommand`
  - `system`: Optional system prompt
  - `tools`: Optional tool definitions
  - `runConfig`: Optional run configuration
  - `state`: Optional initial state

**Stream Creation Pattern** (lines 145-147):
```python
stream = create_run(run_callback, state=request.state)
return DataStreamResponse(stream)
```

The `create_run` function from `assistant-stream` accepts:
- `run_callback`: Async function that updates controller state
- `state`: Initial state dictionary

#### Mock Response Generation

The callback function (lines 95-142) simulates an AI assistant:
1. Processes incoming command (add message or tool result)
2. Waits 1 second to simulate processing
3. Adds assistant message with text "Hello22"
4. Creates mock tool call with `get_weather` tool
5. Streams tool arguments incrementally: `{"location": "SF"}`
6. Marks tool call as complete

**Key State Updates**:
- Line 102: Appends user message to state
- Line 104: Updates tool result in last message
- Lines 108-116: Adds assistant text response
- Lines 118-124: Adds incomplete tool call
- Lines 128-133: Streams tool arguments progressively
- Line 137: Sets provider status to "completed"

#### CORS Configuration

CORS middleware setup (lines 81-89):
```python
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

Reads comma-separated origins from environment variable, defaults to `http://localhost:3000`.

#### Lifespan Management

Modern FastAPI lifespan pattern (lines 65-70):
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    print("🚀 Assistant Transport Backend starting up...")
    yield
    print("🛑 Assistant Transport Backend shutting down...")
```

Replaces deprecated `@app.on_event()` decorators with context manager approach.

#### Server Startup

The `main()` function (lines 150-168) configures uvicorn:
- Reads environment variables: `HOST`, `PORT`, `DEBUG`, `LOG_LEVEL`
- Enables auto-reload in debug mode
- Runs with `uvicorn.run("main:app", ...)`

### LangGraph Transport Backend Implementation

#### Key Differences from Basic Version

The LangGraph version (`python/assistant-transport-backend-langgraph/main.py`) replaces static responses with real AI-powered conversations.

**Additional Dependencies**:
- `langgraph>=0.2.0` - State graph framework
- `langchain>=0.2.0` - LLM abstractions
- `langchain-core>=0.2.0` - Message types (HumanMessage, AIMessage, ToolMessage)
- `langchain-openai>=0.1.0` - OpenAI GPT integration
- `httpx>=0.24.0` - HTTP client

#### Graph-Based Architecture

**State Definition** (lines 74-76):
```python
class GraphState(TypedDict):
    """State for the conversation graph."""
    messages: Annotated[Sequence[BaseMessage], add_messages]
```

The `add_messages` reducer automatically handles message list updates.

**Graph Structure** (lines 244-270):
```
START
  ↓
agent_node (Main Agent)
  ↓
should_call_tools (Router)
  ├─→ "tools" → tool_executor_node
  │               ↓
  │              agent_node (loop back)
  │
  └─→ "end" → END
```

**Node Implementations**:

1. **agent_node** (lines 149-178)
   - Creates ChatOpenAI instance with gpt-4o-mini
   - Binds tools to LLM: `llm.bind_tools([task_tool])`
   - Returns AI responses with potential tool calls
   - Graceful degradation without API key (mock responses)

2. **tool_executor_node** (lines 195-239)
   - Processes tool calls from agent
   - Special handling for `task_tool` - creates subagent
   - Returns ToolMessage with subgraph state in artifact

3. **should_call_tools** (lines 181-192)
   - Router function checking for tool calls
   - Returns "tools" or "end"

#### Multi-Agent Subgraph Support

**Subagent State** (lines 80-84):
```python
class SubagentState(TypedDict):
    """State for the subagent."""
    messages: Annotated[Sequence[BaseMessage], add_messages]
    task: str
    result: str
```

**Subagent Graph** (lines 135-146):
- Separate compiled graph for task execution
- Single node: `execute_task`
- Returns structured result

**Subgraph Invocation** (line 222):
```python
final_state = await subagent_graph.ainvoke(subagent_state)
```

**Artifact Pattern** (lines 225-229):
The tool result includes the full subgraph state as an artifact:
```python
ToolMessage(
    content=result_text,
    tool_call_id=tool_call.get("id"),
    artifact={"subgraph_state": final_state}
)
```

This allows the frontend to display subagent progress and results.

#### Streaming with Subgraph Support

**Dual-Mode Streaming** (lines 340-358):
```python
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
    append_langgraph_event(
        state,
        namespace,
        event_type,
        chunk
    )
```

**Key Features**:
- `stream_mode=["messages", "updates"]`: Streams both message tokens and state updates
- `subgraphs=True`: Enables subgraph event streaming
- `get_tool_call_subgraph_state()`: Extracts subgraph state from tool message artifacts
- `append_langgraph_event()`: Converts LangGraph events to assistant-stream format

#### Command Processing

The endpoint converts assistant-transport commands to LangChain messages (lines 316-330):

**AddMessageCommand → HumanMessage**:
```python
text_parts = [
    part.text for part in command.message.parts
    if part.type == "text" and part.text
]
if text_parts:
    input_messages.append(HumanMessage(content=" ".join(text_parts)))
```

**AddToolResultCommand → ToolMessage**:
```python
input_messages.append(ToolMessage(
    content=str(command.result),
    tool_call_id=command.toolCallId
))
```

### Build and Configuration

#### Dependency Management

All examples use modern Python packaging with `pyproject.toml` following PEP 518.

**Build System** (assistant-transport-backend/pyproject.toml:1-3):
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

**Core Dependencies** (assistant-transport-backend/pyproject.toml:23-29):
- `fastapi>=0.100.0` - Web framework
- `uvicorn[standard]>=0.20.0` - ASGI server with websockets/HTTP2
- `assistant-stream>=0.0.28` - Custom streaming protocol
- `pydantic>=2.0.0` - Data validation
- `python-dotenv>=1.0.0` - Environment configuration

**LangGraph Additional Dependencies** (assistant-transport-backend-langgraph/pyproject.toml:7-18):
- `langgraph>=0.2.0`
- `langchain>=0.2.0`
- `langchain-core>=0.2.0`
- `langchain-openai>=0.1.0`
- `httpx>=0.24.0`

#### Installation Methods

**Method 1: pip with pyproject.toml**
```bash
pip install -e .
```
Installs in editable mode - changes to source reflected immediately.

**Method 2: pip with requirements.txt**
```bash
pip install -r requirements.txt
```
Direct dependency installation without package setup.

**Method 3: uv (Modern Approach)**
```bash
uv sync
```
Uses `uv.lock` for deterministic dependency resolution. Faster than pip.

**Method 4: Automated Setup Script**
```bash
python setup.py
```
Interactive setup that:
- Checks Python version (>=3.9 required)
- Creates virtual environment
- Installs dependencies
- Copies `.env.example` to `.env`
- Tests server startup

#### Environment Configuration

**Base Backend** (.env.example):
```env
HOST=0.0.0.0
PORT=8000
DEBUG=true
CORS_ORIGINS=http://localhost:3000,https://yourapp.com
LOG_LEVEL=INFO

# Optional AI provider keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**LangGraph Backend** (.env.example):
```env
HOST=0.0.0.0
PORT=8001  # Different port to avoid conflicts
DEBUG=false
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000
OPENAI_API_KEY=your-openai-api-key-here  # Required for LangGraph
```

**Loading Pattern** (main.py:18-24):
```python
from dotenv import load_dotenv
import os

load_dotenv()

host = os.getenv("HOST", "0.0.0.0")
port = int(os.getenv("PORT", "8000"))
```

#### Running the Servers

**Direct Execution**:
```bash
python main.py
```

**Via uvicorn**:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Using uv**:
```bash
uv run python main.py
```

**Console Script** (after pip install):
```bash
assistant-transport-backend
```

#### Development Tools

**Code Quality Tools** (pyproject.toml):
- **Black** (line 57-59): Code formatting, 100 char line length
- **isort** (line 61-63): Import sorting, black-compatible
- **mypy** (line 65-69): Type checking
- **Ruff** (line 71-77): Fast linting

**Testing** (optional dependencies):
- `pytest>=7.0.0`
- `pytest-asyncio>=0.21.0`

#### LangGraph Configuration

**langgraph.json**:
```json
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./main.py:graph"
  },
  "env": ".env"
}
```

Enables:
- LangGraph Studio visualization
- Cloud deployment
- Graph export/import

## Code References

### Basic Transport Backend

- `python/assistant-transport-backend/main.py:74-79` - FastAPI app initialization
- `python/assistant-transport-backend/main.py:92-147` - POST /assistant endpoint
- `python/assistant-transport-backend/main.py:95-142` - Stream callback with mock responses
- `python/assistant-transport-backend/main.py:145-147` - Stream creation and response
- `python/assistant-transport-backend/main.py:65-70` - Lifespan context manager
- `python/assistant-transport-backend/main.py:81-89` - CORS middleware configuration
- `python/assistant-transport-backend/main.py:150-168` - Server startup with uvicorn
- `python/assistant-transport-backend/pyproject.toml:23-29` - Core dependencies

### LangGraph Backend

- `python/assistant-transport-backend-langgraph/main.py:301-363` - POST /assistant endpoint
- `python/assistant-transport-backend-langgraph/main.py:244-270` - Graph creation and compilation
- `python/assistant-transport-backend-langgraph/main.py:149-178` - Agent node (OpenAI integration)
- `python/assistant-transport-backend-langgraph/main.py:195-239` - Tool executor node
- `python/assistant-transport-backend-langgraph/main.py:181-192` - Router function
- `python/assistant-transport-backend-langgraph/main.py:104-132` - Subagent node
- `python/assistant-transport-backend-langgraph/main.py:135-146` - Subagent graph creation
- `python/assistant-transport-backend-langgraph/main.py:88-100` - Tool definition with @tool decorator
- `python/assistant-transport-backend-langgraph/main.py:340-358` - Streaming with subgraph support
- `python/assistant-transport-backend-langgraph/pyproject.toml:7-18` - Dependencies including LangGraph

### Configuration

- `python/assistant-transport-backend/.env.example` - Environment configuration template
- `python/assistant-transport-backend/setup.py` - Automated setup script
- `python/assistant-transport-backend-langgraph/langgraph.json` - LangGraph configuration

### Test Files

- `python/assistant-transport-backend-langgraph/test_client.py:10-72` - Basic chat test
- `python/assistant-transport-backend-langgraph/test_subgraph.py:10-117` - Subgraph streaming test
- `python/assistant-transport-backend-langgraph/test_subgraph.py:120-168` - Direct tool result test

## Architecture Insights

### 1. Streaming Protocol Design

The examples demonstrate a sophisticated streaming protocol that synchronizes state between backend and frontend:

**State-Based Updates**: Instead of just streaming text tokens, the entire conversation state is streamed. Any mutation to `controller.state` triggers an update event.

**Progressive Tool Calls**: Tool calls can be streamed incrementally with `done: false`, allowing UIs to show in-progress tool executions.

**Artifact Pattern**: Tool messages can include `artifact` field containing structured data (like subgraph state) that's accessible to the frontend but not part of the main conversation.

### 2. Request Command Pattern

The API uses a command-based request structure instead of simple message exchange:

- **AddMessageCommand**: Adds user input to conversation
- **AddToolResultCommand**: Provides tool execution results

This enables:
- Resumable conversations (by passing full state)
- Tool execution outside the backend
- Flexible conversation flows

### 3. LangGraph State Machine Architecture

The LangGraph version demonstrates production-ready patterns:

**Typed State Management**: Uses TypedDict with Annotated types for compile-time validation.

**Conditional Routing**: The `should_call_tools` function makes graph execution dynamic based on LLM responses.

**Subgraph Composition**: Complex tasks can be delegated to specialized subagents with their own state machines.

**Bidirectional Edges**: After tool execution, flow returns to agent node for follow-up responses.

### 4. Graceful Degradation

Both backends include fallback mechanisms:

**Basic Backend**: Works without any API keys, always returns mock data.

**LangGraph Backend**: Detects missing OpenAI key and returns mock responses with warnings.

This enables development and testing without API access.

### 5. Environment-Driven Configuration

All settings are externalized to environment variables:
- No hardcoded URLs, ports, or API keys
- Development-friendly defaults
- Production-ready when properly configured
- `.env.example` provides documentation

### 6. Modern Python Patterns

**Async/Await Throughout**: All I/O operations are async, enabling concurrent request handling.

**Type Hints**: Pydantic models provide runtime validation and static type checking.

**Context Managers**: Lifespan management using `@asynccontextmanager` for clean resource handling.

**Package Structure**: PEP 518-compliant with `pyproject.toml`, supporting modern tooling.

### 7. Progressive Complexity

The examples are designed for learning:

1. **Hello World**: 20-line minimal example
2. **Basic Backend**: 172-line reference implementation with mocks
3. **LangGraph Backend**: 390-line production implementation with real AI

Each level builds on previous patterns while adding new capabilities.

## Related Research

### Frontend Integration

The FastAPI backends are designed to work with the `with-assistant-transport` frontend example:
- Frontend location: `examples/with-assistant-transport/`
- Connects via `useExternalStoreRuntime()` hook
- Endpoint configuration: `http://localhost:8000/assistant`

### Examples Registry

The LangGraph example is registered in the documentation:
- Registry file: `apps/docs/lib/examples.ts:96-99`
- External repository reference: `https://github.com/Yonom/assistant-ui-langgraph-fastapi`
- Screenshot: `apps/docs/public/screenshot/examples/fastapi-langgraph.png`

### Assistant Stream Library

All examples depend on the custom `assistant-stream` library:
- Location: `python/assistant-stream/`
- Key exports: `RunController`, `create_run`, `DataStreamResponse`
- Purpose: Provides the streaming protocol implementation
- Version: `>=0.0.28`

### LangGraph Module

The LangGraph backend uses specialized integration helpers:
- Module: `assistant_stream.modules.langgraph`
- Key functions:
  - `append_langgraph_event()`: Converts LangGraph events to stream format
  - `get_tool_call_subgraph_state()`: Extracts subgraph state from artifacts

## Open Questions

1. **Production Deployment**: How are these backends deployed in production? Docker containers? Cloud functions?

2. **Authentication**: The examples don't include authentication. How should user auth be added?

3. **Rate Limiting**: No rate limiting is implemented. What's the recommended approach?

4. **Persistence**: Conversations aren't persisted. Should this be added to the examples?

5. **Error Handling**: How should LLM API failures be communicated to the frontend?

6. **Monitoring**: What metrics should be tracked in production deployments?

7. **Scaling**: How do these backends handle concurrent users? Are they stateless?
