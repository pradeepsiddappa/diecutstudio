// Standard sheet sizes and a fit checker: does the flat dieline (incl. bleed)
// fit on a given sheet, in either orientation?

import { inToPt, mmToPt } from "./units";

export interface Sheet {
  name: string;
  wPt: number;
  hPt: number;
  note?: string;
}

const A = (mmW: number, mmH: number) => ({ wPt: mmToPt(mmW), hPt: mmToPt(mmH) });
const I = (inW: number, inH: number) => ({ wPt: inToPt(inW), hPt: inToPt(inH) });

export const SHEETS: Sheet[] = [
  // Craft cutting mats first — for most makers "fits a 12×12 mat" matters more
  // than press sheets (the standard + long cutting-mat sizes).
  { name: "Mat 12×12", ...I(12, 12), note: "cutting mat" },
  { name: "Mat 12×24", ...I(12, 24), note: "long cutting mat" },
  { name: "Letter (8.5×11)", ...I(8.5, 11) },
  { name: "Legal (8.5×14)", ...I(8.5, 14) },
  { name: "Tabloid (11×17)", ...I(11, 17) },
  { name: "12×18", ...I(12, 18) },
  { name: "13×19 (Super B)", ...I(13, 19) },
  { name: "A4", ...A(210, 297) },
  { name: "A3", ...A(297, 420) },
  { name: "A2", ...A(420, 594) },
  { name: "SRA3", ...A(320, 450), note: "common press sheet" },
  { name: "SRA2", ...A(450, 640), note: "common press sheet" },
];

export interface FitResult {
  sheet: Sheet;
  fits: boolean;
  rotated: boolean; // true if it only fits when the die is rotated 90°
  marginPt: number; // smallest gap to the sheet edge when it fits (else negative)
}

// dieW/dieH are the full artwork extents INCLUDING bleed, in points.
export function checkFit(dieW: number, dieH: number): FitResult[] {
  return SHEETS.map((sheet) => {
    const upright = dieW <= sheet.wPt && dieH <= sheet.hPt;
    const rotated = dieH <= sheet.wPt && dieW <= sheet.hPt;
    const fits = upright || rotated;
    let marginPt: number;
    if (upright) {
      marginPt = Math.min(sheet.wPt - dieW, sheet.hPt - dieH);
    } else if (rotated) {
      marginPt = Math.min(sheet.wPt - dieH, sheet.hPt - dieW);
    } else {
      // worst overflow across both orientations (negative)
      const a = Math.min(sheet.wPt - dieW, sheet.hPt - dieH);
      const b = Math.min(sheet.wPt - dieH, sheet.hPt - dieW);
      marginPt = Math.max(a, b);
    }
    return { sheet, fits, rotated: !upright && rotated, marginPt };
  });
}
