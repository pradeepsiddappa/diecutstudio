// Owl Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// Two feather-tuft "ears" + the owl's signature big eyes (facial discs + eyes +
// pupils) and a beak. Same body / lid / fold as the bunny.

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, tri, disc,
} from "./animalBox";

export type OwlBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  tufts: "#b98a52", discs: "#e6d2ad", eyes: "#fbf6ec", pupils: "#2b2622", beak: "#e0972f",
};

export const owlSpec: AnimalSpec = {
  earW: (L) => L * 0.13,
  earH: (H) => clamp(H * 0.5, mmToPt(10), H * 0.9),        // pointed tufts
  earCentres: (L, H) => [H + L * 0.18, H + L * 0.82],

  // pointed feather tufts, leaning outward
  drawEars: ({ Ln }, g) => {
    const { Y0, earW, xL, xR, X2 } = g;
    Ln(xL - earW, Y0); Ln(xL - earW * 0.5, 0); Ln(xL + earW, Y0);
    Ln(xR - earW, Y0); Ln(xR + earW * 0.5, 0); Ln(xR + earW, Y0);
    Ln(X2, Y0);
  },

  decorations: (g) => {
    const { L, H, Y0, earW, earH, xL, xR, cx } = g;
    const eyeX = L * 0.21, eyeY = Y0 + H * 0.36;
    const innerTuft = (x: number, lean: number) => tri([x - earW * 0.45, Y0 - earH * 0.05], [x + earW * 0.45, Y0 - earH * 0.05], [x + lean, Y0 - earH * 0.66]);
    return [
      { id: "tufts", label: "Ear tufts", color: FACE_COLORS.tufts, shapes: [innerTuft(xL, -earW * 0.3), innerTuft(xR, earW * 0.3)] },
      // big facial discs (the owl's signature)
      { id: "discs", label: "Eye discs", color: FACE_COLORS.discs, shapes: [
          disc(cx - eyeX, eyeY, L * 0.34), disc(cx + eyeX, eyeY, L * 0.34),
        ] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(cx - eyeX, eyeY, L * 0.24), disc(cx + eyeX, eyeY, L * 0.24),
        ] },
      { id: "pupils", label: "Pupils", color: FACE_COLORS.pupils, shapes: [
          disc(cx - eyeX, eyeY + L * 0.01, L * 0.11), disc(cx + eyeX, eyeY + L * 0.01, L * 0.11),
        ] },
      // beak: a small downward triangle between the eyes
      { id: "beak", label: "Beak", color: FACE_COLORS.beak, shapes: [
          tri([cx - L * 0.06, eyeY + L * 0.12], [cx + L * 0.06, eyeY + L * 0.12], [cx, eyeY + L * 0.27]),
        ] },
    ];
  },
};

export function buildOwlBox(p: OwlBoxParams): Dieline {
  return buildAnimalBox(p, owlSpec);
}
