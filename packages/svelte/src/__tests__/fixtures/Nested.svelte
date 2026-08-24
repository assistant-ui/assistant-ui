<script>
  import Host from "./Host.svelte";

  let { outerSetup, innerSetup } = $props();
  // svelte-ignore state_referenced_locally
  outerSetup();
</script>

<Host setup={innerSetup} />
