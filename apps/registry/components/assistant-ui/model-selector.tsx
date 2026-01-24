"use client";

import { memo, useState, useEffect, createContext, useContext } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useAssistantApi } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- Types ---

export type ModelOption = {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
};

// --- Context for Root state ---

type ModelSelectorContextValue = {
  value: string;
  onValueChange: (value: string) => void;
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

// --- CVA Trigger Variants ---

const modelSelectorTriggerVariants = cva(
  "aui-model-selector-trigger inline-flex cursor-pointer items-center gap-1.5 rounded-md text-sm outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        outline:
          "border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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

// --- Sub-components ---

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

  const value = controlledValue ?? internalValue;
  const onValueChange = controlledOnValueChange ?? setInternalValue;

  return (
    <ModelSelectorContext.Provider value={{ value, onValueChange, models }}>
      <DropdownMenu>
        <div data-slot="model-selector-root">{children}</div>
      </DropdownMenu>
    </ModelSelectorContext.Provider>
  );
}

export type ModelSelectorTriggerProps = React.ComponentProps<"button"> &
  VariantProps<typeof modelSelectorTriggerVariants>;

function ModelSelectorTrigger({
  className,
  variant,
  size,
  children,
  ...props
}: ModelSelectorTriggerProps) {
  const { value, models } = useModelSelectorContext();
  const selectedModel = models.find((m) => m.id === value);

  return (
    <DropdownMenuTrigger asChild>
      <button
        data-slot="model-selector-trigger"
        data-variant={variant ?? "ghost"}
        data-size={size ?? "default"}
        className={cn(modelSelectorTriggerVariants({ variant, size, className }))}
        {...props}
      >
        {children ?? (
          <>
            {selectedModel?.icon && (
              <span
                data-slot="model-selector-trigger-icon"
                className="flex shrink-0 items-center [&_svg]:size-3.5"
              >
                {selectedModel.icon}
              </span>
            )}
            <span className="truncate font-medium">
              {selectedModel?.name ?? "Select model"}
            </span>
          </>
        )}
        <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
      </button>
    </DropdownMenuTrigger>
  );
}

export type ModelSelectorContentProps = React.ComponentProps<
  typeof DropdownMenuContent
>;

function ModelSelectorContent({
  className,
  children,
  ...props
}: ModelSelectorContentProps) {
  const { models, value, onValueChange } = useModelSelectorContext();

  return (
    <DropdownMenuContent
      data-slot="model-selector-content"
      align="start"
      className={cn("min-w-[180px]", className)}
      {...props}
    >
      {children ??
        models.map((model) => (
          <ModelSelectorItem
            key={model.id}
            model={model}
            selected={model.id === value}
            onSelect={() => onValueChange(model.id)}
          />
        ))}
    </DropdownMenuContent>
  );
}

export type ModelSelectorItemProps = Omit<
  React.ComponentProps<typeof DropdownMenuItem>,
  "onSelect"
> & {
  model: ModelOption;
  selected?: boolean;
  onSelect?: () => void;
};

function ModelSelectorItem({
  model,
  selected,
  onSelect,
  className,
  ...props
}: ModelSelectorItemProps) {
  return (
    <DropdownMenuItem
      data-slot="model-selector-item"
      data-selected={selected}
      onSelect={onSelect}
      className={cn("flex items-center gap-2.5 py-2", className)}
      {...props}
    >
      {model.icon && (
        <span
          data-slot="model-selector-item-icon"
          className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4"
        >
          {model.icon}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          data-slot="model-selector-item-name"
          className="truncate text-sm font-medium leading-none"
        >
          {model.name}
        </span>
        {model.description && (
          <span
            data-slot="model-selector-item-description"
            className="truncate text-xs leading-none text-muted-foreground"
          >
            {model.description}
          </span>
        )}
      </div>
      <CheckIcon
        data-slot="model-selector-item-check"
        className={cn(
          "ml-auto size-3.5 shrink-0 transition-opacity",
          selected ? "opacity-100" : "opacity-0",
        )}
      />
    </DropdownMenuItem>
  );
}

// --- Default export (runtime-integrated) ---

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

// --- Composite export pattern ---

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
