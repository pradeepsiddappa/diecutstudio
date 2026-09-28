// Bunny Treat Box — the first ANIMAL model. Now built on the shared animal-box
// pipeline (animalBox.ts): the bunny supplies ONLY its ears (two tall smooth
// leaves) + face (eyes, nose, inner-ears, cheeks, mouth). The body, lid, fold
// ids, glue, dims, panels and bleed all live in buildAnimalBox.
//
// Swap the ear + face shapes → cat / bear / fox on the very same box body.
// See docs/animal-boxes.md.

import { Dieline } from "../types";
import { circleCut } from "../craft";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, leaf,
} from "./animalBox";

export type BunnyBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Default face colours (overridable in the editor). */
export const FACE_COLORS: Record<string, string> = {
  ears: "#f3a9c0", eyes: "#2b2622", nose: "#e26d8e", cheeks: "#f8c4d2", mouth: "#7a5560",
};

export const bunnySpec: AnimalSpec = {
  earW: (L) => L * 0.12,                                   // narrow
  earH: (H) => clamp(H * 1.2, mmToPt(16), H * 2.4),        // tall
  earCentres: (L, H) => [H + L * 0.32, H + L * 0.68],      // toward the centre

  // two tall smooth leaves (Q-curve lenses) bumping up off the front-wall edge
  drawEars: ({ Ln, Q }, g) => {
    const { Y0, earW, earH, xL, xR, X2 } = g;
    Ln(xL - earW, Y0);
    Q(xL - earW * 1.12, Y0 - earH * 0.62, xL, 0);          // left ear: up to tip
    Q(xL + earW * 1.12, Y0 - earH * 0.62, xL + earW, Y0);  // left ear: down to base
    Ln(xR - earW, Y0);
    Q(xR - earW * 1.12, Y0 - earH * 0.62, xR, 0);          // right ear: up to tip
    Q(xR + earW * 1.12, Y0 - earH * 0.62, xR + earW, Y0);  // right ear: down to base
    Ln(X2, Y0);
  },

  decorations: (g) => {
    const { L, H, Y0, earW, earH, xL, xR, cx } = g;
    const eyeR = L * 0.05, chR = L * 0.055;
    const eyeY = Y0 + H * 0.30, chY = Y0 + H * 0.44, noseY = Y0 + H * 0.46, mouthY = Y0 + H * 0.60;
    const nw = L * 0.038, nh = L * 0.05, mw = L * 0.085, md = L * 0.05;
    return [
      { id: "ears", label: "Inner ears", color: FACE_COLORS.ears, shapes: [
          leaf(xL, Y0 - earH * 0.12, Y0 - earH * 0.86, earW * 0.52),
          leaf(xR, Y0 - earH * 0.12, Y0 - earH * 0.86, earW * 0.52),
        ] },
      { id: "cheeks", label: "Cheeks", color: FACE_COLORS.cheeks, shapes: [
          circleCut(cx - L * 0.27, chY, chR * 2), circleCut(cx + L * 0.27, chY, chR * 2),
        ] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          circleCut(cx - L * 0.17, eyeY, eyeR * 2), circleCut(cx + L * 0.17, eyeY, eyeR * 2),
        ] },
      { id: "nose", label: "Nose", color: FACE_COLORS.nose, shapes: [
          { pts: [[cx - nw, noseY], [cx + nw, noseY], [cx, noseY + nh]], closed: true },
        ] },
      { id: "mouth", label: "Mouth", color: FACE_COLORS.mouth, stroke: true, strokeWidth: Math.max(mmToPt(0.6), L * 0.012), shapes: [
          { pts: [[cx, noseY + nh], [cx, mouthY]], closed: false },
          { pts: [[cx - mw, mouthY], [cx + mw, mouthY]], closed: false, curves: [[cx, mouthY + md]] },
        ] },
    ];
  },
};

export function buildBunnyBox(p: BunnyBoxParams): Dieline {
  return buildAnimalBox(p, bunnySpec);
}
