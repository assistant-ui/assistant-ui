from assistant_stream import create_run, RunController
from assistant_stream.serialization import DataStreamResponse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import asyncio

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])


@app.post("/api/chat/completions")
async def chat_completions():
    async def run(controller: RunController):
        controller.append_text("Hello ")
        await asyncio.sleep(1)
        controller.append_text("world.")

    return DataStreamResponse(create_run(run))
