// Dog Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// Floppy rounded ears + a puppy face: inner ears, eyes, a light muzzle, a dark
// nose, and a hanging tongue. Same body / lid / fold as the bunny.

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, oval, disc,
} from "./animalBox";

export type DogBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  ears: "#c69a6e", eyes: "#2b2622", muzzle: "#f1e7da", nose: "#2b2622", tongue: "#ef8aa0",
};

export const dogSpec: AnimalSpec = {
  earW: (L) => L * 0.16,
  earH: (H) => clamp(H * 0.7, mmToPt(13), H * 1.2),
  earCentres: (L, H) => [H + L * 0.2, H + L * 0.8],

  // floppy rounded ears leaning outward (rounded outer + inner edges)
  drawEars: ({ Ln, Q }, g) => {
    const { Y0, earW, xL, xR, X2 } = g;
    const mid = Y0 * 0.5;
    Ln(xL - earW, Y0);
    Q(xL - earW * 1.4, mid, xL - earW * 0.6, 0); Q(xL - earW * 0.1, mid, xL + earW, Y0); // left floppy ear
    Ln(xR - earW, Y0);
    Q(xR + earW * 0.1, mid, xR + earW * 0.6, 0); Q(xR + earW * 1.4, mid, xR + earW, Y0); // right floppy ear
    Ln(X2, Y0);
  },

  decorations: (g) => {
    const { L, H, Y0, earW, xL, xR, cx } = g;
    const eyeR = L * 0.05;
    const eyeY = Y0 + H * 0.32, muzzleY = Y0 + H * 0.64, noseY = Y0 + H * 0.52;
    const stroke = Math.max(mmToPt(0.6), L * 0.012);
    return [
      { id: "ears", label: "Inner ears", color: FACE_COLORS.ears, shapes: [
          oval(xL - earW * 0.35, Y0 - H * 0.3, earW * 0.5, H * 0.36),
          oval(xR + earW * 0.35, Y0 - H * 0.3, earW * 0.5, H * 0.36),
        ] },
      { id: "muzzle", label: "Muzzle", color: FACE_COLORS.muzzle, shapes: [oval(cx, muzzleY, L * 0.26, L * 0.2)] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(cx - L * 0.17, eyeY, eyeR * 2), disc(cx + L * 0.17, eyeY, eyeR * 2),
        ] },
      { id: "nose", label: "Nose", color: FACE_COLORS.nose, shapes: [oval(cx, noseY, L * 0.08, L * 0.06)] },
      { id: "tongue", label: "Tongue", color: FACE_COLORS.tongue, shapes: [
          oval(cx, muzzleY + L * 0.14, L * 0.07, L * 0.12),
        ] },
    ];
  },
};

export function buildDogBox(p: DogBoxParams): Dieline {
  return buildAnimalBox(p, dogSpec);
}
