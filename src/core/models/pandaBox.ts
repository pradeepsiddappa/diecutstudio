// Panda Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// Round ears (filled black) + the panda's signature black eye patches, white
// eyes with pupils, a dark nose and a smile. Same body / lid / fold as the bunny.

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, oval, disc,
} from "./animalBox";

export type PandaBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  fur: "#2b2622", eyes: "#faf6f0", pupils: "#2b2622", nose: "#2b2622", mouth: "#5b5550",
};

export const pandaSpec: AnimalSpec = {
  earW: (L) => L * 0.18,
  earH: (H) => clamp(H * 0.34, mmToPt(11), H * 0.6),       // short → round bump
  earCentres: (L, H) => [H + L * 0.24, H + L * 0.76],

  // round dome ears
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
    const eyeY = Y0 + H * 0.36, noseY = Y0 + H * 0.55, mouthY = Y0 + H * 0.66;
    const stroke = Math.max(mmToPt(0.6), L * 0.012);
    return [
      // black FUR: the two ear fills + the two slanted eye patches
      { id: "fur", label: "Black fur", color: FACE_COLORS.fur, shapes: [
          oval(xL, Y0 - earH * 0.5, earW * 0.82, earH * 0.46),
          oval(xR, Y0 - earH * 0.5, earW * 0.82, earH * 0.46),
          oval(cx - L * 0.19, eyeY, L * 0.13, L * 0.16),
          oval(cx + L * 0.19, eyeY, L * 0.13, L * 0.16),
        ] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(cx - L * 0.19, eyeY + L * 0.01, L * 0.1), disc(cx + L * 0.19, eyeY + L * 0.01, L * 0.1),
        ] },
      { id: "pupils", label: "Pupils", color: FACE_COLORS.pupils, shapes: [
          disc(cx - L * 0.19, eyeY + L * 0.02, L * 0.055), disc(cx + L * 0.19, eyeY + L * 0.02, L * 0.055),
        ] },
      { id: "nose", label: "Nose", color: FACE_COLORS.nose, shapes: [oval(cx, noseY, L * 0.07, L * 0.05)] },
      { id: "mouth", label: "Mouth", color: FACE_COLORS.mouth, stroke: true, strokeWidth: stroke, shapes: [
          { pts: [[cx, noseY + L * 0.05], [cx, mouthY]], closed: false },
          { pts: [[cx - L * 0.1, mouthY], [cx + L * 0.1, mouthY]], closed: false, curves: [[cx, mouthY + L * 0.07]] },
        ] },
    ];
  },
};

export function buildPandaBox(p: PandaBoxParams): Dieline {
  return buildAnimalBox(p, pandaSpec);
}
