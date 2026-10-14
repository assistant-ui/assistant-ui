---
"generative-frame": patch
---

fix: a `render_spec` call that patches an earlier spec with the same title now renders on that spec when it mounts before its title has streamed in. The base follows the title, and the stream starts over when the title brings a new one.
