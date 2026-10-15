<script>
  let { setup } = $props();
  let selectedIndex = $state(0);
  // svelte-ignore state_referenced_locally
  const selected = setup(() => selectedIndex);
</script>

<button onclick={() => (selectedIndex = 1)}>select second item</button>
<output>{selected.current ? "selected" : "not selected"}</output>
