// Reindeer Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// Branchy ANTLERS (the "ears" are two 3-point antler sawtooths) + a reindeer
// face: brown ears, a tan muzzle, eyes, a dark nose and a smile. Christmas
// favor. Same body / lid / fold as the bunny.
//
// (Note: a brown/dark nose, NOT a glowing red one — a red-nosed reindeer evokes
//  a specific trademarked character; the geometry stays generic. See §6 of the
//  playbook.)

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, oval, disc,
} from "./animalBox";

export type ReindeerBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  ears: "#9c7048", muzzle: "#e7d6c2", eyes: "#2b2622", nose: "#4a3324", mouth: "#5b4636",
};

/** One 3-point antler (a sawtooth) centred at cx, half-width aw, rising to earH
 *  (main tip at y=0). Traced left→right via the Ln api. */
function antler(Ln: (x: number, y: number) => void, cx: number, aw: number, earH: number, Y0: number) {
  Ln(cx - aw, Y0);
  Ln(cx - aw * 0.55, Y0 - earH * 0.5);   // outer tine
  Ln(cx - aw * 0.25, Y0 - earH * 0.2);   // valley
  Ln(cx, 0);                             // main beam tip (tallest)
  Ln(cx + aw * 0.3, Y0 - earH * 0.28);   // valley
  Ln(cx + aw * 0.62, Y0 - earH * 0.6);   // inner tine
  Ln(cx + aw, Y0);
}

export const reindeerSpec: AnimalSpec = {
  earW: (L) => L * 0.16,                                   // antler cluster half-width
  earH: (H) => clamp(H * 0.85, mmToPt(15), H * 1.5),       // tall antlers
  earCentres: (L, H) => [H + L * 0.26, H + L * 0.74],

  drawEars: ({ Ln }, g) => {
    const { Y0, earW, xL, xR, X2 } = g;
    antler(Ln, xL, earW, g.earH, Y0);
    antler(Ln, xR, earW, g.earH, Y0);
    Ln(X2, Y0);
  },

  decorations: (g) => {
    const { L, H, Y0, cx } = g;
    const eyeY = Y0 + H * 0.42, muzzleY = Y0 + H * 0.64, noseY = Y0 + H * 0.6;
    const stroke = Math.max(mmToPt(0.6), L * 0.012);
    return [
      // brown ears flanking the upper face (below the antler bases)
      { id: "ears", label: "Ears", color: FACE_COLORS.ears, shapes: [
          oval(cx - L * 0.36, Y0 + H * 0.16, L * 0.09, H * 0.11),
          oval(cx + L * 0.36, Y0 + H * 0.16, L * 0.09, H * 0.11),
        ] },
      { id: "muzzle", label: "Muzzle", color: FACE_COLORS.muzzle, shapes: [oval(cx, muzzleY, L * 0.28, H * 0.22)] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(cx - L * 0.15, eyeY, L * 0.09), disc(cx + L * 0.15, eyeY, L * 0.09),
        ] },
      { id: "nose", label: "Nose", color: FACE_COLORS.nose, shapes: [oval(cx, noseY, L * 0.09, L * 0.07)] },
      { id: "mouth", label: "Mouth", color: FACE_COLORS.mouth, stroke: true, strokeWidth: stroke, shapes: [
          { pts: [[cx, noseY + L * 0.07], [cx, muzzleY + H * 0.06]], closed: false },
          { pts: [[cx - L * 0.09, muzzleY + H * 0.06], [cx + L * 0.09, muzzleY + H * 0.06]], closed: false, curves: [[cx, muzzleY + H * 0.1]] },
        ] },
    ];
  },
};

export function buildReindeerBox(p: ReindeerBoxParams): Dieline {
  return buildAnimalBox(p, reindeerSpec);
}
