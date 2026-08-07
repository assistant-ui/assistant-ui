---
"assistant-stream": patch
---

fix: carry a reasoning summary on the data stream. a reasoning part opened with `unstable_summary` previously lost it on that wire, and a summary-only part produced no frames at all, so it never reached the client. the encoder now emits a reasoning part-start frame when there is a summary to carry; a stream that does not use the field is unchanged, and one that does requires a decoder that understands the frame.
