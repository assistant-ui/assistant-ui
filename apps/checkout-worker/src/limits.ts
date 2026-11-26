// The worker entry may export only handlers and Durable Object classes:
// workerd refuses to start a module with any other named export, which broke
// `wrangler dev`. The limits live here so tests can import them.

/** How stale the stored last-activity time may get before it is rewritten. */
export const ACTIVITY_WRITE_MS = 60 * 60 * 1000;
/**
 * A setup is deleted this long after its stored last-activity time, with no
 * open socket. The stored time can lag the last request by up to
 * `ACTIVITY_WRITE_MS`, so the deadline adds that much: a setup always gets at
 * least 24 hours with no request and no open socket.
 */
export const ROOM_IDLE_MS = 24 * 60 * 60 * 1000 + ACTIVITY_WRITE_MS;
/**
 * A link that still holds no setup this long after its recorded activity is
 * deleted. The agent's CLI creates the setup the moment it opens a new link,
 * so only a link nobody set up stays empty.
 */
export const EMPTY_ROOM_IDLE_MS = 10 * 60 * 1000;
/** The largest statewire command a client may send, over HTTP or a socket. */
export const MAX_MESSAGE_BYTES = 256 * 1024;
