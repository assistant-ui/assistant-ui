---
"generative-frame": patch
---

fix: within one message, a `render_spec` call that a later call with the same title patches renders nothing and stops sharing its choices with the model, so a spec the model repairs shows once instead of once per call, in the assistant-ui spec toolkits for the web, React Native, and Vue. A later call counts once its whole title has arrived, so a title still streaming never hides an earlier spec by matching it for a moment.
