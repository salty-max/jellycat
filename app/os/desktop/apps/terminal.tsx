import { useCallback } from "react";
import { projectBySlug } from "../../../core/projects";
import type { Line } from "../../../core/shell";
import { Shell, type ShellProps } from "../../shell/shell";
import { useDesktop } from "./context";
import { openProjectReadme } from "./launch";
import "./apps.css";

/**
 * The Terminal: the shell in a window. `open` opens the project's Info window, and `less` (or `more`) on a project's README opens its
 * Readme window; any other file is printed, as `more` prints a file that fits.
 */
export function TerminalApp() {
  const { openProject } = useDesktop();
  const onPage = useCallback<NonNullable<ShellProps["onPage"]>>(({ source }): readonly Line[] => {
    if (source.kind === "lines") return source.lines;
    const project = projectBySlug(source.slug);
    if (!project) return [];
    openProjectReadme(source.slug);
    return [[{ kind: "text", text: `opened ${project.name} Readme` }]];
  }, []);
  return (
    <div className="app-pane">
      <Shell onOpenProject={openProject} onPage={onPage} autoFocus />
    </div>
  );
}
