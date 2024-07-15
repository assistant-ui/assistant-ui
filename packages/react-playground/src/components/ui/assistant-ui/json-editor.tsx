import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism.css";
import { FC } from "react";
import { cn } from "../../../lib/utils";

type JSONEditorProps = {
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

export const JSONEditor: FC<JSONEditorProps> = ({ className, ...props }) => {
  return (
    <Editor
      {...props}
      highlight={(code) => highlight(code, languages["json"]!, "json")}
      className={cn("w-full font-mono [&>textarea]:outline-none", className)}
    />
  );
};
