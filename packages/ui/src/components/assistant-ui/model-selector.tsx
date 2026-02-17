"use client";

import {
  memo,
  useState,
  useEffect,
  createContext,
  useContext,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { type VariantProps } from "class-variance-authority";
import { CheckIcon } from "lucide-react";
import { useAssistantApi } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import {
  SelectRoot,
  SelectTrigger,
  SelectContent,
  SelectItem,
  selectTriggerVariants,
} from "@/components/assistant-ui/select";

export type ModelOption = {
  id: string;
  name: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
};

type ModelSelectorContextValue = {
  models: ModelOption[];
};

const ModelSelectorContext = createContext<ModelSelectorContextValue | null>(
  null,
);

function useModelSelectorContext() {
  const ctx = useContext(ModelSelectorContext);
  if (!ctx) {
    throw new Error(
      "ModelSelector sub-components must be used within ModelSelector.Root",
    );
  }
  return ctx;
}

export type ModelSelectorRootProps = {
  models: ModelOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: ReactNode;
};

function ModelSelectorRoot({
  models,
  value,
  onValueChange,
  defaultValue,
  children,
}: ModelSelectorRootProps) {
  const selectProps: ComponentPropsWithoutRef<typeof SelectRoot> = {};
  if (value !== undefined) selectProps.value = value;
  if (onValueChange) selectProps.onValueChange = onValueChange;
  const resolvedDefault = defaultValue ?? models[0]?.id;
  if (resolvedDefault) selectProps.defaultValue = resolvedDefault;

  return (
    <ModelSelectorContext.Provider value={{ models }}>
      <SelectRoot {...selectProps}>{children}</SelectRoot>
    </ModelSelectorContext.Provider>
  );
}

export type ModelSelectorTriggerProps = ComponentPropsWithoutRef<
  typeof SelectTrigger
>;

function ModelSelectorTrigger({
  className,
  variant,
  size,
  children,
  ...props
}: ModelSelectorTriggerProps) {
  return (
    <SelectTrigger
      data-slot="model-selector-trigger"
      variant={variant}
      size={size}
      className={cn("aui-model-selector-trigger", className)}
      {...props}
    >
      {children ?? <SelectPrimitive.Value />}
    </SelectTrigger>
  );
}

export type ModelSelectorContentProps = ComponentPropsWithoutRef<
  typeof SelectContent
>;

function ModelSelectorContent({
  className,
  children,
  ...props
}: ModelSelectorContentProps) {
  const { models } = useModelSelectorContext();

  return (
    <SelectContent
      data-slot="model-selector-content"
      className={cn("min-w-[180px]", className)}
      {...props}
    >
      {children ??
        models.map((model) => (
          <ModelSelectorItem
            key={model.id}
            model={model}
            {...(model.disabled ? { disabled: true } : undefined)}
          />
        ))}
    </SelectContent>
  );
}

export type ModelSelectorItemProps = Omit<
  ComponentPropsWithoutRef<typeof SelectItem>,
  "value" | "children"
> & {
  model: ModelOption;
};

function ModelSelectorItem({
  model,
  className,
  ...props
}: ModelSelectorItemProps) {
  return (
    <SelectPrimitive.Item
      data-slot="model-selector-item"
      value={model.id}
      textValue={model.name}
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-lg py-2 pr-9 pl-3 text-sm outline-none",
        "focus:bg-accent focus:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute right-3 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>
        <span className="flex items-center gap-2">
          {model.icon && (
            <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
              {model.icon}
            </span>
          )}
          <span className="truncate font-medium">{model.name}</span>
        </span>
      </SelectPrimitive.ItemText>
      {model.description && (
        <span className="truncate text-muted-foreground text-xs">
          {model.description}
        </span>
      )}
    </SelectPrimitive.Item>
  );
}

export type ModelSelectorProps = Omit<ModelSelectorRootProps, "children"> &
  VariantProps<typeof selectTriggerVariants> & {
    contentClassName?: string;
  };

const ModelSelectorImpl = ({
  models,
  value: controlledValue,
  onValueChange: controlledOnValueChange,
  defaultValue,
  variant,
  size,
  contentClassName,
}: ModelSelectorProps) => {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(
    () => defaultValue ?? models[0]?.id ?? "",
  );

  const value = isControlled ? controlledValue : internalValue;
  const onValueChange = controlledOnValueChange ?? setInternalValue;

  const api = useAssistantApi();

  useEffect(() => {
    const config = { config: { modelName: value } };
    return api.modelContext().register({
      getModelContext: () => config,
    });
  }, [api, value]);

  return (
    <ModelSelectorRoot
      models={models}
      value={value}
      onValueChange={onValueChange}
    >
      <ModelSelectorTrigger variant={variant} size={size} />
      <ModelSelectorContent className={contentClassName} />
    </ModelSelectorRoot>
  );
};

type ModelSelectorComponent = typeof ModelSelectorImpl & {
  displayName?: string;
  Root: typeof ModelSelectorRoot;
  Trigger: typeof ModelSelectorTrigger;
  Content: typeof ModelSelectorContent;
  Item: typeof ModelSelectorItem;
};

const ModelSelector = memo(
  ModelSelectorImpl,
) as unknown as ModelSelectorComponent;

ModelSelector.displayName = "ModelSelector";
ModelSelector.Root = ModelSelectorRoot;
ModelSelector.Trigger = ModelSelectorTrigger;
ModelSelector.Content = ModelSelectorContent;
ModelSelector.Item = ModelSelectorItem;

export {
  ModelSelector,
  ModelSelectorRoot,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorItem,
};
