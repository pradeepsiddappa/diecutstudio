// Pig Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// Small triangle ears + the pig's signature snout (a pink oval with two
// nostrils), eyes and a smile. Same body / lid / fold as the bunny.

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, tri, oval, disc,
} from "./animalBox";

export type PigBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  ears: "#eda0b4", eyes: "#2b2622", snout: "#f2a8bb", nostrils: "#7a4a55", mouth: "#7a4a55",
};

export const pigSpec: AnimalSpec = {
  earW: (L) => L * 0.14,                                   // small
  earH: (H) => clamp(H * 0.42, mmToPt(10), H * 0.7),
  earCentres: (L, H) => [H + L * 0.22, H + L * 0.78],

  // small triangles, tips leaning slightly outward (floppy-pig look)
  drawEars: ({ Ln }, g) => {
    const { Y0, earW, xL, xR, X2 } = g;
    Ln(xL - earW, Y0); Ln(xL - earW * 0.4, 0); Ln(xL + earW, Y0);
    Ln(xR - earW, Y0); Ln(xR + earW * 0.4, 0); Ln(xR + earW, Y0);
    Ln(X2, Y0);
  },

  decorations: (g) => {
    const { L, H, Y0, earW, earH, xL, xR, cx } = g;
    const eyeR = L * 0.05;
    const eyeY = Y0 + H * 0.34, snoutY = Y0 + H * 0.6;
    const stroke = Math.max(mmToPt(0.6), L * 0.012);
    const innerEar = (x: number, lean: number) => tri([x - earW * 0.5, Y0 - earH * 0.04], [x + earW * 0.5, Y0 - earH * 0.04], [x + lean, Y0 - earH * 0.66]);
    return [
      { id: "ears", label: "Inner ears", color: FACE_COLORS.ears, shapes: [innerEar(xL, -earW * 0.25), innerEar(xR, earW * 0.25)] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(cx - L * 0.17, eyeY, eyeR * 2), disc(cx + L * 0.17, eyeY, eyeR * 2),
        ] },
      { id: "snout", label: "Snout", color: FACE_COLORS.snout, shapes: [oval(cx, snoutY, L * 0.21, L * 0.15)] },
      { id: "nostrils", label: "Nostrils", color: FACE_COLORS.nostrils, shapes: [
          oval(cx - L * 0.08, snoutY, L * 0.028, L * 0.05), oval(cx + L * 0.08, snoutY, L * 0.028, L * 0.05),
        ] },
      { id: "mouth", label: "Mouth", color: FACE_COLORS.mouth, stroke: true, strokeWidth: stroke, shapes: [
          { pts: [[cx - L * 0.1, snoutY + L * 0.22], [cx + L * 0.1, snoutY + L * 0.22]], closed: false, curves: [[cx, snoutY + L * 0.29]] },
        ] },
    ];
  },
};

export function buildPigBox(p: PigBoxParams): Dieline {
  return buildAnimalBox(p, pigSpec);
}
