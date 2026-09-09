# State Management Test

This is a test project for the `assistant-stream` state management functionality. It demonstrates various state operations and updates over time.

## Features

- **Simple State Test**: Basic state updates with primitive values
- **Complex Test**: Nested state updates with objects and arrays
- **String Operations**: String concatenation and method testing
- **List Operations**: List manipulation with append, extend, and other operations
- **Dictionary Operations**: Dictionary manipulation with various methods

## Setup

1. Install dependencies:

   ```
   uv sync
   ```

2. Run the server:

   ```
   uv run python server.py
   ```

3. Exercise the endpoints. The server has no page of its own; it exposes five `POST` routes. Either open the interactive API docs FastAPI serves at [http://localhost:8000/docs](http://localhost:8000/docs) and run a route from there, or call one directly:

   ```
   curl -N -X POST http://localhost:8000/simple-test
   curl -N -X POST http://localhost:8000/complex-test
   curl -N -X POST http://localhost:8000/string-test
   curl -N -X POST http://localhost:8000/list-test
   curl -N -X POST http://localhost:8000/dict-test
   ```

   `-N` keeps curl from buffering, so the state operations appear as the server emits them. `string-test`, `list-test`, and `dict-test` sleep between steps and take several seconds to finish.

Each response streams the state operations as `aui-state:` lines, one batch per flush:

```
aui-state:[{"type": "set", "path": ["message"], "value": "Hello"}]
aui-state:[{"type": "append-text", "path": ["message"], "value": " world"}]
aui-state:[{"type": "append-text", "path": ["message"], "value": "!"}]
aui-state:[{"type": "set", "path": ["uppercase"], "value": "HELLO WORLD!"}]
```

Applying them in order reconstructs the state the run built up.

## Implementation Details

This test server demonstrates the following state management features:

- Primitive values (strings, numbers, booleans)
- Nested state objects
- String operations (concatenation, methods)
- List operations (append, extend, indexing)
- Dictionary operations (get, setdefault, keys/values)

Each test endpoint updates state over time with various operations to showcase the functionality of the `StateProxy` and `StateManager` classes.
