import { OS_NAME, OS_VERSION } from "../../core/site";
import "./phone.css";

/** The foot of every page: the OS's name and version in the dim tone, under a rule. */
export function PhoneFooter() {
  return (
    <footer className="ph-ft">
      <div className="ph-wrap">
        <p className="text-phosphor-dim">{`${OS_NAME} ${OS_VERSION}`}</p>
      </div>
    </footer>
  );
}
