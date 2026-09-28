# Print & Cut — printing artwork and cutting it out

Die Cut Studio lets you drop a logo or photo onto a piece (the **Print & Cut**
rail section in the editor), then export it so a craft cutter prints the design
and cuts the shape out. This page explains the two export paths and how to set
each machine up.

> **Why we don't add registration marks for you.** The little marks a cutter
> scans to line up the cut with the print are **different on every machine** —
> Silhouette uses an L-bracket + corner bars, Cricut a solid sensor rectangle in
> a fixed corner, Graphtec/Roland optical crosshairs, Brother ScanNCut a full
> mat scan. Their size, position, and quiet-zones are finicky (a few millimetres
> off and the machine won't register). So instead of guessing, we hand you clean
> files and let **your** cutter software add **its** marks — which it does
> automatically when you enable Print & Cut. (We may add per-machine mark presets
> later, but only after a real cut-test on that hardware.)

## Previewing the print

After you place artwork, it shows in two places so you can check it before
exporting:

- **Flat canvas** — clipped to the cut shape, with holes punched through.
- **3D preview** (for box/carton models) — the artwork is rendered **on the
  folded box**, split across the panels and folding with them, so you can see
  how your design wraps around the front, sides, and flaps. Drag/resize/rotate
  the image and the 3D updates. (Flat items like tags and cards have no 3D
  preview — the flat canvas is the preview.)

## Two ways to export

### 1. Combined file (simplest — Silhouette / Cricut)

Use the normal **Export PDF** or **Export SVG** buttons. The file carries your
artwork (the print layer) **and** the cut/score lines together. Open it in your
cutter software, turn on Print & Cut, and it handles both:

- **Cut / Trim** lines are **blue**, **Crease / Fold** lines are **red** — map
  them in your software (Silhouette: *Cut by Line Colour* → blue = Cut, red =
  Score). DXF/SVG layer names `CUT` / `CREASE` work in Business/Designer editions.

### 2. Print & Cut pair (separate print + cut)

Use **Export Print & Cut pair**. You get two files:

- **`…_print.pdf`** — your artwork at exact 1:1 size, **no cut/score lines** (so
  they never get inked onto the finished piece). Print this.
- **`…_cut.svg`** — the cut + score **lines only**, no artwork. Load this into
  the cutter.

Use this when you print from one app (a nicer printer / a print shop) and cut
from another, or when you don't want the fold lines printed on the product.

> The pair is **single-piece only**. Full-sheet (n-up) export omits the artwork —
> a single placed image can't map onto many stamped copies.

## Per-machine quick steps

| Machine | How to Print & Cut |
|---|---|
| **Silhouette Studio** | Open the combined SVG → **Page Setup ▸ Registration Marks ▸ On** (Type 1/Designer) → **Print** (prints art + marks) → load the sheet → **Send/Cut** (the camera reads the marks). |
| **Cricut Design Space** | Upload the combined SVG → the printable image plus a separate **Cut** layer → **Flatten** the art for print → **Make It** → *Print Then Cut* prints art + the sensor rectangle, then cuts. (Cricut limits the print area — keep the design within ~6.75 × 9.25 in.) |
| **Graphtec / Roland** | Print the art with the machine's crosshair marks (from Cutting Master / Roland CutStudio), then load and let the optical sensor register. |
| **Brother ScanNCut** | Print the art, place it on the mat, **Scan** the mat, position the cut data over the scan, then cut. |

## Bleed & printable safe area

- The exported page size already includes the **bleed** margin you set (default
  0.125 in). Bleed = art that runs slightly past the cut so a tiny registration
  drift doesn't leave a white sliver at the edge. Keep important art (text,
  faces) a few mm **inside** the cut line.
- Home inkjet/laser printers can't print to the very edge of the paper (~0.25 in
  unprintable border). When you print a small piece on a bigger sheet at **100%
  (no scaling)** this is a non-issue. If you tile many pieces yourself, keep them
  inside the printer's margin.
- Always print at **100% / Actual size** — never "Fit to page", which rescales
  and breaks the 1:1 accuracy (and the registration).

## See also

- `README.md` "Cutting machines" — cut-vs-score colour/layer mapping.
