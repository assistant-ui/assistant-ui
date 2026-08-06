import {
  defineComponent,
  inject,
  onScopeDispose,
  provide,
  watch,
  type PropType,
  type SlotsType,
} from "vue";
import {
  createAssistantClient,
  type AuiConfig,
} from "@assistant-ui/store/client";
import { auiInjectionKey, createClientFacade } from "./context";

const isDevelopment =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test");

/**
 * Creates an `AssistantClient` from the given config and provides it to the
 * subtree. Nested providers extend the nearest ancestor's client; scopes the
 * config does not define resolve through the parent chain.
 *
 * The config is captured when the provider mounts; swapping the `config` prop
 * afterwards is not supported. Remount the provider (for example with a
 * `key`) to change the scope set.
 */
export const AuiProvider = defineComponent({
  name: "AuiProvider",
  props: {
    config: {
      type: Object as PropType<AuiConfig>,
      required: true,
    },
  },
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { slots }) {
    const parent = inject(auiInjectionKey, null);

    const handle = createAssistantClient(
      props.config,
      parent ? { parent: parent.source } : undefined,
    );
    onScopeDispose(() => handle.destroy());

    const source = {
      getClient: handle.getClient,
      subscribe: handle.subscribe,
    };
    provide(auiInjectionKey, {
      source,
      aui: createClientFacade(source),
    });

    if (isDevelopment) {
      watch(
        () => props.config,
        () => {
          console.warn(
            "[assistant-ui] AuiProvider does not support swapping `config` after mount; remount the provider with a `key` to change the scope set.",
          );
        },
      );
    }

    return () => slots.default?.();
  },
});
