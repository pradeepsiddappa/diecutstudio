// Mouse Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// Big round ears + a tiny face: inner ears, small eyes, a little nose and
// whiskers. Same body / lid / fold as the bunny.

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, oval, disc,
} from "./animalBox";

export type MouseBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  ears: "#f3b9c6", eyes: "#2b2622", nose: "#e07a96", whiskers: "#9a948c",
};

export const mouseSpec: AnimalSpec = {
  earW: (L) => L * 0.22,                                   // big round ears
  earH: (H) => clamp(H * 0.46, mmToPt(13), H * 0.78),
  earCentres: (L, H) => [H + L * 0.24, H + L * 0.76],

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
    const eyeY = Y0 + H * 0.42, noseY = Y0 + H * 0.6;
    const stroke = Math.max(mmToPt(0.6), L * 0.012);
    return [
      { id: "ears", label: "Inner ears", color: FACE_COLORS.ears, shapes: [
          disc(xL, Y0 - earH * 0.45, earW * 1.1), disc(xR, Y0 - earH * 0.45, earW * 1.1),
        ] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(cx - L * 0.13, eyeY, L * 0.08), disc(cx + L * 0.13, eyeY, L * 0.08),
        ] },
      { id: "nose", label: "Nose", color: FACE_COLORS.nose, shapes: [oval(cx, noseY, L * 0.05, L * 0.04)] },
      { id: "whiskers", label: "Whiskers", color: FACE_COLORS.whiskers, stroke: true, strokeWidth: stroke, shapes: [
          { pts: [[cx - L * 0.04, noseY], [cx - L * 0.42, noseY - L * 0.08]], closed: false },
          { pts: [[cx - L * 0.04, noseY + L * 0.02], [cx - L * 0.43, noseY + L * 0.04]], closed: false },
          { pts: [[cx - L * 0.04, noseY + L * 0.04], [cx - L * 0.42, noseY + L * 0.16]], closed: false },
          { pts: [[cx + L * 0.04, noseY], [cx + L * 0.42, noseY - L * 0.08]], closed: false },
          { pts: [[cx + L * 0.04, noseY + L * 0.02], [cx + L * 0.43, noseY + L * 0.04]], closed: false },
          { pts: [[cx + L * 0.04, noseY + L * 0.04], [cx + L * 0.42, noseY + L * 0.16]], closed: false },
        ] },
    ];
  },
};

export function buildMouseBox(p: MouseBoxParams): Dieline {
  return buildAnimalBox(p, mouseSpec);
}
