---
"@assistant-ui/react-langgraph": patch
---

A LangGraph run that fails with an `error` event before streaming any AI output no longer marks the previous turn's finished reply as errored. The error status now goes only to an AI message after the latest human message, so a failing follow-up (a 400 or rate-limit error, for example) leaves the earlier answer as it was.
