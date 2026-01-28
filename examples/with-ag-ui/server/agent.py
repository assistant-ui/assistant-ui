"""
Simple AG-UI Protocol Agent for testing assistant-ui integration.

Usage:
    pip install fastapi uvicorn openai python-dotenv
    python server/agent.py

Set OPENAI_API_KEY in .env.local or environment.
"""

import asyncio
import json
import os
import uuid
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# Load environment variables from .env.local
load_dotenv(".env.local")
load_dotenv(".env")

app = FastAPI(title="AG-UI Example Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def create_event(event_type: str, **kwargs) -> str:
    """Create an SSE event in AG-UI format."""
    data = {"type": event_type, **kwargs}
    return f"data: {json.dumps(data)}\n\n"


async def echo_agent(messages: list, run_id: str, thread_id: str) -> AsyncGenerator[str, None]:
    """Simple echo agent that responds to user messages."""
    yield create_event("RUN_STARTED", runId=run_id, threadId=thread_id)

    # Get the last user message
    last_message = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            content = msg.get("content", "")
            if isinstance(content, str):
                last_message = content
            elif isinstance(content, list):
                for part in content:
                    if part.get("type") == "text":
                        last_message = part.get("text", "")
                        break
            break

    message_id = str(uuid.uuid4())
    yield create_event("TEXT_MESSAGE_START", messageId=message_id)

    # Generate response
    response = f"You said: {last_message}\n\nThis is a simple echo agent. To use a real LLM, set OPENAI_API_KEY in your environment."

    # Stream the response character by character for demo
    for char in response:
        yield create_event("TEXT_MESSAGE_CONTENT", messageId=message_id, delta=char)
        await asyncio.sleep(0.01)

    yield create_event("TEXT_MESSAGE_END", messageId=message_id)
    yield create_event("RUN_FINISHED", runId=run_id, threadId=thread_id)


async def openai_agent(messages: list, run_id: str, thread_id: str) -> AsyncGenerator[str, None]:
    """OpenAI-powered agent with streaming."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI()

    yield create_event("RUN_STARTED", runId=run_id, threadId=thread_id)

    # Convert AG-UI messages to OpenAI format
    openai_messages = []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")

        if isinstance(content, list):
            # Handle multimodal content
            text_parts = [p.get("text", "") for p in content if p.get("type") == "text"]
            content = " ".join(text_parts)

        if role in ("user", "assistant", "system"):
            openai_messages.append({"role": role, "content": content})

    if not openai_messages:
        openai_messages = [{"role": "user", "content": "Hello"}]

    message_id = str(uuid.uuid4())
    yield create_event("TEXT_MESSAGE_START", messageId=message_id)

    try:
        stream = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=openai_messages,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                delta = chunk.choices[0].delta.content
                yield create_event("TEXT_MESSAGE_CONTENT", messageId=message_id, delta=delta)

        yield create_event("TEXT_MESSAGE_END", messageId=message_id)
        yield create_event("RUN_FINISHED", runId=run_id, threadId=thread_id)

    except Exception as e:
        yield create_event("TEXT_MESSAGE_CONTENT", messageId=message_id, delta=f"Error: {e}")
        yield create_event("TEXT_MESSAGE_END", messageId=message_id)
        yield create_event("RUN_ERROR", message=str(e), threadId=thread_id)


@app.post("/agent")
async def agent_endpoint(request: Request):
    """AG-UI agent endpoint."""
    body = await request.json()

    run_id = body.get("runId", str(uuid.uuid4()))
    messages = body.get("messages", [])
    thread_id = body.get("threadId", "default")

    print(f"[agent] threadId={thread_id}, runId={run_id}, messages={len(messages)}")

    # Choose agent based on API key availability
    if os.getenv("OPENAI_API_KEY"):
        generator = openai_agent(messages, run_id, thread_id)
    else:
        generator = echo_agent(messages, run_id, thread_id)

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "openai_configured": bool(os.getenv("OPENAI_API_KEY"))}


if __name__ == "__main__":
    import uvicorn

    print("Starting AG-UI Agent on http://localhost:8000")
    print(f"OpenAI API Key: {'configured' if os.getenv('OPENAI_API_KEY') else 'not set (using echo mode)'}")
    print("\nEndpoints:")
    print("  POST /agent  - AG-UI agent endpoint")
    print("  GET  /health - Health check")

    uvicorn.run(app, host="0.0.0.0", port=8000)
