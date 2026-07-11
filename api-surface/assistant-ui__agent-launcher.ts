interface LaunchOptions {
  pluginDir: string;
  skillName?: string;
  prompt: string;
  dry?: boolean;
}

declare namespace entry_root_exports {
  export { LaunchOptions, launch };
}

declare function launch(options: LaunchOptions): void;

export { entry_root_exports as entry_root };
