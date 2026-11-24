"use client";

import { useState } from "react";
import {
  ArrowUp01Icon,
  BookOpen01Icon,
  ChromeIcon,
  HelpCircleIcon,
  KeyboardIcon,
  Login01Icon,
  Moon02Icon,
  Shield01Icon,
  SmartPhone01Icon,
  UserAdd01Icon,
  UserSettings01Icon,
} from "@hugeicons/core-free-icons";
import { LoginDialog } from "@/components/login-form/login-form";
import { setTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  Icon,
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuSub,
  MenuSubTrigger,
  MenuSwitch,
  MenuTrigger,
  focusRing,
} from "./base-thread-shell";
import { GuestAvatar, useGuest } from "./guest";
import { SettingsDialog, type SettingsSection } from "./settings-dialog";

/*
 * The account at the foot of the sidebar. Signed out, it is a guest; the menu
 * offers the account's places, the theme, help, and a way to sign in. The
 * settings and the sign-in form open from here as dialogs.
 */
export function NavUser() {
  const guest = useGuest();
  const { dark } = useTheme();
  const [signingIn, setSigningIn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [section, setSection] = useState<SettingsSection>("profile");

  const openSettings = (next: SettingsSection) => {
    setSection(next);
    setSettingsOpen(true);
  };

  return (
    <>
      <Menu>
        <MenuTrigger
          className={cn(
            "hover:bg-foreground/[0.06] data-popup-open:bg-foreground/[0.06] flex h-10 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-start transition-colors motion-reduce:transition-none",
            focusRing,
          )}
        >
          <GuestAvatar guest={guest} />
          <span className="flex min-w-0 flex-1 flex-col leading-4">
            <span className="truncate">{guest.name}</span>
            <span className="text-muted-foreground text-xs">Guest</span>
          </span>
          <Icon
            icon={ArrowUp01Icon}
            className="text-muted-foreground size-4 shrink-0"
          />
        </MenuTrigger>
        <MenuPopup side="top" align="start" className="min-w-60">
          <MenuItem>
            <Icon icon={UserAdd01Icon} />
            Invite a friend
          </MenuItem>

          <MenuItem onClick={() => openSettings("profile")}>
            <Icon icon={UserSettings01Icon} />
            Profile settings
          </MenuItem>
          <MenuSwitch
            checked={dark}
            onCheckedChange={(next) => setTheme(next ? "dark" : "light")}
          >
            <Icon icon={Moon02Icon} />
            Dark mode
          </MenuSwitch>
          <MenuSub>
            <MenuSubTrigger>
              <Icon icon={HelpCircleIcon} />
              Help
            </MenuSubTrigger>
            <MenuPopup side="right" sideOffset={6} alignOffset={-4}>
              <MenuItem>
                <Icon icon={SmartPhone01Icon} />
                Set up mobile
              </MenuItem>
              <MenuItem>
                <Icon icon={ChromeIcon} />
                Set up Chrome extension
              </MenuItem>
              <MenuItem onClick={() => openSettings("shortcuts")}>
                <Icon icon={KeyboardIcon} />
                Keyboard shortcuts
              </MenuItem>
              <MenuItem>
                <Icon icon={BookOpen01Icon} />
                User guide
              </MenuItem>
              <MenuItem>
                <Icon icon={Shield01Icon} />
                Privacy center
              </MenuItem>
            </MenuPopup>
          </MenuSub>
          <MenuSeparator />
          <MenuItem onClick={() => setSigningIn(true)}>
            <Icon icon={Login01Icon} />
            Sign in
          </MenuItem>
        </MenuPopup>
      </Menu>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        section={section}
        onSectionChange={setSection}
        onSignIn={() => {
          setSettingsOpen(false);
          setSigningIn(true);
        }}
      />
      <LoginDialog open={signingIn} onOpenChange={setSigningIn} />
    </>
  );
}
