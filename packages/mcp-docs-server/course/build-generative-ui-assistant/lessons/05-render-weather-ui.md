# Render weather as application UI

## Goal

Replace the generic rendering of `get_weather` with an application-owned weather
card while leaving other structured tools on the generic fallback.

## Agent instructions

Read `tools/generative-ui`, `tools/tool-ui`, and `with-generative-ui`. Inspect
the actual weather result shape from step 4 before creating the component. Add a
client `WeatherCard` that handles loading, error, and completed states and
renders the city, temperature, condition, feels-like value, and wind speed.
Register the renderer on `get_weather` only. Keep `geocode_location` on the
fallback so the learner can see per-tool renderer selection.

Mount any required tool provider in the page and keep runtime ownership clear:
the toolkit describes the tool, the renderer presents its result, and the
thread owns the message layout. Do not replace the generic fallback globally.

## Verify

Run a weather request with a model key when available and inspect the card’s
loading and completed states. Request geocoding alone and confirm it remains a
generic structured result. Run the project typecheck or build and explain the
changed registration and component diff.
