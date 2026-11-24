"use client";

import {
  Add01Icon,
  ArrowTurnBackwardIcon,
  Image01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { DEFAULTS, SETTINGS, useOptions, type Setting } from "./state";
import {
  Icon,
  Menu,
  MenuChoice,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuSeparator,
  MenuSub,
  MenuSubTrigger,
  MenuTrigger,
  RatioGlyph,
  Tip,
  iconButton,
} from "./ui";

/* -------------------------------------------------------------------------- */
/* The plus menu: pictures to start from, then the settings of the next one   */
/* -------------------------------------------------------------------------- */

/* The plus turns to a cross while its menu is open, and carries a dot once a setting has been changed. */
export function AddMenu({ onAddImages }: { onAddImages: () => void }) {
  const { settings, resetSettings } = useOptions();
  const changed = SETTINGS.some(
    (setting) => settings[setting.key] !== DEFAULTS[setting.key],
  );

  return (
    <Menu>
      <Tip label="Add images and settings" side="top">
        <MenuTrigger className={cn(iconButton, "group relative size-9")}>
          <Icon
            icon={Add01Icon}
            className="size-5 transition-transform duration-200 ease-out group-aria-expanded:rotate-45 motion-reduce:transition-none"
          />
          {changed && (
            <span
              aria-hidden
              className="bg-foreground absolute end-1.5 top-1.5 size-1.5 rounded-full"
            />
          )}
        </MenuTrigger>
      </Tip>
      <MenuPopup side="top" className="min-w-60">
        <MenuItem onClick={onAddImages}>
          <Icon icon={Image01Icon} />
          Add images
        </MenuItem>
        <MenuSeparator />
        {SETTINGS.map((setting) => (
          <SettingRow key={setting.key} setting={setting} />
        ))}
        <MenuSeparator />
        <MenuItem disabled={!changed} onClick={resetSettings}>
          <Icon icon={ArrowTurnBackwardIcon} />
          Reset settings
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

/* One setting: its name and what is chosen, opening its choices beside it. The menu stays open so several can be set in one visit. */
function SettingRow({ setting }: { setting: Setting }) {
  const { settings, setSetting } = useOptions();
  const value = settings[setting.key];
  const chosen = setting.choices.find((choice) => choice.value === value);
  // With no orientation chosen, the model picks the size along with the shape.
  // Several pictures arrive together, so there are no partial ones to show.
  const held =
    setting.key === "size" && settings.orientation === "auto"
      ? "Auto"
      : setting.key === "partials" && settings.count !== "1"
        ? "Off"
        : undefined;

  return (
    <MenuSub>
      <MenuSubTrigger
        disabled={held !== undefined}
        value={held ?? chosen?.label ?? ""}
      >
        {setting.label}
      </MenuSubTrigger>
      <MenuPopup
        side="inline-end"
        align="start"
        sideOffset={4}
        className="min-w-44"
      >
        <MenuRadioGroup
          value={value}
          onValueChange={(next: string) => setSetting(setting.key, next)}
        >
          {setting.choices.map((choice) => (
            <MenuChoice
              key={choice.value}
              value={choice.value}
              closeOnClick={false}
              // A JPEG has no transparency.
              disabled={
                choice.value === "transparent" && settings.format === "jpeg"
              }
            >
              {choice.shape && <RatioGlyph shape={choice.shape} />}
              {choice.label}
              {choice.note && (
                <span className="text-muted-foreground">{choice.note}</span>
              )}
            </MenuChoice>
          ))}
        </MenuRadioGroup>
      </MenuPopup>
    </MenuSub>
  );
}
