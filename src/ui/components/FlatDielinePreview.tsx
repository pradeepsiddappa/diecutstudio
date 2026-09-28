// Renders the real flat dieline as an SVG, scaled to fit its container.
// Uses the production tuckEnd geometry (the same one the editor exports), so
// the landing's "cut file" preview is literally what the engine produces —
// not a separate illustration that could drift.
import { useMemo } from "react";
import { buildTuckEnd, defaultParams } from "../../core/models/tuckEnd";
import { LAYER_STYLES } from "../../core/types";
import { toSvgPath } from "../../core/geometry";
import { inToPt } from "../../core/units";

interface Props {
  L?: number;     // inches
  W?: number;
  H?: number;
  className?: string;
}

export function FlatDielinePreview({ L = 4.7244, W = 2.3622, H = 6.2992, className }: Props) {
  const die = useMemo(
    () => buildTuckEnd({ ...defaultParams(inToPt(L), inToPt(W), inToPt(H)), bleed: 0 }),
    [L, W, H]
  );
  // Add a tiny pad so strokes don't clip at the viewBox edge
  const pad = 6;
  const vbW = die.widthPt + 2 * pad;
  const vbH = die.heightPt + 2 * pad;

  return (
    <svg
      className={className}
      viewBox={`${-pad} ${-pad} ${vbW} ${vbH}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", maxWidth: "100%", maxHeight: "100%" }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* draw in z-order: glue hatch, crease, cut */}
      {(["glue", "crease", "cut"] as const).map((layer) =>
        die.paths[layer].map((pl, i) => {
          const s = LAYER_STYLES[layer];
          return (
            <path
              key={`${layer}-${i}`}
              d={toSvgPath(pl)}
              fill="none"
              stroke={s.color}
              strokeWidth={1.5}
              strokeDasharray={s.dash?.join(" ")}
              strokeLinejoin="round"
            />
          );
        })
      )}
    </svg>
  );
}
