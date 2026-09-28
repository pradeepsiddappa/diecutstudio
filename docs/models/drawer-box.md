# Drawer Box — Slide / Matchbox (sleeve + tray)

A **two-piece set**: an inner open **tray (the "drawer")** that slides into an
outer open-ended **sleeve (the "cover")**. The classic matchbox / slide box.
Gift sets, jewelry, premium small goods.

**Code:** `src/core/models/drawerBox.ts`
**Status:** ✅ built — composes the existing `openTray` + `openSleeve`
**Implemented from:** public structural conventions; reuses our parametric tray
and sleeve.

## The key idea — auto-nesting

This is the model where *"everything depends on each other."* You enter the
**drawer** size; the **sleeve is sized automatically** to wrap it with a slide
clearance. Change the drawer and the sleeve follows — you never size the two
pieces independently.

```
slide gap        clr  = 0.8mm                        (pure breathing room)
drawer (tray)    = openTray(L, W, H)                 -> assembled outer L × W × H
sleeve (cover)   = openSleeve(L, W + 2t + clr, H + 2t + clr)
                   -> tube of length L. The +2t matters: the sleeve's OWN walls
                      (thickness t each side) shrink its inner cavity, so its
                      panel cross must be drawerOuter + 2t just to MATCH the
                      drawer; the +clr on top is the real slide gap. With exact
                      dims (no compensation) the drawer would jam.
```

The drawer slides out the open ends of the sleeve along **L**.

## Dimension semantics

| Input | Meaning | Drives |
|---|---|---|
| **L** | drawer length (the slide axis) | tray length **and** sleeve length |
| **W** | drawer width | tray width **and** sleeve cross-width (+ clearance) |
| **H** | drawer height | tray wall height **and** sleeve cross-height (+ clearance) |

## Output — one dieline, two pieces

Both flats are laid out in a **single dieline**, drawer on top and sleeve below
(separated by a gap), so it:
- exports as **one** PDF/SVG/DXF with both pieces,
- fits-checks against the **combined** sheet size,
- shows both pieces in the editor, each with its own white-paper backing
  (`Dieline.pieces` lists each piece's outer outline).

```
┌──────────────────────────────┐
│   DRAWER (open tray, cross)   │   ← L × W base + 4 walls + corner glue flaps
└──────────────────────────────┘
            (gap)
┌──────────────────────────────┐
│   SLEEVE (open tube strip)    │   ← wraps the drawer; length L, both ends open
└──────────────────────────────┘
```

## Flat-size formula

```
flat_width  = max( tray_width , sleeve_width )
            = max( L + 2H , glueFlap + 2(W+clr) + 2(H+clr) )
flat_height = tray_height + gap + sleeve_height
            = (W + 2H) + gap + L
```

## Parameters & defaults

`defaultParams(L, W, H)`:

| Param | Formula | Notes |
|---|---|---|
| `clearance` | `0.8mm` | pure slide gap (the sleeve's own `2t` is added on top in the build) |
| `gap` | `16mm` | spacing between the two flats on the sheet |

## 3D preview

`has3DPreview: true`. The shared `buildFoldable` has a `drawer` closure: a
static outer **sleeve tube** (open at both ends) plus an inner **open-top tray**
(slightly tinted to distinguish it) in a group that **slides out** along the
length as the fold slider moves (closed = drawer in, open = drawer slid out).
The sleeve is drawn a hair larger than the drawer (visual clearance).

## v1 limitations / future work

- The nesting uses a simple uniform clearance; per-face thickness compensation
  (a fuller inner/outer dimension model) is future work.
- Drawer + sleeve currently share one set of L/W/H; a future option could let
  the sleeve be shorter than the drawer (so it sticks out for grip).

## Changelog

- 2026-06-09 initial build — composes openTray + openSleeve with auto-nesting,
  two pieces in one dieline (introduces `Dieline.pieces`).
