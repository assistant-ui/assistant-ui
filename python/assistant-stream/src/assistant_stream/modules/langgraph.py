from typing import Any

from assistant_stream.create_run import RunController
from langchain_core.messages.ai import AIMessageChunk,add_ai_message_chunks


def append_langgraph_event(
    controller: RunController, _namespace: str, type: str, payload: Any
) -> None:
    """
    Append a LangGraph event to the controller state.

    Args:
        controller: The run controller managing the state
        _namespace: Event namespace (currently unused)
        type: Event type ('messages' or 'updates')
        payload: Event payload containing the data to append
    """
    if controller.state is None:
        controller.state = {}

    state = controller.state

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
                if existing_message.get("id") == message_dict["id"]:
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
