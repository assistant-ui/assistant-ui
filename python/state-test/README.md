# State Management Test

This is a test project for the `assistant-stream` state management functionality. It demonstrates various state operations and updates over time.

## Features

- **Simple State Test**: Basic state updates with primitive values
- **Complex Test**: Nested state updates with objects and arrays
- **String Operations**: String concatenation and method testing
- **List Operations**: List manipulation with append, extend, and other operations
- **Dictionary Operations**: Dictionary manipulation with various methods

## Setup

1. Install the requirements:
   ```
   pip install -r requirements.txt
   ```

2. Run the server:
   ```
   python server.py
   ```

3. Open your browser to [http://localhost:8000](http://localhost:8000)

4. Click on the different test buttons to see state updates in action

## Implementation Details

This test server demonstrates the following state management features:

- Primitive values (strings, numbers, booleans)
- Nested state objects
- String operations (concatenation, methods)
- List operations (append, extend, indexing)
- Dictionary operations (get, setdefault, keys/values)

Each test endpoint updates state over time with various operations to showcase the functionality of the `StateProxy` and `StateManager` classes.
