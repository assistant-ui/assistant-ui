interface LaunchOptions {
  pluginDir: string;
  skillName?: string;
  prompt: string;
  dry?: boolean;
}

declare function launch(options: LaunchOptions): void;

declare namespace entry_root_exports {
  export { LaunchOptions, launch };
}

export { entry_root_exports as entry_root };
