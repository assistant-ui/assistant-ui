export function chunkByLineStream() {
  let buffer = "";

  return new TransformStream({
    transform(chunk, controller) {
      buffer += chunk;
      const lines = buffer.split("\n");

      // Process all complete lines
      for (let i = 0; i < lines.length - 1; i++) {
        controller.enqueue(lines[i]);
      }

      // Keep the last incomplete line in the buffer
      buffer = lines[lines.length - 1]!;
    },
    flush(controller) {
      // flush any remaining content in the buffer
      if (buffer) {
        controller.enqueue(buffer);
      }
    },
  });
}
