import { ReactNode } from "react";

type GroupSelection = {
  id: string;
  label: string;
  kept: VariantChoice;
  removed: VariantChoice[];
  parent: {
    group: string;
    variant: string;
  } | undefined;
};

declare function Variant(_param0: VariantProps): import("react").JSX.Element;

type VariantChoice = {
  id: string;
  label: string;
};

type VariantProps = {
  id: string;
  label?: string | undefined;
  children?: ReactNode;
};

declare function Variants(_param1: VariantsProps): import("react").JSX.Element;

type VariantsConfig = {
  prompt?: ((selection: VariantsSelection) => string) | undefined;
  shortcut?: VariantsShortcut | false | undefined;
};

type VariantsProps = {
  id: string;
  label?: string | undefined;
  default?: string | undefined;
  persist?: boolean | undefined;
  allowInProduction?: boolean | undefined;
  outline?: boolean | undefined;
  children?: ReactNode;
};

type VariantsSelection = {
  scope: "group" | "page";
  pathname: string;
  url: string;
  groups: GroupSelection[];
};

type VariantsShortcut = {
  code: string;
  alt?: boolean | undefined;
  ctrl?: boolean | undefined;
  meta?: boolean | undefined;
  shift?: boolean | undefined;
};

declare function configureVariants(next: VariantsConfig): void;

declare function formatVariantsPrompt(selection: VariantsSelection): string;

declare namespace entry_root_exports {
  export { GroupSelection, Variant, VariantChoice, VariantProps, Variants, VariantsConfig, VariantsProps, VariantsSelection, VariantsShortcut, configureVariants, formatVariantsPrompt };
}

export { entry_root_exports as entry_root };
