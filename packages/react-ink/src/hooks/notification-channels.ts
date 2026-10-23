import { sanitizeTerminalText } from "../sanitizeTerminalText";

export type OSCVariant = "osc9" | "osc99" | "osc777";

type ProcessWithStdout = {
  process?: {
    stdout?: {
      write: (value: string) => unknown;
    };
  };
};

const writeToStdout = (value: string) => {
  const stdout = (globalThis as ProcessWithStdout).process?.stdout;
  stdout?.write(value);
};

export const ringBell = () => {
  writeToStdout("\x07");
};

/**
 * Emit an OSC terminal notification. `osc9` and `osc99` carry a single
 * message string and render `body ?? title`. `osc777` carries `title` and
 * `body` as separate fields. OSC support depends on the terminal emulator.
 */
export const sendOSCNotification = (
  title: string,
  body?: string,
  variant: OSCVariant = "osc9",
) => {
  const sanitizedTitle = sanitizeTerminalText(title);
  const sanitizedBody = body ? sanitizeTerminalText(body) : undefined;
  const message = sanitizedBody ?? sanitizedTitle;

  switch (variant) {
    case "osc99":
      writeToStdout(`\x1b]99;;${message}\x1b\\`);
      return;
    case "osc777":
      writeToStdout(
        `\x1b]777;notify;${sanitizedTitle.replaceAll(";", " ")};${sanitizedBody?.replaceAll(";", " ") ?? ""}\x07`,
      );
      return;
    case "osc9":
      writeToStdout(`\x1b]9;${message}\x07`);
      return;
  }
};
