// Napkin Ring — Tags & Wraps category.
//
// A belly-band style wrap strip sized to a folded napkin's girth (the distance
// around), with an overlap to close. Two closure styles:
//   glue   — glue-overlap hatch at one end
//   lock   — a trapezoid tab at the far end + matching slot near the near end
//             (tuck-lock, no glue needed; same caliper-aware contract as bellyBand)
//
// Optional SCALLOP top and/or both edges for a decorative look.
//
// FLAT die-cut item (flat:true). Gangs many-up on a sheet (preferSheetExport).
// Cut several from the same or contrasting card, slide over folded napkins.
//
// All geometry in POINTS, top-left origin, y-down. Pure functional geometry.
//
// Dimension semantics:
//   editor L → napkin girth (circumference around)  params.girth
//   editor W → band height                           params.bandW
//   editor H → unused (hidden)

import { Dieline, Polyline } from "../types";
import { Pt, bleedFromCut } from "../geometry";
import { inToPt, mmToPt } from "../units";
import { scallopEdge, slotCut, tabEdgePts, SlotTabSpec } from "../craft";

export type NapkinRingClosure = "glue" | "lock";
export type NapkinRingEdge = "straight" | "scallop-top" | "scallop-both";

export interface NapkinRingParams {
  girth: number;           // distance around the napkin (pt)
  bandW: number;           // band height (pt)
  overlap: number;         // closing overlap (pt)
  closure: NapkinRingClosure;
  edge: NapkinRingEdge;
  scallopR: number;        // target scallop bump radius (pt)
  thickness: number;       // caliper (pt)
  bleed: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function defaultParams(girth: number, bandW: number, thickness = inToPt(0.012)): NapkinRingParams {
  return {
    girth, bandW, thickness,
    overlap: clamp(inToPt(0.875), inToPt(0.5), girth * 0.2),
    closure: "lock",
    edge: "scallop-both",
    scallopR: mmToPt(5),
    bleed: inToPt(0.0625),
  };
}

export function buildNapkinRing(p: NapkinRingParams): Dieline {
  const girth  = Math.max(p.girth, inToPt(2));
  const bandW  = Math.max(p.bandW, mmToPt(12));
  const overlap = clamp(p.overlap, mmToPt(10), girth * 0.25);
  const t      = Math.max(p.thickness, mmToPt(0.4));
  const stripL = girth + overlap;

  // ---- caliper-aware tab/slot spec (lock only) ----
  const tabW = clamp(bandW * 0.55, mmToPt(12), bandW - mmToPt(6));
  const spec: SlotTabSpec = { tabW, depth: mmToPt(9), caliper: t };

  // ---- scallop edge helpers ----
  const topEdge = (x0: number, x1: number): Pt[] =>
    (p.edge === "scallop-top" || p.edge === "scallop-both")
      ? scallopEdge([x0, 0], [x1, 0], { radius: p.scallopR, segments: 14 })
      : [[x0, 0], [x1, 0]];

  const botEdge = (x0: number, x1: number): Pt[] =>
    p.edge === "scallop-both"
      ? scallopEdge([x0, bandW], [x1, bandW], { radius: p.scallopR, segments: 14 })
      : [[x0, bandW], [x1, bandW]];

  const cut: Polyline[] = [];

  if (p.closure === "glue") {
    const tEdge = topEdge(0, stripL);
    const bEdge = botEdge(stripL, 0);
    const pts: Pt[] = [...tEdge, ...[[stripL, bandW] as Pt], ...bEdge, [0, bandW]];
    cut.push({ pts, closed: true });

    const glueX = girth; // overlap zone: girth → stripL
    return {
      paths: {
        cut,
        crease: [],
        bleed: [bleedFromCut(cut[0], p.bleed)],
        glue: [{ pts: [[glueX, 0], [stripL, 0], [stripL, bandW], [glueX, bandW]], closed: true }],
      },
      widthPt: stripL,
      heightPt: bandW,
      bleedPt: p.bleed,
      labels: [],
      dims: [],
    };
  }

  // ---- lock closure (follows the bellyBand pattern exactly) ----
  // Build the outline with a tab spliced into the RIGHT short edge.
  const tEdgeFull = topEdge(0, stripL);
  const bEdgeFull = botEdge(stripL, 0);

  // Build pts manually: top edge left→right, right edge with tab, bottom edge right→left, left edge
  const pts: Pt[] = [...tEdgeFull];
  // Right edge from (stripL,0) to (stripL,bandW) with tab
  for (const q of tabEdgePts([stripL, 0], [stripL, bandW], spec)) pts.push(q);
  pts.push(...bEdgeFull.slice(1)); // bottom right→left (skip dup start)
  pts.push([0, 0]); // close left edge
  cut.push({ pts, closed: true });

  // The receiving slot (vertical) `overlap/2` from the left, centred on bandW.
  cut.push(slotCut(overlap / 2, bandW / 2, spec, Math.PI / 2));

  // Real extent (tab protrudes right of stripL)
  let maxX = -Infinity;
  for (const [x] of cut[0].pts) if (x > maxX) maxX = x;

  return {
    paths: { cut, crease: [], bleed: [bleedFromCut(cut[0], p.bleed)], glue: [] },
    widthPt: Math.max(stripL, maxX),
    heightPt: bandW,
    bleedPt: p.bleed,
    labels: [],
    dims: [],
  };
}
