# Shopping cart MCP server (Python)

This example shows how to thread state across conversation turns by pairing `_meta["widgetSessionId"]` with `window.openai.widgetState`. The Python server ships a simple `add_to_cart` tool as an example, plus a widget that stays in sync even when the user adjusts quantities in the UI between turns.

## Installation

Use the same dependencies as the other FastMCP Python examples:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r shopping_cart_python/requirements.txt
```

## Run the server

In one shell, serve the static assets from the repo root:

```bash
pnpm run serve
```

In another shell, start the shopping-cart MCP server (from the repo root):

```bash
python shopping_cart_python/main.py
# or
python -m uvicorn shopping_cart_python.main:app --host 0.0.0.0 --port 8000
```

The server exposes `GET /mcp` for SSE and `POST /mcp/messages?sessionId=...` for follow-up messages, mirroring the other FastMCP examples.

## How the state flow works

- Every `call_tool` response sets `_meta["widgetSessionId"]` to the cart identifier and returns a `structuredContent` payload containing the new cart items.
- The widget reads `window.openai.widgetState`, merges in the latest `toolOutput.items`, and writes the combined snapshot back to `window.openai.widgetState`. UI interactions (increment/decrement) also update that shared state so the next turn sees the changes.
- Because the host keeps `widgetState` keyed by `widgetSessionId`, subsequent tool calls for the same session automatically receive the prior cart state, letting the model and UI stay aligned without extra plumbing.

## Recommended production pattern

This demo leans on `window.openai.widgetState` to illustrate the mechanics. In production, keep the cart in your MCP server (or a backing datastore) instead of relying on client-side state:

- On each `add_to_cart` (or similar) tool call, load the cart from your datastore using the session/cart ID, apply the incoming items, persist the new snapshot, and return it along with `_meta["widgetSessionId"]`.
- From the widget, treat the datastore as the source of truth: every UX interaction (like incrementing quantities) should invoke your backend—either via another MCP tool call or a direct HTTP request—to mutate and re-read the cart.
- Continue setting `_meta["widgetSessionId"]` so the host and widget stay locked to the same cart across turns, while the datastore ensures durability and multi-device correctness.

A lightweight in-memory store works for local testing; swap in a persistent datastore when you move beyond the demo.

## Example demo flow

- Ask "Add 2 eggs to my cart" => you will be prompted to add the eggs to the cart, and this will be the initial cart state
- Say "Now add milk" => the milk will be added to the existing cart
- Add 2 avocados from the UI => the widget state will change
- Say "Now add 3 tomatoes" => the tomatoes will be added to the existing cart

You should have the following cart state:

- N eggs
- 1 milk
- 2 avocados
- 3 tomatoes
