import type { ReactNode } from "react";
import { View } from "react-native";
import type { GenerativeUILibrary } from "../../types";
import { formDefinitions } from "../../vocabulary/definitions/form";
import { fire } from "../../vocabulary/dispatch";
import { FieldScopeProvider, useFieldScopeOwner } from "../fieldScope";
import { space } from "../theme";

function Form({
  gap,
  $action,
  $dispatch,
  children,
}: {
  gap?: number;
  $action?: Parameters<typeof fire>[0];
  $dispatch?: Parameters<typeof fire>[1];
  children?: ReactNode;
}) {
  const scope = useFieldScopeOwner((values) =>
    fire($action, $dispatch, values),
  );
  return (
    <FieldScopeProvider value={scope}>
      <View style={{ flexDirection: "column", gap: space(gap, 12) }}>
        {children}
      </View>
    </FieldScopeProvider>
  );
}

export const formVocabulary = {
  Form: {
    ...formDefinitions.Form,
    render: (props) => <Form {...props} />,
  },
} satisfies GenerativeUILibrary;
