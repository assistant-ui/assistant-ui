"use client";

import { memo, useState, useEffect, createContext, useContext } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useAssistantApi } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

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
  "aui-model-selector-trigger inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "text-muted-foreground hover:bg-muted hover:text-foreground",
        outline:
          "border border-input text-muted-foreground hover:bg-muted hover:text-foreground",
        muted:
          "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      },
      size: {
        sm: "py-1 pr-1.5 pl-2 text-xs",
        md: "py-1.5 pr-2 pl-3",
        lg: "py-2 pr-2.5 pl-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
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
  value: controlledValue,
  onValueChange: controlledOnValueChange,
  defaultValue,
  children,
}: ModelSelectorRootProps) {
  const [internalValue, setInternalValue] = useState(
    () => defaultValue ?? models[0]?.id ?? "",
  );

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const onValueChange = isControlled
    ? controlledOnValueChange!
    : setInternalValue;

  return (
    <ModelSelectorContext.Provider value={{ models }}>
      <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
        {children}
      </SelectPrimitive.Root>
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
  children,
  ...props
}: ModelSelectorTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="model-selector-trigger"
      className={cn(modelSelectorTriggerVariants({ variant, size }), className)}
      {...props}
    >
      {children ?? <SelectPrimitive.Value />}
      <ChevronDownIcon className="size-3.5 opacity-50" />
    </SelectPrimitive.Trigger>
  );
}

export type ModelSelectorContentProps = React.ComponentProps<
  typeof SelectPrimitive.Content
>;

function ModelSelectorContent({
  className,
  children,
  position = "popper",
  sideOffset = 6,
  ...props
}: ModelSelectorContentProps) {
  const { models } = useModelSelectorContext();

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="model-selector-content"
        position={position}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-44 overflow-hidden rounded-xl border bg-popover/95 p-1.5 text-popover-foreground shadow-lg backdrop-blur-sm",
          "data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in",
          "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="space-y-0.5">
          {children ??
            models.map((model) => (
              <ModelSelectorItem
                key={model.id}
                model={model}
                disabled={model.disabled}
              />
            ))}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
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
      textValue={model.name}
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-lg py-2 pr-9 pl-3 text-sm outline-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground",
        "data-[state=checked]:font-medium",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>
        <span className="flex items-center gap-2">
          {model.icon && (
            <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
              {model.icon}
            </span>
          )}
          <span className="truncate">{model.name}</span>
        </span>
      </SelectPrimitive.ItemText>
      {model.description && (
        <span className="truncate text-muted-foreground text-xs">
          {model.description}
        </span>
      )}
      <span className="absolute right-3 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
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
