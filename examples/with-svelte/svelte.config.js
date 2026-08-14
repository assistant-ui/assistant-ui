import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
  // Builders capture their index or item at construction by design: in an
  // unkeyed {#each}, component instances are position-stable and
  // messages.item(index) is referentially stable per index, so the
  // captured value never changes for the instance's lifetime.
  onwarn: (warning, handler) => {
    if (warning.code === "state_referenced_locally") return;
    handler(warning);
  },
};
