import { Link } from "react-router";
import { STUDIO_NAME } from "../../core/studio";
import { CatIcon, PanelIcon } from "../icons/icon";
import "./phone.css";

/**
 * The phone's header, on every page: the desktop's menu bar, sticky. The cat and the studio's name are a link home; the Control
 * Panel's icon is a button (named, since no label stands beside it) that says it opens a dialog and whether it is open.
 */
export function PhoneHeader({ onOpenPanel, panelOpen = false }: { onOpenPanel: () => void; panelOpen?: boolean }) {
  return (
    <header className="ph-hd">
      <Link to="/" className="ph-brand">
        <CatIcon />
        <span>{STUDIO_NAME}</span>
      </Link>
      <button type="button" className="ph-cpb" aria-label="Control Panel" aria-haspopup="dialog" aria-expanded={panelOpen} onClick={onOpenPanel}>
        <PanelIcon />
      </button>
    </header>
  );
}
