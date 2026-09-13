---
"@assistant-ui/react-ag-ui": patch
---

fix(react-ag-ui): fold a reasoning record onto the assistant record that follows it

a `reasoning` record is its own message on the AG-UI wire, so a turn that reasons before answering arrives as two records. `fromAgUiMessages` used to import each one as its own assistant message, which meant a turn that streamed as one bubble with a reasoning part came back after a `MESSAGES_SNAPSHOT` or a history reload as separate bubbles, and a folded assistant message did not survive `toAgUiMessages` followed by `fromAgUiMessages`. the import now inverts the export: the reasoning joins the assistant record that follows it, carrying its wire id on `providerMetadata.agui.reasoningId` so the export re-emits it under the id its `encryptedValue` was issued against. this is the binding the export already wrote and the one `ag-ui-langgraph` reads back. a reasoning record that no assistant record follows has nothing to join and stays a message of its own.
