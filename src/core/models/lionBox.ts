// Lion Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// Small round ears + the lion's signature MANE (a printed golden burst around
// the face), a lighter face, eyes, a nose and a mouth. Same body/lid/fold.

import { Dieline, Polyline } from "../types";
import { Pt } from "../geometry";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, oval, disc,
} from "./animalBox";

export type LionBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  mane: "#d99a45", ears: "#caa05a", face: "#f4dca6", eyes: "#2b2622", nose: "#5b3f2a", mouth: "#5b3f2a",
};

/** A spiky sun-burst (alternating outer/inner radii) — the lion's mane. */
function burst(cx: number, cy: number, rOut: number, rIn: number, points: number): Polyline {
  const pts: Pt[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? rOut : rIn;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return { pts, closed: true };
}

export const lionSpec: AnimalSpec = {
  earW: (L) => L * 0.13,
  earH: (H) => clamp(H * 0.28, mmToPt(9), H * 0.5),         // small round ears
  earCentres: (L, H) => [H + L * 0.26, H + L * 0.74],

  drawEars: ({ Ln, Q }, g) => {
    const { Y0, earW, xL, xR, X2 } = g;
    Ln(xL - earW, Y0);
    Q(xL - earW, 0, xL, 0); Q(xL + earW, 0, xL + earW, Y0);
    Ln(xR - earW, Y0);
    Q(xR - earW, 0, xR, 0); Q(xR + earW, 0, xR + earW, Y0);
    Ln(X2, Y0);
  },

  decorations: (g) => {
    const { L, H, Y0, earW, xL, xR, cx } = g;
    const faceCy = Y0 + H * 0.48;
    const eyeY = Y0 + H * 0.40, noseY = Y0 + H * 0.56, mouthY = Y0 + H * 0.66;
    const stroke = Math.max(mmToPt(0.6), L * 0.012);
    return [
      { id: "mane", label: "Mane", color: FACE_COLORS.mane, shapes: [
          burst(cx, faceCy, Math.min(L * 0.55, H * 0.5), Math.min(L * 0.4, H * 0.36), 13),
        ] },
      { id: "ears", label: "Inner ears", color: FACE_COLORS.ears, shapes: [
          disc(xL, Y0 - H * 0.06, earW * 0.9), disc(xR, Y0 - H * 0.06, earW * 0.9),
        ] },
      { id: "face", label: "Face", color: FACE_COLORS.face, shapes: [disc(cx, faceCy, Math.min(L * 0.62, H * 0.56))] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(cx - L * 0.15, eyeY, L * 0.1), disc(cx + L * 0.15, eyeY, L * 0.1),
        ] },
      { id: "nose", label: "Nose", color: FACE_COLORS.nose, shapes: [
          { pts: [[cx - L * 0.06, noseY], [cx + L * 0.06, noseY], [cx, noseY + L * 0.06]], closed: true },
        ] },
      { id: "mouth", label: "Mouth", color: FACE_COLORS.mouth, stroke: true, strokeWidth: stroke, shapes: [
          { pts: [[cx, noseY + L * 0.06], [cx, mouthY]], closed: false },
          { pts: [[cx - L * 0.1, mouthY], [cx, mouthY + L * 0.04]], closed: false, curves: [[cx - L * 0.05, mouthY + L * 0.04]] },
          { pts: [[cx, mouthY + L * 0.04], [cx + L * 0.1, mouthY]], closed: false, curves: [[cx + L * 0.05, mouthY + L * 0.04]] },
        ] },
    ];
  },
};

export function buildLionBox(p: LionBoxParams): Dieline {
  return buildAnimalBox(p, lionSpec);
}
