import { Command } from "commander";
import chalk from "chalk";
import debug from "debug";
import { query, type SDKMessage } from "@anthropic-ai/claude-code";

const log = debug("code:command");
const error = debug("code:error");



export const codeCommand = new Command()
  .command("code")
  .description("Execute code using Claude's code execution capabilities")
  .argument("<prompt>", "The prompt or command to execute")
  .option("--max-turns <number>", "Maximum number of turns", "5")
  .option("--output-format <format>", "Output format (text, json, stream-json)", "text")
  .action(async (prompt: string, options: { 
    maxTurns?: string;
    outputFormat?: string;
  }) => {
    try {
      const apiKey = process.env["ANTHROPIC_API_KEY"];
      
      if (!apiKey) {
        console.error(chalk.red("Error: ANTHROPIC_API_KEY environment variable is required"));
        console.error(chalk.yellow("Please set your Anthropic API key:"));
        console.error(chalk.gray("export ANTHROPIC_API_KEY=your-api-key-here"));
        process.exit(1);
      } 

      const messages: SDKMessage[] = [];
      const maxTurns = parseInt(options.maxTurns || "5", 10);

      log(`Executing prompt: ${prompt}`);

      // Use the Claude Code SDK query function
      for await (const message of query({
        prompt: prompt,
        abortController: new AbortController(),
        options: {
          maxTurns: maxTurns,
          allowedTools: ["Read", "Write", "Bash"],
          permissionMode: "acceptEdits"
        },
      })) {
        messages.push(message); 
      }

      // Handle output format
      if (options.outputFormat === "json") {
        console.log(JSON.stringify(messages, null, 2));
      } else if (options.outputFormat === "stream-json") {
        messages.forEach(message => {
          console.log(JSON.stringify(message));
        });
      } else {
        // Text format - show the final result
        const resultMessage = messages.find(m => m.type === "result");
        if (resultMessage && resultMessage.type === "result" && resultMessage.subtype === "success") {
          console.log(resultMessage.result);
        } else {
          // If no result message, try to show the last assistant message
          const lastAssistantMessage = messages.filter(m => m.type === "assistant").pop();
          if (lastAssistantMessage && lastAssistantMessage.type === "assistant") {
            if (Array.isArray(lastAssistantMessage.message.content)) {
              lastAssistantMessage.message.content.forEach((content: any) => {
                if (content.type === "text") {
                  console.log(content.text);
                }
              });
            } else if (typeof lastAssistantMessage.message.content === "string") {
              console.log(lastAssistantMessage.message.content);
            }
          }
        }
      }

    } catch (err) {
      error("Command execution failed:", err);
      
      if (err instanceof Error) {
        if (err.message.includes("401")) {
          console.error(chalk.red("Authentication Error: Invalid API key"));
          console.error(chalk.yellow("Please check your ANTHROPIC_API_KEY environment variable"));
        } else if (err.message.includes("429")) {
          console.error(chalk.red("Rate Limit Error: Too many requests"));
          console.error(chalk.yellow("Please wait a moment before trying again"));
        } else if (err.message.includes("network") || err.message.includes("ENOTFOUND")) {
          console.error(chalk.red("Network Error: Unable to connect to Claude API"));
          console.error(chalk.yellow("Please check your internet connection"));
        } else {
          console.error(chalk.red("Error:"), err.message);
        }
      } else {
        console.error(chalk.red("Unknown error occurred"));
      }
      
      process.exit(1);
    }
  }); 