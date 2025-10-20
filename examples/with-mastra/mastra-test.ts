import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

async function testMastraMemory() {
  console.log("Testing Mastra Memory implementation...");

  try {
    // Create memory store for testing
    const memory = new Memory({
      storage: new LibSQLStore({
        url: process.env["LIBSQL_URL"] || "file:./test-mastra.db",
      }),
      options: {
        workingMemory: {
          enabled: true,
        },
        lastMessages: 10,
        semanticRecall: {
          topK: 5,
          messageRange: 2,
          scope: "thread",
        },
      },
    });

    // Test creating a thread
    const threadId = "test-thread-1";
    await memory.createThread({
      threadId,
      resourceId: "test-user",
    });

    console.log("Thread created successfully");

    // Test saving messages
    const testMessages = [
      {
        id: "msg-1",
        threadId,
        role: "user" as const,
        content: "Hello, how are you?",
        type: "text" as const,
        createdAt: new Date(),
        resourceId: "test-user",
      },
      {
        id: "msg-2",
        threadId,
        role: "assistant" as const,
        content: "I'm doing well, thank you for asking!",
        type: "text" as const,
        createdAt: new Date(),
        resourceId: "test-user",
      },
      {
        id: "msg-3",
        threadId,
        role: "user" as const,
        content: "What's the weather like today?",
        type: "text" as const,
        createdAt: new Date(),
        resourceId: "test-user",
      },
      {
        id: "msg-4",
        threadId,
        role: "assistant" as const,
        content: "It's sunny and warm today with temperatures around 75°F.",
        type: "text" as const,
        createdAt: new Date(),
        resourceId: "test-user",
      },
      {
        id: "msg-5",
        threadId,
        role: "user" as const,
        content: "Can you suggest a good recipe for dinner?",
        type: "text" as const,
        createdAt: new Date(),
        resourceId: "test-user",
      },
    ];

    await memory.saveMessages({
      messages: testMessages,
      format: "v1",
    });

    console.log("Messages saved successfully");

    // Test retrieving thread
    const thread = await memory.getThreadById({ threadId });
    console.log("Retrieved thread:", thread);

    // Test querying memory with semantic search
    const results = await memory.query({
      threadId,
      selectBy: {
        vectorSearchString: "hello",
      },
    });

    console.log("Memory query results:", results.uiMessages);
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testMastraMemory();
