# Revise and branch a conversation

## Goal

Finish the assistant with message editing and branch navigation. The learner can
correct an earlier user message, resend from that point, and move between the
resulting branches without losing unrelated history.

## Agent instructions

Read `guides/editing`, `guides/branching`, and `primitives/branch-picker`.
Inspect the current message component and use its documented edit and branch
primitives. Add an edit action to user messages, preserve the composer’s
existing send/cancel behavior, and expose branch navigation where the runtime
has multiple alternatives. Do not implement a parallel message tree or mutate
the runtime’s internal state directly.

Explain the resulting conversation graph: an edit creates a new continuation
from the selected message, while branch navigation changes which continuation
is displayed. Keep the persisted thread-list adapter compatible with the new
message shape.

## Verify

Edit an earlier message, send the revised version, and navigate between the old
and new branches. Reload and confirm the selected thread still loads. Run the
project typecheck or build, show the final diff, and summarize the eight-step
path before offering the local certificate tool.
