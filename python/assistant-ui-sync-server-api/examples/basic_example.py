#!/usr/bin/env python3
"""
Basic example of using the Assistant UI Sync Server API client.
"""

import asyncio
from assistant_ui import AssistantClient
from assistant_ui.types import Message, Tool


async def basic_chat_example():
    """Simple async chat example."""
    print("=== Basic Async Chat Example ===")
    
    # Create client
    client = AssistantClient(
        base_url="http://localhost:3000",
        headers={"Authorization": "Bearer your-api-key"}
    )
    
    messages: list[Message] = [
        {
            "role": "user",
            "content": [{"type": "text", "text": "What is the capital of France?"}],
        }
    ]
    
    try:
        # Get thread client and send chat
        thread = client.threads("thread-123")
        response = await thread.chat(
            messages=messages,
            system="You are a helpful assistant that answers questions concisely."
        )
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await client.close()


def sync_chat_example():
    """Simple synchronous chat example."""
    print("\n=== Sync Chat Example ===")
    
    # Create client using context manager
    with AssistantClient(
        base_url="http://localhost:3000",
        headers={"Authorization": "Bearer your-api-key"}
    ) as client:
        messages: list[Message] = [
            {
                "role": "user",
                "content": [{"type": "text", "text": "Tell me a short joke."}],
            }
        ]
        
        try:
            # Get thread client and send chat
            thread = client.threads("thread-456")
            response = thread.chat_sync(
                messages=messages,
                system="You are a helpful and funny assistant."
            )
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.json()}")
        except Exception as e:
            print(f"Error: {e}")


async def chat_with_tools_example():
    """Example using tools."""
    print("\n=== Chat with Tools Example ===")
    
    # Using async context manager
    async with AssistantClient(base_url="http://localhost:3000") as client:
        tools: dict[str, Tool] = {
            "get_weather": {
                "description": "Get the current weather for a location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "The city and state, e.g., San Francisco, CA"
                        },
                        "unit": {
                            "type": "string",
                            "enum": ["celsius", "fahrenheit"],
                            "description": "The temperature unit"
                        }
                    },
                    "required": ["location"],
                }
            },
            "calculate": {
                "description": "Perform mathematical calculations",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "expression": {
                            "type": "string",
                            "description": "The mathematical expression to evaluate"
                        }
                    },
                    "required": ["expression"],
                }
            }
        }
        
        messages: list[Message] = [
            {
                "role": "user",
                "content": [{"type": "text", "text": "What's the weather in New York?"}],
            }
        ]
        
        try:
            thread = client.threads("thread-789")
            response = await thread.chat(
                messages=messages,
                tools=tools,
                system="You are a helpful weather assistant."
            )
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.json()}")
        except Exception as e:
            print(f"Error: {e}")


async def cancel_example():
    """Example of canceling a thread operation."""
    print("\n=== Cancel Example ===")
    
    async with AssistantClient(base_url="http://localhost:3000") as client:
        thread = client.threads("thread-cancel-demo")
        
        try:
            # Start a chat that might take a long time
            messages: list[Message] = [
                {
                    "role": "user",
                    "content": [{"type": "text", "text": "Tell me a very long story..."}],
                }
            ]
            
            # Start chat in background
            chat_task = asyncio.create_task(thread.chat(messages=messages))
            
            # Wait a bit then cancel
            await asyncio.sleep(0.5)
            print("Canceling operation...")
            cancel_response = await thread.cancel()
            print(f"Cancel response: {cancel_response.status_code}")
            
            # Cancel the chat task
            chat_task.cancel()
            
        except asyncio.CancelledError:
            print("Chat was cancelled")
        except Exception as e:
            print(f"Error: {e}")


async def multimodal_example():
    """Example with images and files."""
    print("\n=== Multimodal Example ===")
    
    # Example with async header function
    async def get_auth_headers():
        # Simulate fetching auth token
        await asyncio.sleep(0.1)
        return {"Authorization": "Bearer dynamic-token"}
    
    client = AssistantClient(
        base_url="http://localhost:3000",
        headers=get_auth_headers
    )
    
    messages: list[Message] = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Can you analyze this image and document?"},
                {"type": "image", "image": "https://example.com/chart.png"},
                {"type": "file", "data": "https://example.com/report.pdf", "mimeType": "application/pdf"}
            ],
        }
    ]
    
    try:
        thread = client.threads("thread-multimodal")
        response = await thread.chat(
            messages=messages,
            system="You are an expert at analyzing visual and document content."
        )
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await client.close()


async def main():
    """Run all examples."""
    await basic_chat_example()
    sync_chat_example()
    await chat_with_tools_example()
    await cancel_example()
    await multimodal_example()


if __name__ == "__main__":
    asyncio.run(main())