import { Checkbox } from "@base-ui/react/checkbox";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { useId } from "react";
import { PHOSPHORS, useSettings, type Phosphor, type Settings } from "../../core/settings";
import { setSound } from "../sound/sound";
import "./controls.css";

const PHOSPHOR_NAMES: Record<Phosphor, string> = { green: "Green", amber: "Amber", white: "White" };
const EFFECTS: readonly { key: "scanlines" | "glow" | "flicker"; label: string }[] = [
  { key: "scanlines", label: "Scanlines" },
  { key: "glow", label: "Glow" },
  { key: "flicker", label: "Flicker" },
];

/** One setting as a labelled checkbox, bound to the settings store. */
export function SettingToggle({ setting, label }: { setting: keyof Omit<Settings, "phosphor" | "sound">; label: string }) {
  const checked = useSettings((state) => state[setting]);
  const set = useSettings((state) => state.set);
  return (
    <label className="ctl-opt">
      <Checkbox.Root checked={checked} onCheckedChange={(value) => set(setting, value)} className="ctl-box">
        <Checkbox.Indicator />
      </Checkbox.Root>
      {label}
    </label>
  );
}

/**
 * The Phosphor setting: its dim label and the radios (Green, Amber, White). A fragment of two cells, for the two-column grid both the
 * desktop's Control Panel and the phone's sheet lay their settings out in.
 */
export function PhosphorSetting() {
  const phosphor = useSettings((state) => state.phosphor);
  const set = useSettings((state) => state.set);
  const id = useId();
  return (
    <>
      <span id={id} className="ctl-label">
        Phosphor
      </span>
      <RadioGroup value={phosphor} onValueChange={(value) => set("phosphor", value as Phosphor)} aria-labelledby={id} className="ctl-opts">
        {PHOSPHORS.map((name) => (
          <label key={name} className="ctl-opt">
            <Radio.Root value={name} className="ctl-box" data-radio="">
              <Radio.Indicator />
            </Radio.Root>
            {PHOSPHOR_NAMES[name]}
          </label>
        ))}
      </RadioGroup>
    </>
  );
}

/** The Effects setting: its dim label and the checkboxes (Scanlines, Glow, Flicker). Two grid cells, as `PhosphorSetting`. */
export function EffectsSetting() {
  const id = useId();
  return (
    <>
      <span id={id} className="ctl-label">
        Effects
      </span>
      <div role="group" aria-labelledby={id} className="ctl-opts">
        {EFFECTS.map((effect) => (
          <SettingToggle key={effect.key} setting={effect.key} label={effect.label} />
        ))}
      </div>
    </>
  );
}

/**
 * The Sound setting: its dim label and one checkbox, On. Two grid cells, as `PhosphorSetting`. Turning it on plays a click (the first
 * sound, and what makes the audio context, in this very click); it is off until then, and saved with the other settings.
 */
export function SoundSetting() {
  const id = useId();
  const sound = useSettings((state) => state.sound);
  return (
    <>
      <span id={id} className="ctl-label">
        Sound
      </span>
      <div role="group" aria-labelledby={id} className="ctl-opts">
        <label className="ctl-opt">
          <Checkbox.Root checked={sound} onCheckedChange={setSound} className="ctl-box">
            <Checkbox.Indicator />
          </Checkbox.Root>
          On
        </label>
      </div>
    </>
  );
}
