// Cat Treat Box — animal-box family (see animalBox.ts + docs/animal-boxes.md).
// Triangle ears at the top corners + a cat face: inner-ear triangles, eyes,
// a small nose, a :3 mouth, and whiskers. Same body / lid / fold as the bunny.

import { Dieline } from "../types";
import { mmToPt } from "../units";
import {
  AnimalBoxParams, AnimalSpec, animalDefaultParams, buildAnimalBox, tri, disc,
} from "./animalBox";

export type CatBoxParams = AnimalBoxParams;
export const defaultParams = animalDefaultParams;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const FACE_COLORS: Record<string, string> = {
  ears: "#f3a9c0", eyes: "#2b2622", nose: "#e07a96", mouth: "#5b5550", whiskers: "#9a948c",
};

export const catSpec: AnimalSpec = {
  earW: (L) => L * 0.17,                                   // wide triangles
  earH: (H) => clamp(H * 0.7, mmToPt(12), H * 1.3),        // medium
  earCentres: (L, H) => [H + L * 0.22, H + L * 0.78],      // top corners

  // upright pointed triangles
  drawEars: ({ Ln }, g) => {
    const { Y0, earW, xL, xR, X2 } = g;
    Ln(xL - earW, Y0);  Ln(xL, 0);  Ln(xL + earW, Y0);     // left ear
    Ln(xR - earW, Y0);  Ln(xR, 0);  Ln(xR + earW, Y0);     // right ear
    Ln(X2, Y0);
  },

  decorations: (g) => {
    const { L, H, Y0, earW, earH, xL, xR, cx } = g;
    const eyeR = L * 0.055;
    const eyeY = Y0 + H * 0.32, noseY = Y0 + H * 0.50, mouthY = Y0 + H * 0.64;
    const nw = L * 0.04, nh = L * 0.045, aw = L * 0.07, ad = L * 0.045;
    const stroke = Math.max(mmToPt(0.6), L * 0.012);
    // inner-ear triangle (smaller, inset inside each ear)
    const innerEar = (x: number) => tri([x - earW * 0.5, Y0 - earH * 0.06], [x + earW * 0.5, Y0 - earH * 0.06], [x, Y0 - earH * 0.74]);
    return [
      { id: "ears", label: "Inner ears", color: FACE_COLORS.ears, shapes: [innerEar(xL), innerEar(xR)] },
      { id: "eyes", label: "Eyes", color: FACE_COLORS.eyes, shapes: [
          disc(cx - L * 0.18, eyeY, eyeR * 2), disc(cx + L * 0.18, eyeY, eyeR * 2),
        ] },
      { id: "nose", label: "Nose", color: FACE_COLORS.nose, shapes: [
          { pts: [[cx - nw, noseY], [cx + nw, noseY], [cx, noseY + nh]], closed: true },
        ] },
      { id: "mouth", label: "Mouth", color: FACE_COLORS.mouth, stroke: true, strokeWidth: stroke, shapes: [
          { pts: [[cx, noseY + nh], [cx, mouthY]], closed: false },                                  // stem
          { pts: [[cx, mouthY], [cx - aw, mouthY + ad]], closed: false, curves: [[cx - aw * 0.5, mouthY + ad]] }, // left arc
          { pts: [[cx, mouthY], [cx + aw, mouthY + ad]], closed: false, curves: [[cx + aw * 0.5, mouthY + ad]] }, // right arc
        ] },
      { id: "whiskers", label: "Whiskers", color: FACE_COLORS.whiskers, stroke: true, strokeWidth: stroke, shapes: [
          { pts: [[cx - L * 0.07, noseY + nh * 0.4], [cx - L * 0.46, noseY - L * 0.06]], closed: false },
          { pts: [[cx - L * 0.07, noseY + nh * 0.9], [cx - L * 0.47, noseY + nh * 0.9]], closed: false },
          { pts: [[cx - L * 0.07, noseY + nh * 1.4], [cx - L * 0.46, noseY + nh * 1.9]], closed: false },
          { pts: [[cx + L * 0.07, noseY + nh * 0.4], [cx + L * 0.46, noseY - L * 0.06]], closed: false },
          { pts: [[cx + L * 0.07, noseY + nh * 0.9], [cx + L * 0.47, noseY + nh * 0.9]], closed: false },
          { pts: [[cx + L * 0.07, noseY + nh * 1.4], [cx + L * 0.46, noseY + nh * 1.9]], closed: false },
        ] },
    ];
  },
};

export function buildCatBox(p: CatBoxParams): Dieline {
  return buildAnimalBox(p, catSpec);
}
