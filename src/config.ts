// Build-time feature flags. Keep these few and obvious.

/**
 * PRINT & CUT — drop a logo/photo onto a template, see it on the 2D canvas and
 * the 3D box, and embed it into the PDF / SVG export (DXF stays cut-only).
 *
 * This is the SINGLE switch for the whole feature. Set it to `false` to disable
 * Print & Cut everywhere: the editor hides the "Print & Cut" rail section and
 * the canvas image-drop target, and any artwork saved in a previous session is
 * NOT restored. With no way to add artwork, the 2D preview, the 3D box, and the
 * exporters all fall back to cut-only on their own — so nothing downstream needs
 * a flag check.
 *
 * The export-layer plumbing (PdfOptions.image, SvgOptions.image, the 3D
 * buildPrintCtx decal) is left in place but is never exercised while this is
 * off. Flip to `false` to ship without the feature, or as the first step before
 * deleting it outright (every gated block references this constant).
 */
// Typed as `boolean` (not the literal `true`) so flipping the value never
// changes what the type-checker considers reachable — both branches stay live.
export const PRINT_AND_CUT_ENABLED: boolean = true;
