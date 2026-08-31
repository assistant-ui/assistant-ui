---
"@assistant-ui/core": patch
---

feat: background thread bodies and a plain cloud adapter factory

RemoteThreadList gains a backgroundThreads mode that keeps every visited thread mounted: runs continue across switches, per-item isRunning is live, per-thread history and adapters mount once per body, and a freshly initialized thread generates its title. createCloudThreadListAdapter builds the assistant-cloud adapter without a hook call site so non-React hosts can construct it in plain code.
