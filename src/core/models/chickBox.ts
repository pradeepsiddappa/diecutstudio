// Chick Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// A small feather tuft on top + a yellow chick face with a beak. Easter favor.
// Same body / lid / fold as the bunny.

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, tri, oval, disc,
} from "./animalBox";

export type ChickBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  body: "#f8d44e", eyes: "#2b2622", beak: "#ef9a3a", cheeks: "#f6b06a",
};

export const chickSpec: AnimalSpec = {
  earW: (L) => L * 0.12,                                   // tuft half-width
  earH: (H) => clamp(H * 0.3, mmToPt(9), H * 0.5),
  earCentres: (L, H) => [H + L * 0.5, H + L * 0.5],        // central tuft

  // a small 3-feather tuft at the top centre (flat top either side)
  drawEars: ({ Ln }, g) => {
    const { X1, L, Y0, earW, earH, X2 } = g;
    const cx = X1 + L / 2, tw = earW;
    Ln(cx - tw, Y0);
    Ln(cx - tw * 0.5, Y0 - earH * 0.7); Ln(cx - tw * 0.2, Y0 - earH * 0.3);
    Ln(cx, 0);
    Ln(cx + tw * 0.2, Y0 - earH * 0.3); Ln(cx + tw * 0.5, Y0 - earH * 0.7);
    Ln(cx + tw, Y0);
    Ln(X2, Y0);
  },

  decorations: (g) => {
    const { L, H, Y0, earW, earH, cx } = g;
    const eyeY = Y0 + H * 0.4, beakY = Y0 + H * 0.56;
    return [
      // yellow body: a big rounded face patch + a fill on the tuft
      { id: "body", label: "Body", color: FACE_COLORS.body, shapes: [
          oval(cx, Y0 + H * 0.5, L * 0.46, H * 0.46),
          tri([cx - earW, Y0 + H * 0.02], [cx + earW, Y0 + H * 0.02], [cx, Y0 - earH * 0.8]),
        ] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(cx - L * 0.13, eyeY, L * 0.08), disc(cx + L * 0.13, eyeY, L * 0.08),
        ] },
      { id: "beak", label: "Beak", color: FACE_COLORS.beak, shapes: [
          tri([cx - L * 0.08, beakY], [cx + L * 0.08, beakY], [cx, beakY + L * 0.13]),
        ] },
      { id: "cheeks", label: "Cheeks", color: FACE_COLORS.cheeks, shapes: [
          disc(cx - L * 0.26, beakY - L * 0.02, L * 0.08), disc(cx + L * 0.26, beakY - L * 0.02, L * 0.08),
        ] },
    ];
  },
};

export function buildChickBox(p: ChickBoxParams): Dieline {
  return buildAnimalBox(p, chickSpec);
}
