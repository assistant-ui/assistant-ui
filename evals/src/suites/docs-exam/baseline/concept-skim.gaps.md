# Docs exam findings: concept, skim reader

Run 2026-11-26T12:45:01.773Z on apps/docs/content/docs at a690f33d4; reader sonnet, judge sonnet. 34/38 correct (89%), 4 partly, 0 wrong, docs silent 16, conflicts 0, 2.3 pages/question.

## The reader says the docs conflict

None this run.


## Answers that missed a key point

- [ ] **q07** (persistence, partly): I want users to see their past conversations in a sidebar and come back to them later. What are my options for storing threads, and what do I have to build for each? Missed: Assistant Cloud stores threads and messages for you. Pages read: docs/concepts/threads.md, docs/integrations/persistence/thread-list-adapters.md, docs/integrations/persistence/custom-adapter.md.
- [ ] **q22** (tool-result-from-ui, partly): How can a tool's UI send the user's choice back to the model as the tool's result? Missed: The result goes back to the model: automatically in LocalRuntime; with the AI SDK runtime only when sendAutomaticallyWhen allows it. The reader said the docs don't say. Pages read: docs/tools/tool-ui.md, docs/tools/defining-tools.md, docs/runtimes/ai-sdk/v7.md.
- [ ] **q28** (outside-thread, partly): How do I send a message or start a new thread from a button that lives outside the chat UI? Missed: aui.threads.switchToNewThread() for a new thread. The reader said the docs don't say. Pages read: docs/guides/state-outside-the-thread.md, docs/api-reference/runtimes/thread-list-runtime.md, docs/primitives/thread-list.md.
- [ ] **q36** (platforms, partly): Can I use assistant-ui outside React on the web, such as React Native, Vue or a terminal app? How much carries over? Missed: Runtime/state/concepts carry over (shared core) for the terminal/Ink target; React Native, Ink (terminal) and Vue packages exist (no Ink package is identified for terminal apps). The reader said the docs don't say. Pages read: docs.md, docs/react-native/migration.md, docs/vue.md.
