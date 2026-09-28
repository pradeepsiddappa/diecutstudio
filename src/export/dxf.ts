// Export a Dieline to DXF (AutoCAD R12 / AC1009) at exact physical size.
//
// Coordinates are written in MILLIMETERS with $INSUNITS=4, which is what
// Silhouette Studio's DXF import expects, so the die opens at true size and is
// ready to cut. Each contour is a POLYLINE on a named layer (CUT/CREASE),
// which keeps cut and fold lines separable. DXF has a y-up origin, so y is
// flipped relative to the screen.

import { Dieline, LayerKind, Polyline } from "../core/types";
import { flattenPolyline } from "../core/geometry";

const MM_PER_PT = 25.4 / 72;

// DXF aci color indices per layer
const LAYER_COLOR: Record<string, number> = {
  CUT: 5, // blue
  CREASE: 1, // red
};

export interface DxfOptions {
  includeCrease?: boolean;
}

export function dielineToDxf(die: Dieline, opts: DxfOptions = {}): string {
  const { includeCrease = true } = opts;
  const b = die.bleedPt;
  const bboxH = die.heightPt;

  // transform point (pt, y-down) -> (mm, y-up), shifted so all coords >= 0
  const tx = (x: number) => num((x + b) * MM_PER_PT);
  const ty = (y: number) => num((bboxH + b - y) * MM_PER_PT);

  // No BLEED layer — a die-cut file's only real cut is the trim line; the bleed
  // margin is implicit in the geometry's offset, not a separate contour.
  const layers: { name: string; src: LayerKind }[] = [{ name: "CUT", src: "cut" }];
  if (includeCrease) layers.push({ name: "CREASE", src: "crease" });

  const out: string[] = [];
  const w = (code: number | string, value: number | string) => {
    out.push(String(code));
    out.push(String(value));
  };

  // ---- HEADER ----
  w(0, "SECTION");
  w(2, "HEADER");
  w(9, "$ACADVER"); w(1, "AC1009");
  w(9, "$INSUNITS"); w(70, 4); // 4 = millimeters
  w(0, "ENDSEC");

  // ---- TABLES (layer definitions) ----
  w(0, "SECTION");
  w(2, "TABLES");
  w(0, "TABLE");
  w(2, "LAYER");
  w(70, layers.length);
  for (const l of layers) {
    w(0, "LAYER");
    w(2, l.name);
    w(70, 0);
    w(62, LAYER_COLOR[l.name]);
    w(6, "CONTINUOUS");
  }
  w(0, "ENDTAB");
  w(0, "ENDSEC");

  // ---- ENTITIES ----
  w(0, "SECTION");
  w(2, "ENTITIES");
  for (const l of layers) {
    // DXF R12 has no native curve primitive — flatten any bezier segments to
    // line segments before emitting the POLYLINE entity.
    for (const pl of die.paths[l.src]) writePolyline(flattenPolyline(pl), l.name);
  }
  w(0, "ENDSEC");
  w(0, "EOF");

  function writePolyline(pl: Polyline, layer: string) {
    if (pl.pts.length === 0) return;
    const color = LAYER_COLOR[layer];
    w(0, "POLYLINE");
    w(8, layer);
    w(62, color); // explicit entity color so "Cut by Line Color" can map it
    w(66, 1); // vertices follow
    w(70, pl.closed ? 1 : 0); // 1 = closed
    for (const [x, y] of pl.pts) {
      w(0, "VERTEX");
      w(8, layer);
      w(62, color);
      w(10, tx(x));
      w(20, ty(y));
    }
    w(0, "SEQEND");
    w(8, layer);
  }

  return out.join("\r\n") + "\r\n";
}

const num = (n: number) => Number(n.toFixed(4));
