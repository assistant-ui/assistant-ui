# Render weather as application UI

This stage registers a React renderer for the same `get_weather` tool introduced previously.

The tool names, descriptions, input schemas, executors, and structured results remain unchanged. Only the `get_weather` presentation changes. Explain the boundary:

```text
Model chooses get_weather
  → application executes it
  → structured result streams
  → React renderer controls the interface
```

The model does not generate the card markup. `WeatherCard` maps typed arguments and result fields into deterministic loading, success, and error states. `ToolProvider` registers that renderer around the page, while unmatched tools still use the generic fallback.

Ask the learner to repeat the weather request, connect the visible values to the structured result, and compare the toolkit registration with the preceding stage.
