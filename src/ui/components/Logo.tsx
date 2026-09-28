// Die Cut Studio brand — the wordmark lockup ("Blush" finalist).
//
// "Die Cut Studio" set in Bricolage Grotesque, two-tone (deep maroon + a muted
// tint), with the dieline triad replacing the "o" in Studio:
//   cut    = solid blue disc
//   crease = solid red ring   (equal outer Ø: ring r = disc r − strokeWidth/2)
//   bleed  = solid green ring
// The triad alone (public/favicon.svg) is the compact icon / favicon.
// `size` is the wordmark FONT SIZE in px; the triad-"o" scales with the type.

export const BRAND = {
  blush: "#ffe7ea",      // signature ground
  text: "#4a1f28",       // "Die Cut" — deep maroon
  textMuted: "#9c6a72",  // "Studio" — muted maroon
  cut: "#2a45c4",
  crease: "#e0322b",
  bleed: "#2bb24c",
};

// Back-compat: the layer hues, still exported under the old name.
export const BRAND_COLORS = { cut: BRAND.cut, crease: BRAND.crease, bleed: BRAND.bleed };

export function Logo({ size = 20, title = "Die Cut Studio" }: { size?: number; title?: string }) {
  return (
    <span
      role="img"
      aria-label={title}
      style={{
        fontFamily: '"Bricolage Grotesque", "Plus Jakarta Sans", system-ui, sans-serif',
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "-0.012em",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: BRAND.text, marginRight: "0.24em" }}>Die&nbsp;Cut</span>
      <span style={{ color: BRAND.textMuted }}>Studi</span>
      <svg viewBox="0 0 61 30" aria-hidden="true" style={{ height: "0.74em", width: "auto", display: "block" }}>
        <circle cx="16" cy="15" r="13" fill={BRAND.cut} />
        <circle cx="32" cy="15" r="11.5" fill="none" stroke={BRAND.crease} strokeWidth={3} />
        <circle cx="45" cy="15" r="11.5" fill="none" stroke={BRAND.bleed} strokeWidth={3} />
      </svg>
    </span>
  );
}

export default Logo;
