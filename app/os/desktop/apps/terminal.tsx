import { useCallback } from "react";
import { projectBySlug } from "../../../core/projects";
import type { Line } from "../../../core/shell";
import { loadSamples } from "../../../lab/samples";
import { fullScreenViews } from "../../full-screen-views";
import { Shell, type ShellProps } from "../../shell/shell";
import { useDesktop } from "./context";
import { openLab, openProjectReadme, openViewer } from "./launch";
import "./apps.css";

/**
 * The Terminal: the shell in a window. `open` opens the project's Info window, and `less` (or `more`) on a project's README opens its
 * Readme window; any other file is printed, as `more` prints a file that fits. `view` on a project opens its Screenshots window. `gero` opens the Lab, `gero run <program>` opens it on that program and runs it. `browse` is full screen inside the window.
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
  const onView = useCallback((slug: string): readonly Line[] | null => {
    const project = projectBySlug(slug);
    if (!project) return null;
    openViewer(slug);
    return [[{ kind: "text", text: `opened ${project.name} Screenshots` }]];
  }, []);
  const onOpenLab = useCallback((program: string | null, run: boolean): readonly Line[] => {
    openLab(program === null ? undefined : { program, run });
    return [[{ kind: "text", text: "opened Lab" }]];
  }, []);
  const onLabPrograms = useCallback(async () => (await loadSamples()).map((program) => program.name), []);
  return (
    <div className="app-pane">
      <Shell onOpenProject={openProject} onPage={onPage} onView={onView} onOpenLab={onOpenLab} onLabPrograms={onLabPrograms} fullScreen={fullScreenViews} autoFocus />
    </div>
  );
}
