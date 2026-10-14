---
"generative-frame": patch
---

fix: a prop the catalog declares as a string, number, or boolean no longer receives a resolved object or array, in the React and Vue spec renderers, so a state path cut short at `/tools` while the spec streams no longer crashes a Vue mount; the element waits as pending while the spec streams and shows the invalid-props placeholder afterward.
