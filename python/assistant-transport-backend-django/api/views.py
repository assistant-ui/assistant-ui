import asyncio
import random
import os
from typing import Any, Dict
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from pydantic import ValidationError

from assistant_stream import RunController, create_run
from assistant_stream.serialization import DataStreamResponse
from .models import AssistantRequest
from .openai_helper import get_openai_response


@csrf_exempt
@require_http_methods(["POST"])
async def assistant_endpoint(request):
    """
    Main assistant endpoint implementing the assistant-transport protocol.

    Accepts commands and state, returns streaming response with assistant messages.
    """
    try:
        # Parse and validate request body
        import json
        body_bytes = await request.body if hasattr(request.body, '__await__') else request.body
        body = json.loads(body_bytes)
        request_data = AssistantRequest(**body)

    except ValidationError as e:
        return JsonResponse(
            {"error": "Invalid request", "details": e.errors()},
            status=400
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "Invalid JSON"},
            status=400
        )

    # Define callback for stream generation
    async def run_callback(controller: RunController):
        """
        Callback function for the run controller.

        This simulates an AI assistant with static responses and mock tool calls.
        In production, this would integrate with OpenAI or other AI providers.
        """
        try:
            # Simulate processing delay
            print("run_callback")
            await asyncio.sleep(1)

            # Process incoming command
            if request_data.commands:
                if request_data.commands[0].type == "add-message":
                    controller.state["messages"].append(
                        request_data.commands[0].message.model_dump()
                    )
                elif request_data.commands[0].type == "add-tool-result":
                    if controller.state.get("messages") and controller.state["messages"][-1].get("parts"):
                        controller.state["messages"][-1]["parts"][-1]["result"] = (
                            request_data.commands[0].result
                        )

            # Simulate processing
            await asyncio.sleep(1)

            # Check if OpenAI is configured
            openai_key = os.getenv("OPENAI_API_KEY")

            if openai_key:
                # Convert messages to OpenAI format
                openai_messages = []
                for msg in controller.state.get("messages", []):
                    if msg.get("role") == "user":
                        content = " ".join([
                            p.get("text", "")
                            for p in msg.get("parts", [])
                            if p.get("type") == "text"
                        ])
                        openai_messages.append({"role": "user", "content": content})

                # Define a simple weather tool for demo
                tools = [
                    {
                        "type": "function",
                        "function": {
                            "name": "get_weather",
                            "description": "Get the current weather in a location",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "location": {
                                        "type": "string",
                                        "description": "The city and state, e.g. San Francisco, CA"
                                    }
                                },
                                "required": ["location"]
                            }
                        }
                    }
                ]

                # Get OpenAI response with tools
                response = await get_openai_response(openai_messages, tools=tools)

                # Build assistant message parts
                parts = []

                # Add text if present
                if response["content"]:
                    parts.append({"type": "text", "text": response["content"]})

                # Add tool calls if present
                if response["tool_calls"]:
                    for tool_call in response["tool_calls"]:
                        parts.append({
                            "type": "tool-call",
                            "toolCallId": tool_call["id"],
                            "toolName": tool_call["name"],
                            "argsText": tool_call["arguments"],
                            "done": True,
                        })

                # Add to state
                controller.state["messages"].append({
                    "role": "assistant",
                    "parts": parts if parts else [{"type": "text", "text": ""}]
                })
            else:
                # Mock response (existing code)
                controller.state["messages"].append({
                    "role": "assistant",
                    "parts": [{"type": "text", "text": "Hello from Django! (mock response)"}]
                })

                # Add tool call (simulating a weather lookup)
                controller.state["messages"][-1]["parts"].append({
                    "type": "tool-call",
                    "toolCallId": "tool_" + str(random.randint(0, 1000000)),
                    "toolName": "get_weather",
                    "argsText": "",
                    "done": False,
                })

                await asyncio.sleep(1)

                # Stream tool arguments incrementally (simulating streaming JSON)
                controller.state["messages"][-1]["parts"][-1]["argsText"] = '{"location": "SF"'
                await asyncio.sleep(1)
                controller.state["messages"][-1]["parts"][-1]["argsText"] = (
                    controller.state["messages"][-1]["parts"][-1]["argsText"] + "}"
                )
                controller.state["messages"][-1]["parts"][-1]["done"] = True

            # Mark conversation as completed
            controller.state["provider"] = "completed"

        except Exception as e:
            print(f"❌ Error in stream generation: {e}")
            controller.state["provider"] = "error"
            controller.append_text(f"Error: {str(e)}")

    # Create streaming response using assistant-stream
    stream = create_run(run_callback, state=request_data.state)

    # Create DataStreamResponse and get its body_iterator
    data_stream_response = DataStreamResponse(stream)

    return StreamingHttpResponse(
        data_stream_response.body_iterator,
        content_type="text/plain; charset=utf-8",
    )


@require_http_methods(["GET"])
def health_check(request):
    """Health check endpoint."""
    return JsonResponse({
        "status": "healthy",
        "service": "assistant-transport-backend-django",
        "version": "0.1.0"
    })
