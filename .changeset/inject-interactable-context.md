---
"@assistant-ui/react-ai-sdk": patch
---

feat: add `injectInteractableContext` to show interactable state to the model

Interactable state now reaches the model through a per-message snapshot instead of the system prompt. Because `convertToModelMessages` ignores message metadata, your route handler must call `injectInteractableContext` for the model to read interactable state:

```diff
- import { convertToModelMessages } from "ai";
+ import { convertToModelMessages } from "ai";
+ import { injectInteractableContext } from "@assistant-ui/react-ai-sdk";

- messages: await convertToModelMessages(messages),
+ messages: await convertToModelMessages(injectInteractableContext(messages)),
```

Existing interactables apps that relied on automatic system-prompt injection must add this call. Otherwise the model can still call `update_*` tools but is blind to current state.

The default snapshot wording is `[Current state of "note" (id: "n1"): {...}]`. The instance id is included because the `update_{name}` tool addresses instances by `id`. If you pass a custom `format`, keep the id visible.
