<script>
  import { provideAui } from "../../provideAui";

  let { makeConfig, expose } = $props();
  let arg = $state(0);
  // svelte-ignore state_referenced_locally
  const aui = provideAui(() => makeConfig(arg));
  // svelte-ignore state_referenced_locally
  expose({
    aui,
    setArg: (value) => (arg = value),
  });
</script>
