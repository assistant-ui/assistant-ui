import {
  RadioGroup as UIRadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Option = string | { label?: string; value: string };

export function RadioGroup({
  options = [],
  name,
  defaultValue,
  direction = "row",
  disabled = false,
  required = false,
}: {
  options?: Option[];
  name?: string;
  defaultValue?: string;
  direction?: "row" | "col";
  disabled?: boolean;
  required?: boolean;
}) {
  const items = options.map((option) =>
    typeof option === "string"
      ? { label: option, value: option }
      : { label: option.label ?? option.value, value: option.value },
  );
  return (
    <UIRadioGroup
      disabled={disabled}
      required={required}
      className={cn(
        "flex",
        direction === "col" ? "flex-col gap-2" : "flex-row flex-wrap gap-4",
      )}
      {...(name ? { name } : {})}
      {...(defaultValue ? { defaultValue } : {})}
    >
      {items.map((item) => {
        const id = `${name ?? "radio"}-${item.value}`;
        return (
          <div key={item.value} className="flex items-center gap-2">
            <RadioGroupItem id={id} value={item.value} />
            <Label htmlFor={id} className="font-normal">
              {item.label}
            </Label>
          </div>
        );
      })}
    </UIRadioGroup>
  );
}
