---
"assistant-cloud": patch
---

Keep the settled answer in Assistant Cloud history when the early store of a running reply fails while the run settles. The settled write now creates the row with its own content when that store failed, and writes over the row when it succeeded without a run lease.
