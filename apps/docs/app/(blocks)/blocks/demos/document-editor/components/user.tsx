"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import {
  ArrowUp01Icon,
  BookOpen01Icon,
  ChromeIcon,
  HelpCircleIcon,
  Login01Icon,
  Moon02Icon,
  Shield01Icon,
  SmartPhone01Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import {
  BookOpenIcon,
  ChevronUpIcon,
  CircleHelpIcon,
  GlobeIcon,
  LogInIcon,
  MoonIcon,
  ShieldIcon,
  SmartphoneIcon,
  UserPlusIcon,
} from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PROFILE } from "../lib/document";
import {
  Avatar,
  Icon,
  Menu,
  MenuContent,
  MenuItem,
  menuRowClass,
  MenuSeparator,
  MenuTrigger,
  radius,
  SubMenu,
  SubMenuContent,
  SubMenuTrigger,
  text,
  type Glyph,
} from "./ui";

const glyphs = {
  open: { huge: ArrowUp01Icon, lucide: ChevronUpIcon },
  invite: { huge: UserAdd01Icon, lucide: UserPlusIcon },
  dark: { huge: Moon02Icon, lucide: MoonIcon },
  help: { huge: HelpCircleIcon, lucide: CircleHelpIcon },
  mobile: { huge: SmartPhone01Icon, lucide: SmartphoneIcon },
  browser: { huge: ChromeIcon, lucide: GlobeIcon },
  guide: { huge: BookOpen01Icon, lucide: BookOpenIcon },
  privacy: { huge: Shield01Icon, lucide: ShieldIcon },
  signIn: { huge: Login01Icon, lucide: LogInIcon },
} satisfies Record<string, Glyph>;

/* The page's own light or dark, read from the class on <html>. */
const subscribeToTheme = (listener: () => void) => {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributeFilter: ["class"] });
  return () => observer.disconnect();
};
const isDark = () => document.documentElement.classList.contains("dark");

function setDark(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
}

/** A menu row with a switch at its end, which stays open when flipped. */
function MenuSwitch({
  checked,
  onCheckedChange,
  children,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <BaseMenu.CheckboxItem
      checked={checked}
      onCheckedChange={onCheckedChange}
      closeOnClick={false}
      className={cn(menuRowClass, "group/switch data-highlighted:bg-accent")}
    >
      {children}
      <span
        aria-hidden
        className="bg-foreground/20 group-data-checked/switch:bg-foreground ms-auto flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors motion-reduce:transition-none"
      >
        <span className="bg-background size-3 rounded-full transition-transform group-data-checked/switch:translate-x-3 motion-reduce:transition-none rtl:group-data-checked/switch:-translate-x-3" />
      </span>
    </BaseMenu.CheckboxItem>
  );
}

/**
 * The account at the foot of the sidebar, as in the Base example: a guest,
 * with the account's places, the theme, help and a way to sign in. The
 * places and sign-in are where an app wires its own pages.
 */
export function User() {
  const dark = useSyncExternalStore(subscribeToTheme, isDark, () => false);
  const { name, avatar } = PROFILE.you;

  return (
    <Menu>
      <MenuTrigger
        className={cn(
          radius.sm,
          "hover:bg-accent data-popup-open:bg-accent focus-visible:ring-foreground/20 flex h-10 w-full min-w-0 items-center gap-2 px-2 text-start transition-colors outline-none focus-visible:ring-1 motion-reduce:transition-none",
        )}
      >
        <Avatar src={avatar} name={name} decorative />
        <span className="flex min-w-0 flex-1 flex-col leading-4">
          <span className="truncate">{name}</span>
          <span className={cn("text-muted-foreground", text.small)}>Guest</span>
        </span>
        <Icon {...glyphs.open} className="text-muted-foreground" />
      </MenuTrigger>
      <MenuContent side="top" align="start" className="min-w-60">
        <MenuItem>
          <Icon {...glyphs.invite} />
          Invite a friend
        </MenuItem>
        <MenuSwitch checked={dark} onCheckedChange={setDark}>
          <Icon {...glyphs.dark} />
          Dark mode
        </MenuSwitch>
        <SubMenu>
          <SubMenuTrigger>
            <Icon {...glyphs.help} />
            Help
          </SubMenuTrigger>
          <SubMenuContent>
            <MenuItem>
              <Icon {...glyphs.mobile} />
              Set up mobile
            </MenuItem>
            <MenuItem>
              <Icon {...glyphs.browser} />
              Set up Chrome extension
            </MenuItem>
            <MenuItem>
              <Icon {...glyphs.guide} />
              User guide
            </MenuItem>
            <MenuItem>
              <Icon {...glyphs.privacy} />
              Privacy center
            </MenuItem>
          </SubMenuContent>
        </SubMenu>
        <MenuSeparator />
        <MenuItem>
          <Icon {...glyphs.signIn} />
          Sign in
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
