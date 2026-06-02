import { Textarea as UITextarea } from "@/components/ui/textarea";

export function Textarea({
  name,
  placeholder,
  defaultValue,
  rows = 3,
  required,
  disabled,
}: {
  name?: string;
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <UITextarea
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue}
      rows={rows}
      required={required}
      disabled={disabled}
    />
  );
}
