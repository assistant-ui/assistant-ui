---
"@assistant-ui/core": patch
---

fix: safely normalize nested message data loaded from local storage

Local-storage history no longer crashes on structurally invalid persisted
content such as `content: [null]` or `attachments: [null]`. Unreadable parts
and attachments are dropped individually instead of discarding the whole
message and its descendants.

The following recovery behavior applies in memory when a stored thread is
loaded:

- an assistant message with a missing or unusable `status` loads as
  `complete/unknown` instead of being discarded
- a system message keeps its first valid text part, or a valid non-text part
  when no text can be recovered, so descendants remain available
- malformed attachments and known assistant-only parts found on a user
  message are removed while the message itself is kept
- assistant images outside the supported `data:image/*`, `https:`, and `blob:`
  schemes are removed, and legacy `data-*` parts are normalized to `data`
  parts
- parts whose `type` this version does not recognize are preserved so a newer
  version's storage is not erased
- tool-call `modelContent` is rebuilt from its valid text and file entries
- non-record assistant step entries are removed while legacy record-shaped
  steps and partial timing metadata remain compatible
- valid voice modality metadata remains intact

Saving a later message preserves existing raw records and only writes the new
or replaced item, so recovery does not silently rewrite earlier history.
Malformed, orphaned, and duplicate records are retained rather than silently
pruned on append.
