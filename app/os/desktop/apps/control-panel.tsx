import { Checkbox } from "@base-ui/react/checkbox";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { PHOSPHORS, useSettings, type Phosphor, type Settings } from "../../../core/settings";
import { useId } from "react";
import "./apps.css";

const PHOSPHOR_NAMES: Record<Phosphor, string> = { green: "Green", amber: "Amber", white: "White" };
const EFFECTS: readonly { key: "scanlines" | "glow" | "flicker"; label: string }[] = [
  { key: "scanlines", label: "Scanlines" },
  { key: "glow", label: "Glow" },
  { key: "flicker", label: "Flicker" },
];

function Toggle({ setting, label }: { setting: keyof Omit<Settings, "phosphor">; label: string }) {
  const checked = useSettings((state) => state[setting]);
  const set = useSettings((state) => state.set);
  return (
    <label className="app-opt">
      <Checkbox.Root checked={checked} onCheckedChange={(value) => set(setting, value)} className="app-box">
        <Checkbox.Indicator />
      </Checkbox.Root>
      {label}
    </label>
  );
}

/** The Control Panel: the phosphor (radios) and the effects (checkboxes), bound to the settings store. */
export function ControlPanel() {
  const phosphor = useSettings((state) => state.phosphor);
  const set = useSettings((state) => state.set);
  const [phosphorId, effectsId, desktopId] = [useId(), useId(), useId()];
  return (
    <div className="app-cp">
      <span id={phosphorId} className="app-dim">
        Phosphor
      </span>
      <RadioGroup value={phosphor} onValueChange={(value) => set("phosphor", value as Phosphor)} aria-labelledby={phosphorId} className="app-opts">
        {PHOSPHORS.map((name) => (
          <label key={name} className="app-opt">
            <Radio.Root value={name} className="app-box" data-radio="">
              <Radio.Indicator />
            </Radio.Root>
            {PHOSPHOR_NAMES[name]}
          </label>
        ))}
      </RadioGroup>
      <span id={effectsId} className="app-dim">
        Effects
      </span>
      <div role="group" aria-labelledby={effectsId} className="app-opts">
        {EFFECTS.map((effect) => (
          <Toggle key={effect.key} setting={effect.key} label={effect.label} />
        ))}
      </div>
      <span id={desktopId} className="app-dim">
        Desktop
      </span>
      <div role="group" aria-labelledby={desktopId} className="app-opts">
        <Toggle setting="dither" label="Dither pattern" />
      </div>
    </div>
  );
}
