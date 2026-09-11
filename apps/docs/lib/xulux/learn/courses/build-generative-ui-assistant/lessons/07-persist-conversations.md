# Add conversations that persist

This stage turns one conversation into an application with multiple browser-persisted threads.

Distinguish the core concepts:

- a message belongs to a conversation;
- a thread identifies that conversation;
- thread-list metadata makes conversations listable and nameable;
- thread history restores the messages and interactive state inside a conversation.

The page now renders an application shell with responsive thread navigation and New Chat. The runtime combines assistant-ui’s public thread-list and history adapter interfaces with a small application-owned browser-storage adapter, so the downloadable project works without registration or a hosted persistence service.

Ask the learner to create separate weather and writing conversations, switch between them, reload the page, and confirm that the correct history returns. Mention Assistant Cloud only as a managed alternative.
