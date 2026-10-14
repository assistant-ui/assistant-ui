import { defineComponent, h } from "vue";
import { useSpecElement } from "generative-frame/spec/vue";
import { formDefinitions } from "../../vocabulary/definitions/form";
import { collectFormValuesFromEvent } from "../../vocabulary/collectFormValues";

export const formVocabulary = {
  Form: {
    ...formDefinitions.Form,
    component: defineComponent({
      name: "GenerativeUIForm",
      props: ["gap"],
      emits: ["submit"],
      setup: function GenerativeUIForm(props, { emit, slots }) {
        const context = useSpecElement();
        return () =>
          h(
            "form",
            {
              "data-aui": "form",
              "data-aui-gap": props.gap,
              "data-aui-action": Object.hasOwn(
                context.element.on ?? {},
                "submit",
              )
                ? JSON.stringify({ type: "submit" })
                : undefined,
              onSubmit: (event: Event) => {
                event.preventDefault();
                if (Object.hasOwn(context.element.on ?? {}, "submit")) {
                  emit(
                    "submit",
                    collectFormValuesFromEvent({
                      currentTarget: event.currentTarget as HTMLFormElement,
                    }),
                  );
                }
              },
            },
            slots.default?.() ?? [],
          );
      },
    }),
  },
};
