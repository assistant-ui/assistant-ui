---
"generative-frame": patch
---

fix: a `render_spec` call that patches an earlier spec with the same title now renders on that spec when it mounts before its title has streamed in. The base follows the title, and the toolkit starts following the patches once they arrive.
