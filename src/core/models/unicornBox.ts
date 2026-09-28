// Unicorn Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// Two pointed ears + a centre HORN (the tallest element), plus a pastel forelock
// mane, lashes-style eyes and blush cheeks. Same body/lid/fold as the bunny.

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, tri, disc,
} from "./animalBox";

export type UnicornBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  horn: "#ecc95e", ears: "#f0b9cf", mane: "#c79be2", eyes: "#2b2622", cheeks: "#f7c2d4",
};

export const unicornSpec: AnimalSpec = {
  earW: (L) => L * 0.12,
  earH: (H) => clamp(H * 0.95, mmToPt(16), H * 1.7),       // = HORN height (tallest)
  earCentres: (L, H) => [H + L * 0.22, H + L * 0.78],

  // two pointed ears (shorter) + a tall centre horn (tip at y=0)
  drawEars: ({ Ln }, g) => {
    const { Y0, earW, earH, xL, xR, X2, X1, L } = g;
    const cx = X1 + L / 2;
    const earTipY = Y0 - earH * 0.55;  // ears ~55% the horn height
    const hornW = earW * 0.55;
    Ln(xL - earW, Y0); Ln(xL, earTipY); Ln(xL + earW, Y0);          // left ear
    Ln(cx - hornW, Y0); Ln(cx, 0); Ln(cx + hornW, Y0);             // horn (tallest)
    Ln(xR - earW, Y0); Ln(xR, earTipY); Ln(xR + earW, Y0);          // right ear
    Ln(X2, Y0);
  },

  decorations: (g) => {
    const { L, H, Y0, earW, earH, xL, xR, cx } = g;
    const hornW = earW * 0.55;
    const eyeY = Y0 + H * 0.42, chY = Y0 + H * 0.56;
    const stroke = Math.max(mmToPt(0.6), L * 0.012);
    return [
      { id: "horn", label: "Horn", color: FACE_COLORS.horn, shapes: [
          tri([cx - hornW * 0.8, Y0 - earH * 0.02], [cx + hornW * 0.8, Y0 - earH * 0.02], [cx, earH * 0.06]),
        ] },
      { id: "ears", label: "Inner ears", color: FACE_COLORS.ears, shapes: [
          tri([xL - earW * 0.5, Y0 - earH * 0.04], [xL + earW * 0.5, Y0 - earH * 0.04], [xL, Y0 - earH * 0.46]),
          tri([xR - earW * 0.5, Y0 - earH * 0.04], [xR + earW * 0.5, Y0 - earH * 0.04], [xR, Y0 - earH * 0.46]),
        ] },
      // pastel forelock: a few locks hanging from between the ears onto the forehead
      { id: "mane", label: "Mane", color: FACE_COLORS.mane, shapes: [
          tri([cx - L * 0.16, Y0], [cx - L * 0.02, Y0], [cx - L * 0.12, Y0 + H * 0.26]),
          tri([cx - L * 0.04, Y0], [cx + L * 0.1, Y0], [cx + L * 0.02, Y0 + H * 0.3]),
          tri([cx + L * 0.08, Y0], [cx + L * 0.2, Y0], [cx + L * 0.16, Y0 + H * 0.24]),
        ] },
      // closed, happy lash eyes (downward curves)
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, stroke: true, strokeWidth: stroke * 1.4, shapes: [
          { pts: [[cx - L * 0.24, eyeY], [cx - L * 0.1, eyeY]], closed: false, curves: [[cx - L * 0.17, eyeY + L * 0.07]] },
          { pts: [[cx + L * 0.1, eyeY], [cx + L * 0.24, eyeY]], closed: false, curves: [[cx + L * 0.17, eyeY + L * 0.07]] },
        ] },
      { id: "cheeks", label: "Cheeks", color: FACE_COLORS.cheeks, shapes: [
          disc(cx - L * 0.26, chY, L * 0.09), disc(cx + L * 0.26, chY, L * 0.09),
        ] },
    ];
  },
};

export function buildUnicornBox(p: UnicornBoxParams): Dieline {
  return buildAnimalBox(p, unicornSpec);
}
