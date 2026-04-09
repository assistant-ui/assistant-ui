"""LiveKit voice agent for the assistant-ui with-livekit example.

Uses OpenAI Realtime API for end-to-end STT -> LLM -> TTS.

Run from this directory:

    uv sync
    uv run python agent.py dev
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import openai

# Share the same .env file as the Next.js frontend.
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

# The agents SDK expects LIVEKIT_URL; the frontend uses NEXT_PUBLIC_LIVEKIT_URL.
# Mirror it so users only configure one variable.
if not os.getenv("LIVEKIT_URL") and os.getenv("NEXT_PUBLIC_LIVEKIT_URL"):
    os.environ["LIVEKIT_URL"] = os.environ["NEXT_PUBLIC_LIVEKIT_URL"]


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()

    session = AgentSession(
        llm=openai.realtime.RealtimeModel(voice="alloy"),
    )

    await session.start(
        room=ctx.room,
        agent=Agent(
            instructions=(
                "You are a helpful voice assistant built with assistant-ui "
                "and LiveKit. Keep responses concise and conversational."
            ),
        ),
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
