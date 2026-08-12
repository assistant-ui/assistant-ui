# Share an editable notepad

## Goal

Add shared, editable state to the conversation. The assistant can create a note,
the learner can edit it in place, and a later request receives the latest note
state.

## Agent instructions

Read `tools/interactables`, `tools/backend`, and `with-interactables`. Confirm
the installed assistant-ui version before using the interactable API. Define a
typed note with `title` and `content`, add a `create_note` tool, and render it
with an application-owned editable `Notepad` component. Keep title and body
edits synchronized through the tool’s state setter; do not mirror the state in
an unrelated React store.

Keep the weather card working. Explain the difference between a completed tool
result and a live interactable state, and explain how the server receives the
current state on the next request. If the API is marked unstable by the
installed version, state that constraint rather than silently upgrading it.

## Verify

Create a note, edit its title and body, then ask the assistant to revise it.
Without a model key, verify the component’s local editing behavior and report
that model-selected creation or revision was not tested. Run the project’s
typecheck or build.
