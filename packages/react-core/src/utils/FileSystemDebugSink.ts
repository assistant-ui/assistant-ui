import { writeFileSync } from "node:fs";

/**
 * A debug sink that writes store values to the file system
 * Writes the current value of the store to "assistant.debug.txt"
 */
export class FileSystemDebugSink {
  public static writeToFile(filePath: string, value: any): void {
    writeFileSync(filePath, JSON.stringify(value, null, 2));
  }
}
