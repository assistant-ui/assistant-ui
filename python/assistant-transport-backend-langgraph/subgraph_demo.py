#!/usr/bin/env python3
"""
Test client for the LangGraph backend with subgraph support.
"""

import asyncio
import httpx
import json

async def test_subgraph_chat():
    """Test the chat endpoint with task tool and subgraph streaming."""
    url = "http://localhost:8000/assistant"

    payload = {
        "commands": [
            {
                "type": "add-message",
                "message": {
                    "role": "user",
                    "parts": [
                        {
                            "type": "text",
                            "text": "Please help me create a task that writes a haiku about Python programming."
                        }
                    ]
                }
            }
        ],
        "system": "You are a helpful assistant that can delegate complex tasks to subagents using the Task tool.",
        "state": {}
    }

    print("📤 Sending request to", url)
    print(f"📝 Message: {payload['commands'][0]['message']['parts'][0]['text']}")
    print("-" * 50)

    async with httpx.AsyncClient(timeout=30.0) as client:
        async with client.stream(
            "POST",
            url,
            json=payload,
            headers={"Content-Type": "application/json"}
        ) as response:
            print(f"📥 Response status: {response.status_code}")
            print("-" * 50)
            print("📥 Streaming response:")

            buffer = ""
            message_count = 0
            tool_call_count = 0

            async for chunk in response.aiter_bytes():
                chunk_str = chunk.decode('utf-8')
                buffer += chunk_str

                # Parse SSE events
                lines = buffer.split('\n')
                buffer = lines[-1]  # Keep incomplete line in buffer

                for line in lines[:-1]:
                    if line.startswith('data: '):
                        data_str = line[6:]  # Remove 'data: ' prefix
                        if data_str.strip() and data_str.strip() != '[DONE]':
                            try:
                                data = json.loads(data_str)

                                # Log different types of events
                                if data.get("type") == "state-update":
                                    state = data.get("value", {})

                                    # Check for messages
                                    if "messages" in state:
                                        messages = state["messages"]
                                        if len(messages) > message_count:
                                            message_count = len(messages)
                                            last_msg = messages[-1]

                                            # Log AI messages
                                            if last_msg.get("type") == "ai" or last_msg.get("role") == "assistant":
                                                print(f"\n🤖 AI Message:")
                                                if "content" in last_msg:
                                                    print(f"   Content: {last_msg['content']}")
                                                if "tool_calls" in last_msg:
                                                    print(f"   Tool Calls: {last_msg['tool_calls']}")
                                                    tool_call_count = len(last_msg['tool_calls'])

                                            # Log Tool messages (from subgraph)
                                            elif last_msg.get("type") == "tool" or last_msg.get("role") == "tool":
                                                print(f"\n🔧 Tool Message:")
                                                print(f"   Content: {last_msg.get('content', '')}")
                                                if "artifact" in last_msg:
                                                    print(f"   Artifact: {json.dumps(last_msg['artifact'], indent=6)}")

                                    # Check for other state updates
                                    for key in state:
                                        if key not in ["messages", "status"]:
                                            print(f"\n📊 State Update - {key}: {state[key]}")

                                elif data.get("type") == "message-delta":
                                    # Handle streaming message updates
                                    delta = data.get("value", {})
                                    if delta.get("content"):
                                        print(f"   Streaming: {delta['content']}", end="")

                                else:
                                    # Other event types
                                    event_type = data.get("type", "unknown")
                                    if event_type not in ["ping", "status"]:
                                        print(f"\n📡 Event ({event_type}): {data.get('value', '')}")

                            except json.JSONDecodeError as e:
                                if data_str.strip():
                                    print(f"  Parse error: {e}")
                                    print(f"  Raw data: {data_str[:200]}...")

    print("\n" + "-" * 50)
    print(f"✅ Test completed - Processed {message_count} messages, {tool_call_count} tool calls")


async def test_direct_tool_result():
    """Test sending a tool result back to the assistant."""
    url = "http://localhost:8000/assistant"

    # First create a state with a tool call
    initial_state = {
        "messages": [
            {
                "type": "human",
                "content": "Help me with a task"
            },
            {
                "type": "ai",
                "content": "I'll help you with that task.",
                "tool_calls": [
                    {
                        "id": "test_tool_001",
                        "name": "task_tool",
                        "args": {"task_description": "Write a poem"}
                    }
                ]
            }
        ]
    }

    payload = {
        "commands": [
            {
                "type": "add-tool-result",
                "toolCallId": "test_tool_001",
                "result": {"output": "A beautiful poem about coding"}
            }
        ],
        "system": "You are a helpful assistant.",
        "state": initial_state
    }

    print("📤 Testing tool result handling")
    print("-" * 50)

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload)
        print(f"📥 Response status: {response.status_code}")

        # Read the full response for tool result test
        content = response.text
        print(f"📥 Response preview: {content[:500]}...")

    print("✅ Tool result test completed")


if __name__ == "__main__":
    print("🧪 Testing LangGraph Backend with Subgraph Support")
    print("=" * 50)

    # Test 1: Subgraph chat with task tool
    print("\n1. Testing subgraph chat with task delegation...")
    asyncio.run(test_subgraph_chat())

    # Test 2: Direct tool result handling
    print("\n2. Testing direct tool result handling...")
    asyncio.run(test_direct_tool_result())