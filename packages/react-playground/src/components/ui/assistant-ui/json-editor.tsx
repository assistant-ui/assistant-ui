import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import { FC } from "react";
import { cn } from "../../../lib/utils";

// TODO identify cause: using ESM imports of prism does not work for some users
const { highlight, languages } = Prism;

// https://github.com/react-simple-code-editor/react-simple-code-editor/issues/106
const EditorComponent =
  (Editor as unknown as { default: typeof Editor }).default ?? Editor;

type JSONEditorProps = {
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

export const JSONEditor: FC<JSONEditorProps> = ({ className, ...props }) => {
  return (
    <EditorComponent
      {...props}
      highlight={(code) => highlight(code, languages["json"]!, "json")}
      className={cn("w-full font-mono [&>textarea]:outline-none", className)}
    />
  );
};
