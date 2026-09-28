// One source of truth for physical units.
// Internal geometry is always stored in POINTS (1 inch = 72 pt), the native
// PDF/PostScript unit, so exports carry exact physical measurements.

export const PT_PER_IN = 72;
export const MM_PER_IN = 25.4;
export const PT_PER_MM = PT_PER_IN / MM_PER_IN;

export type Unit = "in" | "mm";

export const toPt = (value: number, unit: Unit): number =>
  unit === "in" ? value * PT_PER_IN : value * PT_PER_MM;

export const fromPt = (pt: number, unit: Unit): number =>
  unit === "in" ? pt / PT_PER_IN : pt / PT_PER_MM;

export const inToPt = (v: number) => v * PT_PER_IN;
export const mmToPt = (v: number) => v * PT_PER_MM;

export const round = (v: number, dp = 4) => {
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
};

// Format a point value back to a human label in the chosen unit.
export const fmt = (pt: number, unit: Unit, dp = unit === "in" ? 3 : 1) =>
  `${round(fromPt(pt, unit), dp)} ${unit}`;
