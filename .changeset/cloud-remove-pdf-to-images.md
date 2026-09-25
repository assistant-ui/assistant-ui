---
"assistant-cloud": patch
---

fix: remove `files.pdfToImages`, which posted to a `/v1/files/pdf-to-images` route the cloud API has never had, so every call answered 404
