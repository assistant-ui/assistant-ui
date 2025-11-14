"""
Optional OpenAI integration for real AI responses.
Falls back to mock responses if OPENAI_API_KEY is not set.
"""
import os
from typing import Optional


def get_openai_client():
    """Get OpenAI client if API key is configured."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        from openai import AsyncOpenAI
        return AsyncOpenAI(api_key=api_key)
    except ImportError:
        print("⚠️  OpenAI package not installed. Install with: pip install openai")
        return None


async def get_openai_response(messages: list, model: Optional[str] = None, tools: Optional[list] = None):
    """
    Get response from OpenAI API with optional tool calling.

    Args:
        messages: List of message dicts with 'role' and 'content'
        model: OpenAI model to use (default from env or gpt-4o-mini)
        tools: Optional list of tool definitions for function calling

    Returns:
        Dict with 'content' (text) and optional 'tool_calls' list
    """
    client = get_openai_client()
    if not client:
        return {"content": "Hello from Django! (OpenAI not configured - set OPENAI_API_KEY to enable)", "tool_calls": None}

    model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    try:
        kwargs = {
            "model": model,
            "messages": messages,
            "temperature": 0.7,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        response = await client.chat.completions.create(**kwargs)
        message = response.choices[0].message

        result = {
            "content": message.content or "",
            "tool_calls": None
        }

        # Extract tool calls if present
        if hasattr(message, 'tool_calls') and message.tool_calls:
            result["tool_calls"] = [
                {
                    "id": tc.id,
                    "name": tc.function.name,
                    "arguments": tc.function.arguments
                }
                for tc in message.tool_calls
            ]

        return result
    except Exception as e:
        print(f"⚠️  OpenAI API error: {e}")
        return {"content": f"Error calling OpenAI: {str(e)}", "tool_calls": None}
