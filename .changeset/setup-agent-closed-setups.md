---
"setup-agent": patch
---

fix(setup-agent): keep a finished setup done when a late cancel arrives, create `.env.local` owner-only and open it before taking the one-time key, stop counting acknowledged follow-ups, refuse duplicate or `:`-containing option ids, and dispose a client whose first connection fails
