// Bear Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// Round ears at the top corners + a bear face: inner-ear circles, a light round
// muzzle, eyes, a dark nose and a mouth. Same body / lid / fold as the bunny.

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, disc,
} from "./animalBox";

export type BearBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  ears: "#c9966a", muzzle: "#ead9c6", eyes: "#2b2622", nose: "#3f3128", mouth: "#6b5444",
};

export const bearSpec: AnimalSpec = {
  earW: (L) => L * 0.18,                                   // wide
  earH: (H) => clamp(H * 0.34, mmToPt(11), H * 0.6),       // short → round bump
  earCentres: (L, H) => [H + L * 0.24, H + L * 0.76],      // top corners

  // round dome ears (two quadratics rounding up over the top, tip at y=0)
  drawEars: ({ Ln, Q }, g) => {
    const { Y0, earW, xL, xR, X2 } = g;
    Ln(xL - earW, Y0);
    Q(xL - earW, 0, xL, 0); Q(xL + earW, 0, xL + earW, Y0); // left round ear
    Ln(xR - earW, Y0);
    Q(xR - earW, 0, xR, 0); Q(xR + earW, 0, xR + earW, Y0); // right round ear
    Ln(X2, Y0);
  },

  decorations: (g) => {
    const { L, H, Y0, earW, earH, xL, xR, cx } = g;
    const eyeR = L * 0.05;
    const eyeY = Y0 + H * 0.30, muzzleY = Y0 + H * 0.62, noseY = Y0 + H * 0.52;
    const stroke = Math.max(mmToPt(0.6), L * 0.012);
    return [
      { id: "ears", label: "Inner ears", color: FACE_COLORS.ears, shapes: [
          disc(xL, Y0 - earH * 0.4, earW * 0.9), disc(xR, Y0 - earH * 0.4, earW * 0.9),
        ] },
      { id: "muzzle", label: "Muzzle", color: FACE_COLORS.muzzle, shapes: [disc(cx, muzzleY, L * 0.52)] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(cx - L * 0.16, eyeY, eyeR * 2), disc(cx + L * 0.16, eyeY, eyeR * 2),
        ] },
      { id: "nose", label: "Nose", color: FACE_COLORS.nose, shapes: [disc(cx, noseY, L * 0.13)] },
      { id: "mouth", label: "Mouth", color: FACE_COLORS.mouth, stroke: true, strokeWidth: stroke, shapes: [
          { pts: [[cx, noseY + L * 0.07], [cx, muzzleY + L * 0.04]], closed: false },                          // stem
          { pts: [[cx - L * 0.1, muzzleY + L * 0.04], [cx + L * 0.1, muzzleY + L * 0.04]], closed: false, curves: [[cx, muzzleY + L * 0.11]] }, // smile
        ] },
    ];
  },
};

export function buildBearBox(p: BearBoxParams): Dieline {
  return buildAnimalBox(p, bearSpec);
}
