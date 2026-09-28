// Bat Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// Pointed ears + a dark bat face with big eyes and two little fangs. Halloween
// favor. Same body / lid / fold as the bunny.

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, tri, oval, disc,
} from "./animalBox";

export type BatBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  face: "#3b3442", eyes: "#fbf4d8", pupils: "#2b2622", fangs: "#fbf7ef", mouth: "#6a5d76",
};

export const batSpec: AnimalSpec = {
  earW: (L) => L * 0.15,
  earH: (H) => clamp(H * 0.55, mmToPt(13), H * 1.0),       // pointed bat ears
  earCentres: (L, H) => [H + L * 0.24, H + L * 0.76],

  drawEars: ({ Ln }, g) => {
    const { Y0, earW, xL, xR, X2 } = g;
    Ln(xL - earW, Y0); Ln(xL - earW * 0.2, 0); Ln(xL + earW, Y0);   // left ear (tip leans in a touch)
    Ln(xR - earW, Y0); Ln(xR + earW * 0.2, 0); Ln(xR + earW, Y0);   // right ear
    Ln(X2, Y0);
  },

  decorations: (g) => {
    const { L, H, Y0, earW, earH, xL, xR, cx } = g;
    const eyeY = Y0 + H * 0.4, mouthY = Y0 + H * 0.62;
    const stroke = Math.max(mmToPt(0.6), L * 0.014);
    return [
      // dark bat face: a rounded head patch + dark fills on the two ears
      { id: "face", label: "Face", color: FACE_COLORS.face, shapes: [
          oval(cx, Y0 + H * 0.5, L * 0.46, H * 0.46),
          tri([xL - earW * 0.75, Y0 + H * 0.02], [xL + earW * 0.75, Y0 + H * 0.02], [xL - earW * 0.15, Y0 - earH * 0.72]),
          tri([xR - earW * 0.75, Y0 + H * 0.02], [xR + earW * 0.75, Y0 + H * 0.02], [xR + earW * 0.15, Y0 - earH * 0.72]),
        ] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(cx - L * 0.16, eyeY, L * 0.15), disc(cx + L * 0.16, eyeY, L * 0.15),
        ] },
      { id: "pupils", label: "Pupils", color: FACE_COLORS.pupils, shapes: [
          disc(cx - L * 0.16, eyeY + L * 0.01, L * 0.06), disc(cx + L * 0.16, eyeY + L * 0.01, L * 0.06),
        ] },
      { id: "mouth", label: "Mouth", color: FACE_COLORS.mouth, stroke: true, strokeWidth: stroke, shapes: [
          { pts: [[cx - L * 0.12, mouthY], [cx + L * 0.12, mouthY]], closed: false, curves: [[cx, mouthY + L * 0.08]] },
        ] },
      // two little fangs hanging from the mouth
      { id: "fangs", label: "Fangs", color: FACE_COLORS.fangs, shapes: [
          tri([cx - L * 0.08, mouthY + L * 0.02], [cx - L * 0.03, mouthY + L * 0.02], [cx - L * 0.055, mouthY + L * 0.1]),
          tri([cx + L * 0.03, mouthY + L * 0.02], [cx + L * 0.08, mouthY + L * 0.02], [cx + L * 0.055, mouthY + L * 0.1]),
        ] },
    ];
  },
};

export function buildBatBox(p: BatBoxParams): Dieline {
  return buildAnimalBox(p, batSpec);
}
