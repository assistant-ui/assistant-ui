import { ReactNode } from "react";

declare function Variant(_param0: VariantProps): import("react").JSX.Element;

type VariantProps = {
  id: string;
  label?: string | undefined;
  children?: ReactNode;
};

declare function Variants(_param1: VariantsProps): import("react").JSX.Element;

type VariantsProps = {
  id: string;
  label?: string | undefined;
  default?: string | undefined;
  persist?: boolean | undefined;
  allowInProduction?: boolean | undefined;
  outline?: boolean | undefined;
  children?: ReactNode;
};

declare namespace entry_root_exports {
  export { Variant, VariantProps, Variants, VariantsProps };
}

export { entry_root_exports as entry_root };
