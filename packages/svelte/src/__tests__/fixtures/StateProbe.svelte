<script>
  let { setup, onValue } = $props();
  // svelte-ignore state_referenced_locally
  const read = setup();
  $effect(() => {
    onValue(read());
  });
</script>
