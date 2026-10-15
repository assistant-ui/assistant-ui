---
"generative-frame": patch
---

fix: a spec state write through an array records that array's path, so replaying it after the model state drops the array, through `seed` or restored interactions, recreates the array instead of collapsing appends into a `-` object key.
