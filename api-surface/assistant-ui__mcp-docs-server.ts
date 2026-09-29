declare namespace entry_root_exports {
  export { runProxy, runServer };
}

declare function runProxy(_param0?: {
  url?: URL;
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
}): Promise<void>;

declare function runServer(): Promise<void>;

export { entry_root_exports as entry_root };
