---
"@assistant-ui/store": patch
---

fix: a client whose resource is gone now ignores actions, warning once per method, while its state, subscriptions and child accessors keep working; it reconnects before descendant effects run when an `<Activity>` shows it again
