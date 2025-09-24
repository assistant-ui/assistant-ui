from typing import Any, Dict, List, Union, Tuple, Callable, Optional

from assistant_stream.create_run import RunController
from langchain_core.messages.ai import AIMessageChunk, add_ai_message_chunks
from langchain_core.messages.tool import ToolMessage


def append_langgraph_event(
    state: Dict[str, Any], _namespace: str, type: str, payload: Any
) -> None:
    """
    Append a LangGraph event to the state object.

    Args:
        state: The state dictionary to update
        _namespace: Event namespace (currently unused)
        type: Event type ('messages' or 'updates')
        payload: Event payload containing the data to append
    """

    if type == "messages":
        if "messages" not in state:
            state["messages"] = []

        message = payload[0]
        message_dict = message.model_dump()

        # Check if this is an AIMessageChunk
        is_ai_message_chunk = message_dict.get("type") == "AIMessageChunk" 
        if is_ai_message_chunk:
            message_dict["type"] = "ai"
        existing_message_index = None
        if "id" in message_dict:
            for i, existing_message in enumerate(state["messages"]):
                if existing_message.get("id") == message_dict["id"] or \
                  "tool_call_id" in existing_message and \
                  "tool_call_id" in message_dict and \
                  existing_message["tool_call_id"] == message_dict["tool_call_id"]:
                    existing_message_index = i
                    break

        if existing_message_index is not None:
            if is_ai_message_chunk:
                existing_message = state["messages"][
                    existing_message_index
                ]._get_value()
                new_message_dict = add_ai_message_chunks(
                    AIMessageChunk(**{**existing_message, "type": "AIMessageChunk"}),
                    AIMessageChunk(**{**message_dict, "type": "AIMessageChunk"}),
                ).model_dump()
                new_message_dict["type"] = "ai"
                state["messages"][existing_message_index] = new_message_dict

            else:
                state["messages"][existing_message_index] = message_dict
        else:
            state["messages"].append(message_dict)

    elif type == "updates":
        for _node_name, channels in payload.items():
            if not isinstance(channels, dict):
                continue
            for channel_name, channel_value in channels.items():
                if channel_name == "messages":
                    continue
                    # if "messages" in state:
                    #     continue
                    # state["messages"] = [c.model_dump() for c in channel_value]

                state[channel_name] = channel_value


def get_tool_call_subgraph_state(
    controller: RunController,
    namespace: Tuple[str, ...],
    subgraph_node: Union[str, List[str], Callable[[List[str]], bool]],
    default_state: Dict[str, Any],
    *,
    artifact_field_name: Optional[str] = None,
    tool_name: Union[str, List[str]] | None = None,
) -> Dict[str, Any]:
    """
    Get the state for a tool call subgraph by traversing the namespace and checking for subgraph nodes.
    Ensures there's a ToolMessage as the last message and returns its artifact field value.

    Args:
        controller: The run controller managing the state
        subgraph_node: Node name(s) to check against, or a function that checks node names
        namespace: Tuple of strings in format 'node_name:task_id'
        artifact_field_name: Optional field name to extract from artifact
        default_state: Default state to use if artifact field is None

    Returns:
        The artifact field value from the ToolMessage. If the last message is already a ToolMessage,
        returns its artifact field. If it's an AI message with tool calls, creates a ToolMessage
        and returns the appropriate artifact field value.
    """
    # Helper function to check if a node is a subgraph node
    def is_subgraph_node(node_name: str) -> bool:
        if isinstance(subgraph_node, str):
            return node_name == subgraph_node
        elif isinstance(subgraph_node, list):
            return node_name in subgraph_node
        elif callable(subgraph_node):
            return subgraph_node([node_name])
        return False

    def is_subgraph_tool(tool: str) -> bool:
        if isinstance(tool_name, str):
            return tool == tool_name
        elif isinstance(tool_name, list):
            return tool in tool_name
        return True

    # Start with the controller's state
    if controller.state is None:
        controller.state = default_state
    current_state = controller.state

    # Traverse each level of the namespace
    for namespace_part in namespace:
        # Split the namespace part to get node_name
        node_name = namespace_part.split(':')[0]

        # Check if this node is a subgraph node
        if is_subgraph_node(node_name):
            # Check for messages in the current state
            if "messages" not in current_state:
                return current_state

            messages = current_state["messages"]
            if not messages or len(messages) == 0:
                return current_state

            # Get the last message
            last_message = messages[-1]

            # Check if it's an AI message
            if last_message["type"] == "ai":
                # Check if the AI message has tool calls
                tool_calls = last_message.get("tool_calls", [])
                if not tool_calls:
                    # No tool calls, return current state
                    return current_state

                # Get the last tool call
                last_tool_call = tool_calls[-1]
                if not is_subgraph_tool(last_tool_call["name"]):
                    return current_state


                # Create a new tool message for this tool call
                tool_message = ToolMessage(
                    tool_call_id=last_tool_call["id"],
                    name=last_tool_call["name"],
                    artifact={} if artifact_field_name else default_state,
                    content="",
                    additional_kwargs={
                        "streaming": True
                    }
                ).model_dump()

                messages.append(tool_message)
                last_message = tool_message

            # Check if last message is already a ToolMessage
            if last_message["type"] == "tool":
                # Last message is already a ToolMessage, extract and return artifact field
                if "artifact" not in last_message:
                    last_message["artifact"] = {} if artifact_field_name else default_state
                artifact = last_message["artifact"]

                if artifact_field_name:
                    if artifact_field_name not in artifact:
                        artifact[artifact_field_name] = default_state
                    return artifact[artifact_field_name]
                else:
                    return artifact

    return current_state
