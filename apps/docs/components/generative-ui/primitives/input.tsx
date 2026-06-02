import { Input as UIInput } from "@/components/ui/input";

export function Input({
  name,
  inputType = "text",
  placeholder,
  defaultValue,
  required,
  disabled,
  pattern,
}: {
  name?: string;
  inputType?: "text" | "number" | "email" | "password" | "tel" | "url";
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  pattern?: string;
}) {
  return (
    <UIInput
      name={name}
      type={inputType}
      placeholder={placeholder}
      defaultValue={defaultValue}
      required={required}
      disabled={disabled}
      pattern={pattern}
    />
  );
}
