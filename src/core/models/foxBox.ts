// Fox Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// Tall pointed ears leaning slightly outward + a fox face: orange inner ears,
// an orange face patch, a white snout, eyes and a dark nose. Same body / lid /
// fold as the bunny. (The box is white paperboard; the orange face patch + white
// snout are PRINTED so it reads as a fox.)

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, tri, disc,
} from "./animalBox";

export type FoxBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  ears: "#d8702f", face: "#e8915a", snout: "#faf4ee", eyes: "#241f1c", nose: "#2a221e",
};

export const foxSpec: AnimalSpec = {
  earW: (L) => L * 0.15,
  earH: (H) => clamp(H * 0.9, mmToPt(14), H * 1.6),        // tall pointed
  earCentres: (L, H) => [H + L * 0.2, H + L * 0.8],        // top corners

  // pointed triangles, tips leaning outward
  drawEars: ({ Ln }, g) => {
    const { Y0, earW, xL, xR, X2 } = g;
    Ln(xL - earW, Y0); Ln(xL - earW * 0.35, 0); Ln(xL + earW, Y0);  // left ear (tip leans out-left)
    Ln(xR - earW, Y0); Ln(xR + earW * 0.35, 0); Ln(xR + earW, Y0);  // right ear (tip leans out-right)
    Ln(X2, Y0);
  },

  decorations: (g) => {
    const { L, H, X1, X2, Y0, earW, earH, xL, xR, cx } = g;
    const eyeR = L * 0.045;
    const topY = Y0 + H * 0.05, chinY = Y0 + H * 0.95;
    const eyeY = Y0 + H * 0.36, noseY = chinY - L * 0.05;
    // orange inner-ear triangle
    const innerEar = (x: number, lean: number) => tri([x - earW * 0.45, Y0 - earH * 0.04], [x + earW * 0.45, Y0 - earH * 0.04], [x + lean, Y0 - earH * 0.72]);
    return [
      { id: "ears", label: "Inner ears", color: FACE_COLORS.ears, shapes: [
          innerEar(xL, -earW * 0.25), innerEar(xR, earW * 0.25),
        ] },
      // big orange face patch (inverted triangle) — the fox's orange
      { id: "face", label: "Face patch", color: FACE_COLORS.face, shapes: [
          tri([X1 + L * 0.08, topY], [X2 - L * 0.08, topY], [cx, chinY]),
        ] },
      // white snout/chin on top of the orange
      { id: "snout", label: "Snout", color: FACE_COLORS.snout, shapes: [
          tri([cx - L * 0.24, Y0 + H * 0.52], [cx + L * 0.24, Y0 + H * 0.52], [cx, chinY]),
        ] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(cx - L * 0.17, eyeY, eyeR * 2), disc(cx + L * 0.17, eyeY, eyeR * 2),
        ] },
      { id: "nose", label: "Nose", color: FACE_COLORS.nose, shapes: [
          tri([cx - L * 0.06, noseY - L * 0.05], [cx + L * 0.06, noseY - L * 0.05], [cx, noseY + L * 0.04]),
        ] },
    ];
  },
};

export function buildFoxBox(p: FoxBoxParams): Dieline {
  return buildAnimalBox(p, foxSpec);
}
