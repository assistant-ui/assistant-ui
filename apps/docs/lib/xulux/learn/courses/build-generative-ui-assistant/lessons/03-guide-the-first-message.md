# Guide the first message

This stage gives the empty conversation a focused welcome and a small set of Ideas, Code, and Write suggestions. They deliberately exercise ordinary text responses; tools begin in the next stage.

Explain that the copied `Thread` is application-owned UI. assistant-ui primitives supply behavior, while the application controls the welcome copy, suggestion labels, prompts, layout, and styling.

Each suggestion submits a normal user message through the active thread. It does not create a separate request path. After the first message, the thread is no longer empty and the welcome suggestions disappear.

Ask the learner to predict the prompt behind one suggestion, select it, and confirm that it behaves like a message typed in the composer. Keep this lesson about static empty-state guidance; tools begin in the next stage.
