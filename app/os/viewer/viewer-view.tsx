import { useEffect, useRef } from "react";
import { projectBySlug } from "../../core/projects";
import type { FullScreenApi } from "../shell/full-screen";
import { KeyBar } from "../shell/key-bar";
import { Picture } from "./picture";
import { usePictures } from "./use-pictures";
import "./viewer.css";

/**
 * `view <project>`, full screen in the shell: the name and the count (`2 of 3`) set in the border, the picture scaled to fit with
 * its caption right under it, and a key bar. h or ←, l or →, q or Esc.
 */
export function ViewerView({ api, slug }: { api: FullScreenApi; slug: string }) {
  const project = projectBySlug(slug);
  const { pictures, index, shot, hasPrevious, hasNext, go } = usePictures(slug);

  const keys = (key: string): boolean => {
    if (key === "ArrowLeft" || key === "h") go(-1);
    else if (key === "ArrowRight" || key === "l") go(1);
    else if (key === "q" || key === "Escape") api.close();
    else return false;
    return true;
  };
  const latest = useRef(keys);
  useEffect(() => {
    latest.current = keys;
  });
  useEffect(() => api.onKey((key) => latest.current(key)), [api]);

  if (!project || !shot) return null;
  return (
    <div className="sh-full">
      <div className="sh-pane vw-pane">
        <span className="sh-pt">{project.name}</span>
        <span className="sh-pt sh-pt-right">{`${index + 1} of ${pictures.length}`}</span>
        <div className="vw-vbox">
          <Picture shot={shot} className="vw-img" />
          <div className="vw-vcap" aria-hidden="true">
            {shot.alt}
          </div>
        </div>
      </div>
      <KeyBar
        keys={[
          { key: "h", label: "prev", send: "h", off: !hasPrevious },
          { key: "l", label: "next", send: "l", off: !hasNext },
          { key: "q", label: "quit", send: "q" },
        ]}
        onKey={keys}
      />
    </div>
  );
}
