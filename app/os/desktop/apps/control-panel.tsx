import { useId } from "react";
import { EffectsSetting, PhosphorSetting, SettingToggle, SoundSetting } from "../../controls/settings-controls";
import "./apps.css";

/** The Control Panel: the phosphor (radios), the effects (checkboxes) and the sound both layouts share, and the desktop's own dither pattern. */
export function ControlPanel() {
  const desktopId = useId();
  return (
    <div className="app-cp">
      <PhosphorSetting />
      <EffectsSetting />
      <span id={desktopId} className="ctl-label">
        Desktop
      </span>
      <div role="group" aria-labelledby={desktopId} className="ctl-opts">
        <SettingToggle setting="dither" label="Dither pattern" />
      </div>
      <SoundSetting />
    </div>
  );
}
