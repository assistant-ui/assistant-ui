<script>
  let { setup } = $props();
  // svelte-ignore state_referenced_locally
  const built = setup();
</script>

<textarea {...built.input.props}></textarea>
<button {...built.send.props}></button>
