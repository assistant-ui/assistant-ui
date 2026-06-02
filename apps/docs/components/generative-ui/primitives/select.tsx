import {
  Select as UISelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = string | { label?: string; value: string };

export function Select({
  options = [],
  name,
  placeholder,
  defaultValue,
  disabled = false,
  block = false,
}: {
  options?: Option[];
  name?: string;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  block?: boolean;
}) {
  const items = options.map((option) =>
    typeof option === "string"
      ? { label: option, value: option }
      : { label: option.label ?? option.value, value: option.value },
  );
  return (
    <UISelect
      disabled={disabled}
      {...(name ? { name } : {})}
      {...(defaultValue ? { defaultValue } : {})}
    >
      <SelectTrigger className={block ? "w-full" : undefined}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </UISelect>
  );
}
