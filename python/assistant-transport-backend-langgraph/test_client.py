#!/usr/bin/env python3
"""
Test client for the LangGraph backend.
"""

import asyncio
import httpx
import json

async def test_chat():
    """Test the chat endpoint with streaming."""
    url = "http://localhost:8001/api/chat"

    payload = {
        "commands": [
            {
                "type": "add-message",
                "message": {
                    "role": "user",
                    "parts": [
                        {
                            "type": "text",
                            "text": "Hello! Can you tell me a short joke?"
                        }
                    ]
                }
            }
        ],
        "system": "You are a helpful assistant.",
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
            print(f"📥 Response headers: {dict(response.headers)}")
            print("-" * 50)
            print("📥 Streaming response:")

            buffer = ""
            async for chunk in response.aiter_bytes():
                chunk_str = chunk.decode('utf-8')
                buffer += chunk_str

                # Parse SSE events
                lines = buffer.split('\n')
                buffer = lines[-1]  # Keep incomplete line in buffer

                for line in lines[:-1]:
                    if line.startswith('data: '):
                        data_str = line[6:]  # Remove 'data: ' prefix
                        if data_str.strip():
                            try:
                                data = json.loads(data_str)
                                if data.get("type") == "state-update":
                                    print(f"  State update: {json.dumps(data.get('value', {}), indent=2)}")
                                else:
                                    print(f"  Event: {data.get('type', 'unknown')}")
                            except json.JSONDecodeError:
                                print(f"  Raw: {data_str[:100]}...")

    print("-" * 50)
    print("✅ Test completed")

async def test_health():
    """Test the health endpoint."""
    url = "http://localhost:8001/health"

    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        print(f"Health check: {response.status_code}")
        print(f"Response: {response.json()}")

if __name__ == "__main__":
    print("🧪 Testing LangGraph Backend")
    print("=" * 50)

    # Test health check
    print("\n1. Testing health endpoint...")
    asyncio.run(test_health())

    # Test chat
    print("\n2. Testing chat endpoint...")
    asyncio.run(test_chat())