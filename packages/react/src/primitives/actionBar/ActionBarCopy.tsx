"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { createActionButton } from "../../utils/createActionButton";

type ActionBarCopyProps = {
	copiedDuration?: number;
};

export const useActionBarCopy = ({ copiedDuration = 3000 }) => {
	const [messageContent, setIsCopied] = useMessageContext(
		"ActionBar.Copy",
		(s) => [s.message.content, s.setIsCopied],
	);

	return () => {
		navigator.clipboard.writeText(messageContent);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), copiedDuration);
	};
};

export const ActionBarCopy =
	createActionButton<ActionBarCopyProps>(useActionBarCopy);
