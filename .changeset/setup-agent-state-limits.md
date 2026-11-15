---
"setup-agent": patch
---

The setup host caps a setup's state at 512 KiB of JSON. Past that, commands that add content are refused with the new `setup-full` reason, while `checkout/create`, `agent/hello`, heartbeats, `bye`, `checkout/dismiss`, `checkout/cancel` and `checkout/finish` keep working. `agent/ask` refuses a model input without a `redeemKeyHash`; every `setup-agent` since 0.0.7 sends one.
