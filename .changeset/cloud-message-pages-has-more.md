---
"assistant-cloud": patch
"@assistant-ui/core": patch
---

fix(cloud): loading a thread follows `has_more` from the message list, so a page that ends before its limit no longer ends the thread early
