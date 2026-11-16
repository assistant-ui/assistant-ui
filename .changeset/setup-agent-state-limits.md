---
"setup-agent": patch
---

The setup host stops taking content once a setup's state passes 512 KiB of JSON (the command that crosses it still lands). Past that, commands that add content are refused with the new `setup-full` reason, while `checkout/create`, `agent/hello`, heartbeats, `bye`, `checkout/dismiss`, `checkout/cancel` and `checkout/finish` keep working. `agent/ask` refuses a model input without a `redeemKeyHash`; every `setup-agent` since 0.0.7 sends one.
