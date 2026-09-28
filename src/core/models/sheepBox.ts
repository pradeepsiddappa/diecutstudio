// Sheep Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// The "ears" are a row of WOOLLY bumps across the whole top (the fleece); the
// face hangs below with floppy ears, eyes, a nose and a smile. Same body.

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, oval, disc,
} from "./animalBox";

export type SheepBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  face: "#e4d7c6", ears: "#d3bda8", eyes: "#2b2622", nose: "#5b4636", mouth: "#5b4636",
};

export const sheepSpec: AnimalSpec = {
  earW: (L) => L * 0.1,                                    // seeds the wool-bump count
  earH: (H) => clamp(H * 0.28, mmToPt(10), H * 0.5),       // wool bump height
  earCentres: (L, H) => [H + L * 0.5, H + L * 0.5],        // unused (scalloped top)

  // a row of woolly bumps across the whole top edge (the fleece)
  drawEars: ({ Q }, g) => {
    const { L, X1, Y0, earW } = g;
    const nB = Math.max(5, Math.round(L / (2 * earW)));
    const w = L / (2 * nB);
    for (let i = 0; i < nB; i++) {
      const c = X1 + (2 * i + 1) * w;
      Q(c - w, 0, c, 0); Q(c + w, 0, c + w, Y0);
    }
  },

  decorations: (g) => {
    const { L, H, Y0, cx } = g;
    const faceCy = Y0 + H * 0.56, eyeY = Y0 + H * 0.46, noseY = Y0 + H * 0.62, mouthY = Y0 + H * 0.72;
    const stroke = Math.max(mmToPt(0.6), L * 0.012);
    return [
      { id: "ears", label: "Ears", color: FACE_COLORS.ears, shapes: [
          oval(cx - L * 0.34, faceCy - H * 0.04, L * 0.1, H * 0.12),
          oval(cx + L * 0.34, faceCy - H * 0.04, L * 0.1, H * 0.12),
        ] },
      { id: "face", label: "Face", color: FACE_COLORS.face, shapes: [oval(cx, faceCy, L * 0.3, H * 0.34)] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(cx - L * 0.12, eyeY, L * 0.07), disc(cx + L * 0.12, eyeY, L * 0.07),
        ] },
      { id: "nose", label: "Nose", color: FACE_COLORS.nose, shapes: [oval(cx, noseY, L * 0.05, L * 0.035)] },
      { id: "mouth", label: "Mouth", color: FACE_COLORS.mouth, stroke: true, strokeWidth: stroke, shapes: [
          { pts: [[cx, noseY + L * 0.035], [cx, mouthY]], closed: false },
          { pts: [[cx - L * 0.08, mouthY], [cx + L * 0.08, mouthY]], closed: false, curves: [[cx, mouthY + L * 0.06]] },
        ] },
    ];
  },
};

export function buildSheepBox(p: SheepBoxParams): Dieline {
  return buildAnimalBox(p, sheepSpec);
}
