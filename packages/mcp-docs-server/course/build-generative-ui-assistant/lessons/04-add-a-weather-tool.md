# Add weather tools

## Goal

Add structured tools to the existing assistant without hiding the tool lifecycle
from the learner. The model can geocode a place and retrieve current weather;
the application can show a generic fallback while a tool is running or when no
custom renderer exists.

## Agent instructions

Read `tools/defining-tools` and `ui/tool-fallback`. Inspect the existing route
and thread before editing. Define validated schemas for `geocode_location` and
`get_weather` in an application toolkit. Call the Open-Meteo APIs from the
server route, handle non-OK responses, and keep API keys out of the browser.
Add the required `next.config.ts` image or remote-data configuration only when
the chosen UI needs it.

Wire the toolkit into the runtime’s supported tool path and add an explicit
tool fallback to the message content. Preserve the empty-state suggestions and
the deterministic no-key path where practical. Explain the difference between
tool input, tool output, and the rendered fallback.

## Verify

With network access, request the weather for San Francisco and inspect the
structured result. Without network access or a model key, exercise the local
fallback and report that limitation. Run the app and the project typecheck or
build; do not claim live weather was verified if the request was unavailable.
