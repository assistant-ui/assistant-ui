---
"@assistant-ui/core": patch
---

fix: keep the server on the title that wins the ordering race

an automatic title generation persists its title server-side through its own run, so an explicit generation that superseded it locally could still be overwritten once the older run finished. the losing run now waits for the winner to persist its title and writes that title back, and a rename that outranks the winning generation is reasserted the same way.
