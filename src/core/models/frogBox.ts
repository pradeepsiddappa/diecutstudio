// Frog Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// The "ears" are the frog's two bulging EYES on top of the head (round bumps),
// with a green face, white eyes + pupils, nostrils and a wide grin. Same body.

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, oval, disc,
} from "./animalBox";

export type FrogBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  skin: "#7cb85f", eyes: "#fbf7ef", pupils: "#2b2622", nostrils: "#4a6e36", mouth: "#3f5e2e",
};

export const frogSpec: AnimalSpec = {
  earW: (L) => L * 0.16,
  earH: (H) => clamp(H * 0.34, mmToPt(11), H * 0.55),       // round eye-bulges
  earCentres: (L, H) => [H + L * 0.31, H + L * 0.69],       // close (but non-overlapping) bulges on top

  // two round bumps (the bulging eyes)
  drawEars: ({ Ln, Q }, g) => {
    const { Y0, earW, xL, xR, X2 } = g;
    Ln(xL - earW, Y0);
    Q(xL - earW, 0, xL, 0); Q(xL + earW, 0, xL + earW, Y0);
    Ln(xR - earW, Y0);
    Q(xR - earW, 0, xR, 0); Q(xR + earW, 0, xR + earW, Y0);
    Ln(X2, Y0);
  },

  decorations: (g) => {
    const { L, H, Y0, earW, earH, xL, xR, cx } = g;
    const mouthY = Y0 + H * 0.66, noseY = Y0 + H * 0.42;
    const stroke = Math.max(mmToPt(0.6), L * 0.014);
    return [
      // green skin: the front-face patch + fills on the two eye-bumps
      { id: "skin", label: "Skin", color: FACE_COLORS.skin, shapes: [
          oval(cx, Y0 + H * 0.46, L * 0.49, H * 0.5),
          disc(xL, Y0 - earH * 0.4, earW * 1.9), disc(xR, Y0 - earH * 0.4, earW * 1.9),
        ] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(xL, Y0 - earH * 0.32, earW * 1.1), disc(xR, Y0 - earH * 0.32, earW * 1.1),
        ] },
      { id: "pupils", label: "Pupils", color: FACE_COLORS.pupils, shapes: [
          disc(xL, Y0 - earH * 0.28, earW * 0.5), disc(xR, Y0 - earH * 0.28, earW * 0.5),
        ] },
      { id: "nostrils", label: "Nostrils", color: FACE_COLORS.nostrils, shapes: [
          disc(cx - L * 0.06, noseY, L * 0.03), disc(cx + L * 0.06, noseY, L * 0.03),
        ] },
      { id: "mouth", label: "Mouth", color: FACE_COLORS.mouth, stroke: true, strokeWidth: stroke, shapes: [
          { pts: [[cx - L * 0.28, mouthY], [cx + L * 0.28, mouthY]], closed: false, curves: [[cx, mouthY + L * 0.16]] },
        ] },
    ];
  },
};

export function buildFrogBox(p: FrogBoxParams): Dieline {
  return buildAnimalBox(p, frogSpec);
}
