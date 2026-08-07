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
  type AssistantClient,
  type AuiConfig,
} from "@assistant-ui/store/client";
import { auiInjectionKey, createClientFacade } from "./context";
import { isDevelopment } from "./isDevelopment";

/**
 * Creates an `AssistantClient` from the given config and provides it to the
 * subtree.
 *
 * At the top level, `config` alone creates this subtree's own client. Under a
 * parent provider, `extends` is mandatory: pass `:extends="aui"` to extend the
 * parent client or `:extends="null"` to isolate from it (enforced with a dev
 * error).
 *
 * The `config` prop is live: passing a new config object updates element args
 * in place (scopes keep their state) and mounts or unmounts added and removed
 * scopes. Pass a computed config to derive it from reactive inputs. `extends`
 * is captured when the provider mounts; remount (for example with a `key`) to
 * change the parent.
 */
export const AuiProvider = defineComponent({
  name: "AuiProvider",
  props: {
    config: {
      type: Object as PropType<AuiConfig>,
      required: true,
    },
    extends: {
      type: Object as PropType<AssistantClient | null>,
      default: undefined,
    },
  },
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { slots }) {
    const injected = inject(auiInjectionKey, null);
    const hasExtends = props.extends !== undefined;

    if (isDevelopment) {
      if (injected && !hasExtends) {
        throw new Error(
          'A parent AuiProvider exists. Pass :extends="aui" to inherit it or :extends="null" to isolate.',
        );
      }
    }

    const parent = !hasExtends
      ? injected?.source
      : props.extends === null
        ? undefined
        : injected && props.extends === injected.aui
          ? injected.source
          : props.extends;

    const handle = createAssistantClient(
      {
        getConfig: () => props.config,
        subscribe: (listener) => watch(() => props.config, listener),
      },
      parent ? { parent } : undefined,
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

    return () => slots.default?.();
  },
});
