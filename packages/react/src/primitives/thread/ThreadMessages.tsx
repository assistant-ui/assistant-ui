"use client";

import type { FC } from "react";
import { Provider } from "../message";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { UPCOMING_MESSAGE_ID } from "../../utils/hooks/useBranches";

type ThreadMessagesProps = {
	components: {
		Message: React.ComponentType;
	};
};

export const ThreadMessages: FC<ThreadMessagesProps> = ({
	components: { Message },
}) => {
	const chat = useThreadContext("Thread.Messages", (s) => s.chat);
	const messages = chat.messages;

	if (messages.length === 0) return null;

	return (
		<>
			{messages.map((message) => {
				return (
					<Provider key={message.id} message={message}>
						<Message />
					</Provider>
				);
			})}
			{chat.isLoading &&
				chat.messages[chat.messages.length - 1]?.role !== "assistant" && (
					<Provider
						message={{
							id: UPCOMING_MESSAGE_ID,
							role: "assistant",
							content: "...",
						}}
					>
						<Message />
					</Provider>
				)}
		</>
	);
};
