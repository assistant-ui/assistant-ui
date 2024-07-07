import { FC } from "react";
import { useThreadConfig } from "../thread-config";
import { useCopyToClipboard } from "../../utils/useCopyToClipboard";
import { TooltipIconButton } from "../base";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { CodeHeaderProps } from "@assistant-ui/react-markdown";

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
