---
"generative-frame": patch
---

fix: within one message, a `render_spec` call that a later call with the same title patches renders nothing and stops sharing its choices with the model, and model context subscribers hear when it stops, so a spec the model repairs shows once instead of once per call, in the assistant-ui spec toolkits for the web, React Native, and Vue. A later call counts once its whole top-level title has arrived, however its JSON escapes it, so a title still streaming or a nested `title` prop never hides an earlier spec by matching it for a moment.
