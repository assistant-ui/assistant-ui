"use client";

import { memo, useState, useEffect, createContext, useContext } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useAssistantApi } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectValue } from "@/components/ui/select";

export type ModelOption = {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
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

const modelSelectorTriggerVariants = cva(
  "aui-model-selector-trigger inline-flex w-fit cursor-pointer items-center justify-between gap-2 rounded-md border-0 bg-transparent text-sm shadow-none outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        outline:
          "border border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 px-2 py-1 text-xs",
        lg: "h-9 px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "default",
    },
  },
);

export type ModelSelectorRootProps = {
  models: ModelOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
};

function ModelSelectorRoot({
  models,
  value,
  onValueChange,
  defaultValue,
  children,
}: ModelSelectorRootProps) {
  const selectProps: React.ComponentProps<typeof Select> = {};
  if (value !== undefined) selectProps.value = value;
  if (onValueChange) selectProps.onValueChange = onValueChange;
  const resolvedDefault = defaultValue ?? models[0]?.id;
  if (resolvedDefault) selectProps.defaultValue = resolvedDefault;

  return (
    <ModelSelectorContext.Provider value={{ models }}>
      <Select {...selectProps}>{children}</Select>
    </ModelSelectorContext.Provider>
  );
}

export type ModelSelectorTriggerProps = React.ComponentProps<
  typeof SelectPrimitive.Trigger
> &
  VariantProps<typeof modelSelectorTriggerVariants>;

function ModelSelectorTrigger({
  className,
  variant,
  size,
  ...props
}: ModelSelectorTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="model-selector-trigger"
      data-variant={variant ?? "ghost"}
      data-size={size ?? "default"}
      className={cn(modelSelectorTriggerVariants({ variant, size }), className)}
      {...props}
    >
      <SelectValue />
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-3.5 opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export type ModelSelectorContentProps = React.ComponentProps<
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
  React.ComponentProps<typeof SelectPrimitive.Item>,
  "value"
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
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-3.5" />
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
  VariantProps<typeof modelSelectorTriggerVariants> & {
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
  const [internalValue, setInternalValue] = useState(
    () => controlledValue ?? defaultValue ?? models[0]?.id ?? "",
  );

  const value = controlledValue ?? internalValue;
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
  modelSelectorTriggerVariants,
};
