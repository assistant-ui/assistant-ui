---
"@assistant-ui/react-ai-sdk": patch
---

feat: add `injectInteractableContext` for AI SDK route handlers

When using AI SDK's `convertToModelMessages`, call `injectInteractableContext(messages)` first so the model can read current interactable state:

```diff
import { convertToModelMessages } from "ai";
+import { injectInteractableContext } from "@assistant-ui/react-ai-sdk";

- messages: await convertToModelMessages(messages),
+ messages: await convertToModelMessages(injectInteractableContext(messages)),
```

Existing interactables apps using AI SDK need this call after upgrading.
