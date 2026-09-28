// Roll-End Tuck Top (RETT) Mailer — one-piece tray with hinged lid.
// Also known as: One-Piece Mailer Box, Self-Lock Mailer, E-commerce Mailer
// (the Amazon-style brown shipper / branded subscription box).
//
// Correct cross-shape layout matching real RETT dielines:
//
//                        +------ rounded tongue ------+
//                        |             (locks)        |
//                        +----------- LID -----------+    L × W panel
//                        +---------- BACK ----------+    L × H wall
//          +--+----------+---------------------------+----------+--+
//          |TD| (gap)    |                           |    (gap) |TD|   <- TOP dust flaps (chamfered outer corner)
//          +--+          |                           |          +--+      hinged to side walls
//          |LEFT WALL    |     BOTTOM PANEL          |    RIGHT WALL|
//          |  W × H      |  L × W   ◯ slot  slot ◯   |    W × H     |
//          +--+          |                           |          +--+
//          |BD| (gap)    |                           |    (gap) |BD|   <- BOTTOM dust flaps (chamfered)
//          +--+----------+---------------------------+----------+--+
//                        +---------- FRONT ---------+    L × H wall
//
// Dust flaps hinge to the SIDE WALLS' top/bottom edges (horizontal creases at
// y=yBackBot and y=yBotBot at x ∈ [0,W] and [W+L, W+L+W]). When the side wall
// folds up, the dust flap goes with it; a second fold tucks it inward into the
// box. Back & front walls fold up after, hiding the dust flaps from view.
//
// The lid has a wide flat-top tongue with rounded outer corners (friction-tuck
// into the front when closed). Two capsule slots are cut into the bottom panel
// — placeholder for the v2 lock-tab feature (visual fidelity for now).
//
// All math is in POINTS. Origin top-left, y increases downward (SVG style).

import { Dieline, DieLabel, DimLine, Polyline } from "../types";
import { arcPoints, Pt, bleedFromCut } from "../geometry";
import { inToPt } from "../units";

export interface RollEndMailerParams {
  L: number;       // length — the long box dimension (pt)
  W: number;       // width — the short box dimension / depth (pt)
  H: number;       // height — wall height (pt)
  thickness: number;
  bleed: number;
  tongue: number;        // tongue height above the lid (pt)
  tongueOut: number;     // how far the tongue extends LATERALLY past the lid on each side (pt) —
                         //   creates the rounded "ear" lock-tabs visible in real RETT dielines
  tongueR: number;       // tongue rounded-corner radius (pt)
}

// Sensible defaults so the user only has to type L/W/H to get a valid die.
export function defaultParams(L: number, W: number, H: number, thickness = inToPt(0.018)): RollEndMailerParams {
  return {
    L,
    W,
    H,
    thickness,
    bleed: inToPt(0.125),
    tongue: Math.min(W * 0.7, inToPt(1.2)),                // tucks ~70% of depth, max 1.2 in
    // Lateral overhang per side (the "ear tabs"). Clamp to H so the ears
    // don't extend past the side-wall outer edges.
    tongueOut: Math.min(W * 0.22, H * 0.5, inToPt(0.7)),
    tongueR: Math.min(W * 0.4, inToPt(0.6)),               // rounded ear corner radius
  };
}

// Derived secondary dimensions — shared so any future 3D fold component can
// match the flat dieline without reimplementing the formulas.
export function rollEndMailerDetails(p: RollEndMailerParams) {
  return {
    // Dust flap depth (along y in flat). It hinges to the side wall's top/bottom
    // edge and extends outward (away from the bottom panel) by this amount. In
    // 3D this becomes the dust flap's "reach" perpendicular to the side wall.
    dustH: Math.min(p.H * 0.8, p.W * 0.6),
    dustChamfer: Math.min(p.H * 0.32, p.W * 0.18),         // outer corner chamfer
    dustGap: 0,                                            // dust flap touches the back/front wall (no gap)
    slotW: Math.min(p.W * 0.08, inToPt(0.18)),             // lock slot width
    slotH: Math.min(p.W * 0.32, inToPt(0.55)),             // lock slot height (vertical capsule)
    slotInsetX: Math.min(p.L * 0.18, inToPt(2)),           // slot distance from each L edge of the bottom panel
  };
}

// Vertical capsule (rounded rectangle, tall). Used for the bottom-panel lock
// slots. Two semicircles + two straight sides, flattened into a polyline.
function capsule(cx: number, cy: number, w: number, h: number, segs = 10): Polyline {
  const r = w / 2;
  const straight = Math.max(0, h - 2 * r);
  const topCy = cy - h / 2 + r;
  const botCy = cy + h / 2 - r;
  // Top semicircle: rightmost → up → leftmost   (angle 0 → -π in y-down coords)
  const top = arcPoints(cx, topCy, r, 0, -Math.PI, segs);
  // Bottom semicircle: leftmost → down → rightmost  (angle π → 0 through π/2)
  const bot = arcPoints(cx, botCy, r, Math.PI, 0, segs);
  const pts: Pt[] = [...top];
  if (straight > 0) pts.push([cx - r, botCy]);
  pts.push(...bot);
  if (straight > 0) pts.push([cx + r, topCy]);
  return { pts, closed: true };
}

export function buildRollEndMailer(p: RollEndMailerParams): Dieline {
  const { L, W, H, bleed, tongue, tongueOut, tongueR } = p;
  const { dustH, dustChamfer: dc, dustGap, slotW, slotH, slotInsetX } = rollEndMailerDetails(p);

  // x boundaries — the SIDE WALL extends by H (the wall height when folded),
  // NOT by W. Width in flat = H per side; depth along y matches the bottom
  // panel (W). So bboxW = L + 2H. (Easy to flip if I'd thought "wall is W
  // wide because it sits next to a W-deep bottom" — but the wall's x-extent
  // becomes its 3D height when it folds up.)
  // The dieline's x-extent is normally L + 2H (left wall + bottom + right wall).
  // If the tongue's ear extensions stick out further than the side walls (which
  // they shouldn't with defaultParams clamping tongueOut ≤ H, but a user could
  // override) we widen the bbox to fit them.
  const xL_out = 0;
  const xL_hin = H;           // left wall / bottom hinge
  const xR_hin = H + L;       // bottom / right wall hinge
  const xR_out = H + L + H;   // right wall outer = L + 2H
  const bboxW = xR_out;

  // y levels (top to bottom, after shifting so the tongue top sits at y=0)
  const yTongueTop = 0;
  const yLidTop = tongue;             // = tongue bottom (lid/tongue hinge)
  const yBackTop = yLidTop + W;       // = lid bottom (lid/back hinge)
  const yBotTop = yBackTop + H;       // = back wall bottom (back/bottom hinge)
  const yBotBot = yBotTop + W;        // = bottom bottom (bottom/front hinge)
  const yFrontBot = yBotBot + H;
  const bboxH = yFrontBot;

  // Tongue lateral extent — extends BEYOND the lid by `tongueOut` on each side.
  // These form the rounded "ear" lock tabs that wrap around to grab the front
  // wall edge when the lid closes.
  const xTongueL = xL_hin - tongueOut;
  const xTongueR = xR_hin + tongueOut;

  // ---- CUT outline: outer perimeter, walked clockwise ----
  const cut: Pt[] = [];
  const P = (x: number, y: number) => cut.push([x, y]);

  // Start at the LID'S TOP-LEFT corner (xL_hin, yLidTop). This is a concave
  // corner — the tongue ear extends LEFTWARD from here, and the lid extends
  // DOWNWARD. Walking clockwise (interior on our left), we first head LEFT
  // along the left ear's bottom edge.
  P(xL_hin, yLidTop);
  P(xTongueL, yLidTop);                              // LEFT along left ear's bottom
  // UP the tongue's left side to the start of the rounded top-left corner
  P(xTongueL, yTongueTop + tongueR);
  // Top-left rounded corner — arc center at (xTongueL+tongueR, yTongueTop+tongueR)
  for (const pt of arcPoints(xTongueL + tongueR, yTongueTop + tongueR, tongueR, Math.PI, 3 * Math.PI / 2, 8)) cut.push(pt);
  // ACROSS the flat top of the tongue
  P(xTongueR - tongueR, yTongueTop);
  // Top-right rounded corner
  for (const pt of arcPoints(xTongueR - tongueR, yTongueTop + tongueR, tongueR, 3 * Math.PI / 2, 2 * Math.PI, 8)) cut.push(pt);
  // DOWN the tongue's right side
  P(xTongueR, yLidTop);
  // LEFT along the right ear's bottom back to the lid's top-right corner
  P(xR_hin, yLidTop);
  // DOWN the lid's right edge + back wall's right edge
  P(xR_hin, yBotTop);
  // Into the UPPER-RIGHT DUST FLAP. The dust flap is at x ∈ [xR_hin+dustGap, xR_out],
  // y ∈ [yBotTop - dustH, yBotTop]. Hinge: y=yBotTop. So the dust flap's LEFT edge
  // (x=xR_hin+dustGap) is a cut from y=yBotTop UP to y=yBotTop-dustH.
  P(xR_hin + dustGap, yBotTop);                       // jump (small gap edge)
  P(xR_hin + dustGap, yBotTop - dustH + dc);          // up dust flap inner edge
  P(xR_hin + dustGap + dc, yBotTop - dustH);          // inner-top chamfered corner
  P(xR_out - dc, yBotTop - dustH);                    // across dust flap top
  P(xR_out, yBotTop - dustH + dc);                    // outer-top chamfered corner
  P(xR_out, yBotTop);                                 // down dust flap outer (= right wall top-right)
  // DOWN the right wall's outer edge
  P(xR_out, yBotBot);
  // Into the LOWER-RIGHT DUST FLAP (mirror of upper-right)
  P(xR_out, yBotBot + dustH - dc);                    // outer-bot chamfer
  P(xR_out - dc, yBotBot + dustH);                    // chamfered corner
  P(xR_hin + dustGap + dc, yBotBot + dustH);          // across dust flap bottom
  P(xR_hin + dustGap, yBotBot + dustH - dc);          // inner-bot chamfered corner
  P(xR_hin + dustGap, yBotBot);                       // up dust flap inner edge
  // Up the right edge of front wall (back to the bottom/front hinge corner)
  P(xR_hin, yBotBot);
  P(xR_hin, yFrontBot);                               // down front wall's right edge
  // ACROSS front wall's bottom
  P(xL_hin, yFrontBot);
  // UP front wall's left edge to bottom panel corner
  P(xL_hin, yBotBot);
  // Into LOWER-LEFT dust flap (mirror of lower-right)
  P(xL_hin - dustGap, yBotBot);
  P(xL_hin - dustGap, yBotBot + dustH - dc);
  P(xL_hin - dustGap - dc, yBotBot + dustH);
  P(xL_out + dc, yBotBot + dustH);
  P(xL_out, yBotBot + dustH - dc);
  P(xL_out, yBotBot);
  // UP left wall's outer edge
  P(xL_out, yBotTop);
  // Into UPPER-LEFT dust flap (mirror of upper-right)
  P(xL_out, yBotTop - dustH + dc);
  P(xL_out + dc, yBotTop - dustH);
  P(xL_hin - dustGap - dc, yBotTop - dustH);
  P(xL_hin - dustGap, yBotTop - dustH + dc);
  P(xL_hin - dustGap, yBotTop);
  // UP the back wall's left edge + lid's left edge back to start
  P(xL_hin, yBotTop);
  P(xL_hin, yLidTop);

  const outerCut: Polyline = { pts: cut, closed: true };

  // Two vertical capsule lock slots cut into the bottom panel
  const slotY = (yBotTop + yBotBot) / 2;
  const leftSlot = capsule(xL_hin + slotInsetX, slotY, slotW, slotH);
  const rightSlot = capsule(xR_hin - slotInsetX, slotY, slotW, slotH);

  // ---- CREASE / fold lines ----
  const crease: Polyline[] = [];
  const line = (a: Pt, b: Pt): Polyline => ({ pts: [a, b], closed: false });

  // Vertical hinges at x = xL_hin and x = xR_hin (left wall ↔ bottom, right wall ↔ bottom)
  crease.push(line([xL_hin, yBotTop], [xL_hin, yBotBot]));
  crease.push(line([xR_hin, yBotTop], [xR_hin, yBotBot]));

  // Horizontal hinges across the body width (lid/back, back/bottom, bottom/front)
  crease.push(line([xL_hin, yLidTop], [xR_hin, yLidTop]));    // lid ↔ tongue (narrower span)
  crease.push(line([xL_hin, yBackTop], [xR_hin, yBackTop]));  // lid ↔ back wall
  crease.push(line([xL_hin, yBotTop], [xR_hin, yBotTop]));    // back ↔ bottom
  crease.push(line([xL_hin, yBotBot], [xR_hin, yBotBot]));    // bottom ↔ front

  // Dust flap hinges (horizontal) — each dust flap hinges to a SIDE WALL's
  // top or bottom edge. Spans the side wall's x range minus the small gap.
  crease.push(line([xL_out, yBotTop], [xL_hin - dustGap, yBotTop]));   // upper-left dust ↔ left wall
  crease.push(line([xR_hin + dustGap, yBotTop], [xR_out, yBotTop]));   // upper-right ↔ right wall
  crease.push(line([xL_out, yBotBot], [xL_hin - dustGap, yBotBot]));   // lower-left ↔ left wall
  crease.push(line([xR_hin + dustGap, yBotBot], [xR_out, yBotBot]));   // lower-right ↔ right wall

  // Tongue/lid hinge — the tongue sits above the lid, hinged along the lid's
  // full top width. The lateral ear extensions are NOT on the hinge (they're
  // free cut edges that wrap around when the lid closes).
  // crease[2] is already [xL_hin, yLidTop] → [xR_hin, yLidTop] from above —
  // exactly what we want; no adjustment needed.

  // ---- BLEED — contour offset of the outer perimeter only ----
  // The interior lock slots don't need a bleed offset (they're holes punched
  // through the dieline, not edges that get printed up to).
  const bleedBox: Polyline = bleedFromCut(outerCut, bleed);

  // ---- preview dimension arrows ----
  const dims: DimLine[] = [
    { x1: xL_hin, y1: (yBotTop + yBotBot) / 2, x2: xR_hin, y2: (yBotTop + yBotBot) / 2, key: "L" },
    { x1: 0,      y1: (yBotTop + yBotBot) / 2, x2: xL_hin, y2: (yBotTop + yBotBot) / 2, key: "W" },
    { x1: xR_out + bleed + 22, y1: yBackTop, x2: xR_out + bleed + 22, y2: yBotTop, key: "H", vertical: true },
  ];
  const labels: DieLabel[] = [];

  return {
    paths: {
      cut: [outerCut, leftSlot, rightSlot],
      crease,
      bleed: [bleedBox],
      glue: [],  // one-piece, no glue layer
    },
    widthPt: bboxW,
    heightPt: bboxH,
    bleedPt: bleed,
    labels,
    dims,
  };
}
