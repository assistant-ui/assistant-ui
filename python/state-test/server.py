from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from assistant_stream import create_run, RunController
from assistant_stream.serialization import DataStreamResponse

import asyncio

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/simple-test")
async def simple_test():
    async def run(controller: RunController):
        # Check that state is initially None
        assert controller.state is None, "Initial state should be None"
        
        # Initialize state with a direct assignment
        controller.state = {
            "counter": 0,
            "message": "Starting simple test"
        }

        # Update state over time
        for i in range(1, 6):
            controller.state["counter"] = i
            controller.state["message"] = f"Counter updated to {i}"

        # Add a boolean and number
        controller.state["completed"] = True
        controller.state["total"] = 5.5
        
        # Demonstrate setting root state again
        controller.state = {
            "final": True,
            "summary": "Test completed successfully"
        }

        controller.append_text("hi")

    return DataStreamResponse(create_run(run))


@app.post("/complex-test")
async def complex_test():
    async def run(controller: RunController):
        # Demonstrate that state starts as None
        print(f"Initial state: {controller.state}")
        
        # Initialize nested state directly
        controller.state = {
            "user": {
                "name": "John",
                "preferences": {
                    "theme": "dark",
                    "notifications": True
                }
            },
            "messages": []
        }
        
        # Add messages
        controller.state["messages"].append("Hello")
        controller.state["messages"].append("World")
        
        # Set state back to None to demonstrate nullifying
        controller.state = {}
        controller.state["user"] = {
            "name": "Test User",
            "settings": {"theme": "light", "notifications": True},
        }
        controller.state["stats"] = {"visits": 0, "actions": []}

        # Update nested state
        for i in range(1, 6):
            await asyncio.sleep(0.01)
            controller.state["stats"]["visits"] = i
            controller.state["stats"]["actions"].append(f"action_{i}")

            # Toggle theme every other iteration
            if i % 2 == 0:
                controller.state["user"]["settings"]["theme"] = "dark"
            else:
                controller.state["user"]["settings"]["theme"] = "light"

        # Final update
        await asyncio.sleep(0.01)
        controller.state["completed"] = True

    return DataStreamResponse(create_run(run))


@app.post("/string-test")
async def string_test():
    async def run(controller: RunController):
        # Initialize string
        controller.state["message"] = "Hello"

        # Append to string using +=
        await asyncio.sleep(1)
        controller.state["message"] += " world"

        # Append more text
        await asyncio.sleep(1)
        controller.state["message"] += "!"

        # String methods (these should work through the proxy)
        await asyncio.sleep(1)
        controller.state["uppercase"] = controller.state["message"].upper()

        await asyncio.sleep(1)
        controller.state["contains_world"] = "world" in controller.state["message"]

        await asyncio.sleep(1)
        controller.state["length"] = len(controller.state["message"])

    return DataStreamResponse(create_run(run))


@app.post("/list-test")
async def list_test():
    async def run(controller: RunController):
        # Initialize list
        controller.state["items"] = []

        # Append items one by one
        for i in range(5):
            await asyncio.sleep(1)
            controller.state["items"].append(f"item_{i}")

        # Extend list with multiple items
        await asyncio.sleep(1)
        controller.state["items"] += ["batch_1", "batch_2"]

        # Access by index
        await asyncio.sleep(1)
        controller.state["first_item"] = controller.state["items"][0]

        # Get length
        await asyncio.sleep(1)
        controller.state["count"] = len(controller.state["items"])

        # Check membership
        await asyncio.sleep(1)
        controller.state["contains_batch"] = "batch_1" in controller.state["items"]

        # Clear the list
        await asyncio.sleep(1)
        controller.state["items"].clear()

    return DataStreamResponse(create_run(run))


@app.post("/dict-test")
async def dict_test():
    async def run(controller: RunController):
        # Initialize dictionary
        controller.state["config"] = {}

        # Add items one by one
        await asyncio.sleep(1)
        controller.state["config"]["theme"] = "light"

        await asyncio.sleep(1)
        controller.state["config"]["language"] = "en"

        # Set default value
        await asyncio.sleep(1)
        controller.state["config"].setdefault("notifications", True)

        # Try to set default for existing key (should not change)
        await asyncio.sleep(1)
        controller.state["config"].setdefault("theme", "dark")
        controller.state["theme_unchanged"] = (
            controller.state["config"]["theme"] == "light"
        )

        # Get with default
        await asyncio.sleep(1)
        controller.state["missing_with_default"] = controller.state["config"].get(
            "missing", "default_value"
        )

        # Keys, values, items
        await asyncio.sleep(1)
        controller.state["all_keys"] = list(controller.state["config"].keys())
        controller.state["all_values"] = list(controller.state["config"].values())

        # Clear the dictionary
        await asyncio.sleep(1)
        controller.state["config"].clear()

    return DataStreamResponse(create_run(run))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
