# Share an editable notepad

This stage adds a thread-scoped notepad that both the learner and assistant can edit.

Contrast it with the weather card: weather renders a completed tool result, while the notepad represents shared state. The toolkit defines the note’s title and content, the notepad component renders editable controls, and assistant-ui supplies an update capability for the active note.

The runtime enables interactables, and the route includes current interactable state in later model requests. This lets the assistant see a learner’s manual edits before revising the same note.

Ask the learner to create a note from the Create note suggestion, edit it directly, and ask the assistant to revise it. Keep version restoration as optional exploration rather than a required concept. Mention that the interactables API is currently unstable and the project pins a tested assistant-ui version.
