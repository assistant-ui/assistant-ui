---
"@assistant-ui/react-langgraph": patch
---

fix: carry streamed tool-call `partial_json` onto the full `AIMessage` delivered by LangGraph `updates` events so the converter keeps deriving `argsText` from the streamed text instead of re-stringifying parsed args.