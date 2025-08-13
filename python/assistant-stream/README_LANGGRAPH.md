# LangGraph Integration for assistant-stream

This document describes the LangGraph integration for the assistant-stream package.

## Installation

To use the LangGraph integration, install the assistant-stream package with the langgraph extra:

```bash
pip install assistant-stream[langgraph]
```

This will install the required dependencies including `langchain-core`.

## Usage

The main function provided by this integration is `append_langgraph_event`, which allows you to append LangGraph events to the state managed by a RunController.

### Function Signature

```python
def append_langgraph_event(
    controller: Any,
    namespace: str,
    type: str,
    payload: Any
) -> None
```

### Parameters

- **controller**: A RunController instance from LangGraph that contains a `state` attribute
- **namespace**: The namespace for the event (currently not used but required for future compatibility)
- **type**: The type of event, either `"message"` or `"updates"`
- **payload**: The payload for the event, format depends on the event type

### Event Types

#### Message Events (`type="message"`)

For message events, the payload must be a tuple of `(messages, metadata)`:

- **messages**: Can be either a single message or a list of messages (BaseMessage instances from LangChain)
- **metadata**: A dictionary of metadata (currently not used but required)

The function will:

- Create a `messages` array in the state if it doesn't exist
- Convert messages to plain JSON using LangChain's `message_to_dict`
- Merge messages with the same ID:
  - For AIMessageChunk messages, content is appended
  - For other message types, the entire message is replaced
- Append new messages that don't have matching IDs

Example:

```python
from langchain_core.messages import HumanMessage, AIMessage
from assistant_stream import append_langgraph_event

# Single message
message = HumanMessage(content="Hello", id="msg1")
append_langgraph_event(controller, "default", "message", ([message], {}))

# Multiple messages
messages = [
    HumanMessage(content="Hello", id="msg1"),
    AIMessage(content="Hi there!", id="msg2")
]
append_langgraph_event(controller, "default", "message", (messages, {}))
```

#### Updates Events (`type="updates"`)

For updates events, the payload must be a dictionary with the structure:

```python
{
    "node_name": {
        "channel": new_value,
        ...
    },
    ...
}
```

The function will:

- Update channel values for each node
- Create nodes if they don't exist
- Skip updates to the "messages" channel (as these are handled by message events)

Example:

```python
updates = {
    "agent": {
        "status": "thinking",
        "confidence": 0.95
    },
    "retriever": {
        "documents_found": 5
    }
}
append_langgraph_event(controller, "default", "updates", updates)
```

### Important Notes

1. **State Format**: The state must only contain plain JSON objects (lists, dicts, str, int, bool, None). All LangChain messages are automatically converted to JSON format.

2. **Message Merging**: When a message with an existing ID is appended:
   - If both messages are AI messages (type="ai"), the content is concatenated
   - For all other cases, the entire message is replaced

3. **Error Handling**:
   - Raises `ValueError` if the controller doesn't have a `state` attribute
   - Raises `TypeError` if the payload format is invalid
   - Skips `None` messages silently
   - Ignores unknown event types

4. **Thread Safety**: This function modifies the state directly and is not thread-safe. Ensure proper synchronization if using from multiple threads.

## Example Integration

Here's a complete example of using `append_langgraph_event` with a LangGraph RunController:

```python
from assistant_stream import append_langgraph_event
from langchain_core.messages import HumanMessage, AIMessageChunk

class MyRunController:
    def __init__(self):
        self.state = {}

# Initialize controller
controller = MyRunController()

# Add initial message
user_message = HumanMessage(content="What is the weather?", id="user1")
append_langgraph_event(controller, "main", "message", ([user_message], {}))

# Add AI response chunks
ai_chunk1 = AIMessageChunk(content="The weather", id="ai1")
append_langgraph_event(controller, "main", "message", ([ai_chunk1], {}))

ai_chunk2 = AIMessageChunk(content=" is sunny today.", id="ai1")
append_langgraph_event(controller, "main", "message", ([ai_chunk2], {}))

# Update node states
updates = {
    "weather_agent": {
        "status": "completed",
        "temperature": 72
    }
}
append_langgraph_event(controller, "main", "updates", updates)

# Final state
print(controller.state)
# {
#     "messages": [
#         {"type": "human", "content": "What is the weather?", "id": "user1"},
#         {"type": "ai", "content": "The weather is sunny today.", "id": "ai1"}
#     ],
#     "weather_agent": {
#         "status": "completed",
#         "temperature": 72
#     }
# }
```

## Testing

The integration includes comprehensive unit tests. To run them:

```bash
python -m pytest tests/test_langgraph.py
```

The tests cover:

- Message appending and merging
- Updates handling
- Error cases and edge conditions
- Payload validation
- Message normalization
