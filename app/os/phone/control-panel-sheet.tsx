import { useId } from "react";
import { EffectsSetting, PhosphorSetting } from "../controls/settings-controls";
import { Glyph } from "../icons/icon";
import { Dialog } from "./dialog";

/**
 * The Control Panel on a phone: a modal dialog showing a window docked at the bottom, its title bar in inverse video with a close box,
 * and the desktop's Phosphor and Effects settings in 44px rows (a phone has no desktop to dither). The page behind is dimmed by a 1-bit
 * dither; a tap on it, Esc, Android's back gesture and the close box call `onClose`, which unmounts it. The choices are the settings
 * store's, so they hold on both layouts. It opens and goes at once, as a window does.
 */
export function ControlPanelSheet({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  return (
    <Dialog onClose={onClose} labelledBy={titleId} initialFocus='[role="radio"][aria-checked="true"]' dismissOnBackdrop className="dlg-sheet">
      <div className="dlg-window">
        <div className="dlg-tb inverse">
          <h2 id={titleId}>Control Panel</h2>
          <button type="button" className="dlg-x" aria-label="Close" onClick={onClose}>
            <span>
              <Glyph name="x" scale={2} />
            </span>
          </button>
        </div>
        <div className="dlg-cp">
          <PhosphorSetting />
          <EffectsSetting />
        </div>
      </div>
    </Dialog>
  );
}
