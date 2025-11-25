import type { AssistantRuntime, Tool } from "@assistant-ui/react";
import {
	DefaultChatTransport,
	type HttpChatTransportInitOptions,
	type JSONSchema7,
	type UIMessage,
} from "ai";
import type { RefObject } from "react";
import z from "zod";
import type { RuntimeBody } from "./useChatRuntime";

type AISDKToolDefinition = {
	description?: string;
	parameters: JSONSchema7;
};

const toAISDKTools = (
	tools: Record<string, Tool>,
): Record<string, AISDKToolDefinition> => {
	return Object.fromEntries(
		Object.entries(tools).map(([name, tool]) => [
			name,
			{
				...(tool.description ? { description: tool.description } : undefined),
				parameters: (tool.parameters instanceof z.ZodType
					? z.toJSONSchema(tool.parameters)
					: tool.parameters) as JSONSchema7,
			},
		]),
	);
};

const getEnabledTools = (tools: Record<string, Tool>) => {
	return Object.fromEntries(
		Object.entries(tools).filter(
			([, tool]) => !tool.disabled && tool.type !== "backend",
		),
	);
};

export class AssistantChatTransport<
	UI_MESSAGE extends UIMessage,
	TBody extends Record<string, unknown> = Record<string, unknown>,
> extends DefaultChatTransport<UI_MESSAGE> {
	private runtime: AssistantRuntime | undefined;
	private dynamicBodyRef?: RefObject<RuntimeBody<TBody> | undefined>;
	private remoteId: string | undefined;
	private lastTools: Record<string, Tool> | undefined;
	private lastAISDKTools: Record<string, AISDKToolDefinition> | undefined;

	private getAISDKTools(
		tools: Record<string, Tool>,
	): Record<string, AISDKToolDefinition> {
		if (this.lastTools === tools && this.lastAISDKTools) {
			return this.lastAISDKTools;
		}

		const enabledTools = getEnabledTools(tools);
		const aiSdkTools = toAISDKTools(enabledTools);

		this.lastTools = tools;
		this.lastAISDKTools = aiSdkTools;

		return aiSdkTools;
	}

	constructor(initOptions?: HttpChatTransportInitOptions<UI_MESSAGE>) {
		const { body: _initBody, ...restInitOptions } = initOptions ?? {};

		super({
			...restInitOptions,
			prepareSendMessagesRequest: async (options) => {
				const context = this.runtime?.thread.getModelContext();

				if (this.runtime && !this.remoteId) {
					this.remoteId = (
						await this.runtime.threads.mainItem.initialize()
					)?.remoteId;
				}

				const id = this.remoteId ?? options.id;

				const runtimeBody = this.dynamicBodyRef?.current;
				const resolvedRuntimeBody =
					typeof runtimeBody === "function" ? await runtimeBody() : runtimeBody;
				const resolvedInitBody =
					typeof _initBody === "function" ? await _initBody() : _initBody;
				const dynamicBody =
					(resolvedRuntimeBody as TBody | undefined) ??
					(resolvedInitBody as Record<string, unknown> | undefined);

				const contextBody =
					context == null
						? {}
						: {
								...(context.callSettings
									? { callSettings: context.callSettings }
									: undefined),
								...(context.system ? { system: context.system } : undefined),
								...(context.tools && Object.keys(context.tools).length > 0
									? { tools: this.getAISDKTools(context.tools) }
									: undefined),
							};

				const optionsEx = {
					...options,
					body: {
						...contextBody,
						...options?.body,
						...dynamicBody,
					},
				};
				const preparedRequest =
					await restInitOptions?.prepareSendMessagesRequest?.(optionsEx);

				return {
					...preparedRequest,
					body: preparedRequest?.body ?? {
						...optionsEx.body,
						id,
						messages: options.messages,
						trigger: options.trigger,
						messageId: options.messageId,
					},
				};
			},
		});
	}

	setRuntime(runtime: AssistantRuntime) {
		this.runtime = runtime;
	}

	/**
	 * Set a ref that will be read dynamically on each request.
	 * This allows the body to be updated without recreating the transport.
	 * @internal
	 */
	__internal_setDynamicBodyRef(ref: RefObject<RuntimeBody<TBody> | undefined>) {
		this.dynamicBodyRef = ref;
	}
}
