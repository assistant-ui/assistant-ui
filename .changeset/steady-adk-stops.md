---
"@assistant-ui/react-google-adk": patch
---

Mark unfinished assistant messages as cancelled when an ADK run is stopped, including finalized tool-call and long-running tool messages.

Clear pending long-running tool IDs introduced by the stopped run while retaining unanswered interrupts inherited from earlier turns.
