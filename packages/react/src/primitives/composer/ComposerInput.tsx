"use client";

import { type KeyboardEvent, forwardRef, useRef } from "react";
import type { ComponentPropsWithoutRef } from "@radix-ui/react-primitive";
import { Slot } from "@radix-ui/react-slot";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useAutosize } from "../../utils/hooks/useAutosize";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { useComposerContext } from "./ComposerRoot";

type ComposerInputProps = ComponentPropsWithoutRef<"textarea"> & {
	asChild?: boolean;
};

export const ComposerInput = forwardRef<
	HTMLTextAreaElement,
	ComposerInputProps
>(({ asChild, onChange, onKeyDown, ...rest }, forwardedRef) => {
	const chat = useThreadContext(
		"Composer.Input",
		({ chat: { input, handleInputChange, isLoading } }) => ({
			input,
			handleInputChange,
			isLoading,
		}),
	);

	const Component = asChild ? Slot : "textarea";

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const ref = useComposedRefs(forwardedRef, textareaRef);

	// make the textarea grow with the content
	useAutosize(textareaRef);

	const composer = useComposerContext();

	const handleKeyPress = (e: KeyboardEvent) => {
		if (chat.isLoading || rest.disabled) return;

		if (e.key === "Enter" && e.shiftKey === false) {
			e.preventDefault();
			composer.submit();
		}
	};

	return (
		<Component
			value={chat.input}
			{...rest}
			ref={ref}
			onChange={composeEventHandlers(onChange, chat.handleInputChange)}
			onKeyDown={composeEventHandlers(onKeyDown, handleKeyPress)}
		/>
	);
});
