export * from "./codec.js";
export * from "./errors.js";
export * from "./messages.js";
export * from "./channel.js";
export * from "./focus.js";
export {
  isInitializeRequest,
  isInitializeResponse,
  validateFromHost,
  validateFromRemote,
  messageValidator,
  hostNotificationSchema,
  remoteNotificationSchema,
  hostMethodSchema,
  remoteMethodSchema,
} from "./validate.js";

/** Channel as seen from the host. */
export type HostChannel = import("./channel.js").Channel<
  import("./messages.js").HostNotifications,
  import("./messages.js").RemoteNotifications,
  import("./messages.js").RemoteMethods,
  import("./messages.js").HostMethods
>;
/** Channel as seen from the remote. */
export type RemoteChannel = import("./channel.js").Channel<
  import("./messages.js").RemoteNotifications,
  import("./messages.js").HostNotifications,
  import("./messages.js").HostMethods,
  import("./messages.js").RemoteMethods
>;
