import { FC } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useThreadConfig } from "@assistant-ui/react";
import { TooltipIconButton } from "@assistant-ui/react/internal";

import { CodeHeaderProps } from "../overrides/types";
import { useCopyToClipboard } from "./useCopyToClipboard";

export const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const {
    strings: {
      code: { header: { copy: { tooltip = "Copy" } = {} } = {} } = {},
    } = {},
  } = useThreadConfig();

  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="aui-code-header-root">
      <span className="aui-code-header-language">{language}</span>
      <TooltipIconButton tooltip={tooltip} onClick={onCopy}>
        {!isCopied && <CopyIcon />}
        {isCopied && <CheckIcon />}
      </TooltipIconButton>
    </div>
  );
};
