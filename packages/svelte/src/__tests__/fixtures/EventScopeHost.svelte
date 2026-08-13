<script>
  import { provideAui } from "../../provideAui";
  import { useAuiEvent } from "../../useAuiEvent";

  let { makeConfig, onPing, expose } = $props();
  let present = $state(false);
  const aui = provideAui(() => makeConfig(present));
  // svelte-ignore state_referenced_locally
  useAuiEvent("message.pinged", onPing);
  // svelte-ignore state_referenced_locally
  expose({ aui, setPresent: (value) => (present = value) });
</script>
