// ─────────────────────────────────────────────────────────────────────────────
// Central SEO / site configuration — the ONE place to set the production domain
// and all metadata used by <head> tags, Open Graph, Twitter cards, JSON-LD
// structured data, the sitemap, robots.txt and llms.txt.
//
// ►►► BEFORE LAUNCH: set SITE_URL to your real domain (and update the same host
//     in public/robots.txt + public/llms.txt, or just re-run `npm run build`,
//     which regenerates sitemap.xml/llms.txt from SITE_URL). ◄◄◄
//
// This module is intentionally framework-free (no React/DOM imports) so the
// build-time generator (scripts/seo-gen.ts) can import the exact same helpers
// the app uses — the metadata can never drift between runtime and build.
// ─────────────────────────────────────────────────────────────────────────────
import type { ModelEntry } from "../core/models/registry";

/** Production origin, no trailing slash. (Canonical = www; the build rewrites
 *  the non-www placeholder below into this across sitemap/robots/pages.) */
export const SITE_URL = "https://www.diecutstudio.com";
export const SITE_NAME = "Die Cut Studio";
export const SITE_TAGLINE = "Free Dieline & Box Template Generator";
export const LOCALE = "en_US";
/** Optional social handle, e.g. "@diecutstudio". Leave "" if none. */
export const TWITTER_HANDLE = "";

export const SITE_DESCRIPTION =
  "Design print-ready box dielines in your browser — free. Pick a template, type the " +
  "size, preview it folded in 3D, and export a 1:1 PDF, SVG or DXF cut file for Cricut, " +
  "Silhouette and laser cutters. No signup.";

export const OG_IMAGE = `${SITE_URL}/og-image.png`;

/** Head keywords + the vocabulary we want to rank for (also seeds llms.txt). */
export const PRIMARY_KEYWORDS = [
  "dieline generator", "box template", "die cut template", "dieline maker",
  "free dieline", "box dieline", "packaging template", "SVG box template",
  "Cricut box template", "Silhouette dieline", "print and cut box", "gift box template",
  "papercraft template", "cut file", "DXF dieline", "custom box template",
  "tuck box template", "gift tag SVG", "envelope template", "favor box template",
  "packaging mockup", "free box maker", "foldable box template", "carton dieline",
  "animal treat box template", "party favor box", "kids party favor box",
  "bunny box template", "treat box SVG", "cupcake wrapper template", "printable favor box",
];

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  keywords?: string;
  image?: string;
  type?: "website" | "article";
}

/* ── URL helpers ──────────────────────────────────────────────────────────── */

/** In-app navigation path for a model (optionally with variant params). */
export function modelPath(id: string, params?: Record<string, string>): string {
  const extra = params
    ? Object.entries(params).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join("")
    : "";
  return `/editor?model=${id}${extra}`;
}

/** SEO slug for a model's content page (kebab-case of its display name). */
export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
export function modelSlug(m: ModelEntry): string {
  return slugify(m.name);
}
/** In-app path / absolute URL for a model's CONTENT (template) page. */
export function templatePath(m: ModelEntry): string {
  return `/templates/${modelSlug(m)}`;
}
export function templateUrl(m: ModelEntry): string {
  return `${SITE_URL}/templates/${modelSlug(m)}`;
}
/** Absolute editor URL (the interactive app view of a template). */
export function editorUrl(id: string): string {
  return `${SITE_URL}/editor?model=${id}`;
}
/** Canonical URL for a model = its content page. The /editor view declares the
 *  same canonical, consolidating ranking signals onto the content page. */
export function modelCanonical(m: ModelEntry): string {
  return templateUrl(m);
}

/* ── Per-page metadata ────────────────────────────────────────────────────── */

export function landingSeo(): SeoMeta {
  return {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    canonical: `${SITE_URL}/`,
    keywords: PRIMARY_KEYWORDS.join(", "),
    image: OG_IMAGE,
    type: "website",
  };
}

/** Clean a model's one-liner into a meta-description-friendly sentence. */
function cleanDesc(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function modelSeo(m: ModelEntry): SeoMeta {
  const longTitle = `${m.name} Template — Free Dieline Generator | ${SITE_NAME}`;
  const title = longTitle.length <= 65 ? longTitle : `${m.name} Dieline Template | ${SITE_NAME}`;
  const description =
    `${cleanDesc(m.description)} Type the size, preview it folded in 3D, and export a ` +
    `print-ready 1:1 PDF, SVG or DXF cut file. Free dieline maker for Cricut, Silhouette & laser cutters.`;
  return {
    title,
    description: description.slice(0, 300),
    canonical: modelCanonical(m),
    keywords: [
      `${m.name} template`, `${m.name} dieline`, `${m.name} SVG`, `${m.name} cut file`,
      ...PRIMARY_KEYWORDS.slice(0, 8),
    ].join(", "),
    image: OG_IMAGE,
    type: "article",
  };
}

/* ── Structured data (JSON-LD) ────────────────────────────────────────────── */

export function organizationLd() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#org`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/favicon.svg`,
    description: SITE_DESCRIPTION,
  };
}

export function websiteLd() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}/#org` },
    // Sitelinks search box → the landing reads ?q= and seeds the catalog search.
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function webApplicationLd() {
  return {
    "@type": "WebApplication",
    "@id": `${SITE_URL}/#app`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    applicationCategory: "DesignApplication",
    operatingSystem: "Any (web browser)",
    browserRequirements: "Requires JavaScript and a modern browser.",
    description: SITE_DESCRIPTION,
    featureList: [
      "Parametric box, tray, tag, envelope and party dieline templates",
      "Exact 1:1 physical scale (ruler-accurate output)",
      "Live 3D fold preview",
      "Export print-ready PDF, SVG and DXF cut files",
      "Cricut, Silhouette and laser cutter compatible",
    ],
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    isAccessibleForFree: true,
    publisher: { "@id": `${SITE_URL}/#org` },
  };
}

/** Canonical site FAQ — rendered visibly AND emitted as FAQPage JSON-LD. */
export const SITE_FAQ: { q: string; a: string }[] = [
  {
    q: "What is a dieline?",
    a: "A dieline is the flat, unfolded outline of a box or package showing exactly where to cut (the trim) and where to score or fold (the creases). Die Cut Studio generates dielines parametrically from the dimensions you type.",
  },
  {
    q: "Is Die Cut Studio free?",
    a: "Yes. It runs entirely in your browser with no signup, no account and no watermark. The dielines you generate are yours to use for personal and commercial projects.",
  },
  {
    q: "What file formats can I export?",
    a: "PDF (exact point units), SVG (real inches/mm, Silhouette-safe) and DXF (millimetres, R12) — all at true 1:1 scale so they print and cut ruler-accurate.",
  },
  {
    q: "Does it work with Cricut and Silhouette?",
    a: "Yes. Export an SVG (Designer Edition and Cricut Design Space) or DXF (free Silhouette edition). Cut vs. score is mapped by line colour or layer — blue is cut, red is score.",
  },
  {
    q: "Do the templates come out the right size?",
    a: "Yes. All geometry is stored in PDF points (1 inch = 72 points). If you print or import at 100% with no scaling, the template is exact to the millimetre.",
  },
  {
    q: "What can I make with it?",
    a: "Tuck boxes, mailers, trays, sleeves, drawer and gift boxes, shipping boxes (RSC), envelopes, gift tags, jar labels, jewelry display cards, cupcake wrappers, belly bands, party favors, animal treat boxes (bunny, cat, bear, fox, panda, pig, owl, dog, lion, unicorn and more) and paper decorations — 50+ parametric templates.",
  },
];

export function faqLd() {
  return {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: SITE_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Static graph injected into index.html (crawler-visible without JS). */
export function siteGraphLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationLd(), websiteLd(), webApplicationLd(), faqLd()],
  };
}

/** Per-model graph (breadcrumb + HowTo) set dynamically when the editor opens. */
export function modelLd(m: ModelEntry, categoryLabel: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Templates", item: `${SITE_URL}/docs` },
          { "@type": "ListItem", position: 3, name: categoryLabel, item: `${SITE_URL}/docs` },
          { "@type": "ListItem", position: 4, name: m.name, item: modelCanonical(m) },
        ],
      },
      {
        "@type": "HowTo",
        name: `How to make a ${m.name} dieline template`,
        description: cleanDesc(m.description),
        totalTime: "PT2M",
        tool: [{ "@type": "HowToTool", name: "Cricut, Silhouette or any cutting machine" }],
        step: [
          { "@type": "HowToStep", name: "Pick the template", text: `Open the ${m.name} template in Die Cut Studio.` },
          { "@type": "HowToStep", name: "Enter the size", text: "Type the length, width and height in inches or millimetres." },
          { "@type": "HowToStep", name: "Preview", text: "Watch the dieline update and the box fold in 3D." },
          { "@type": "HowToStep", name: "Export", text: "Download a 1:1 PDF, SVG or DXF cut file and cut it on your machine." },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: modelFaqItems(m).map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

/* ── Per-template content-page copy ───────────────────────────────────────────
 * Shared by the React TemplatePage AND the static build-time HTML (scripts/
 * seo-gen.ts), so the crawlable copy can never drift from the live page. */

export interface QA { q: string; a: string; }

function fmtSize(m: ModelEntry): string {
  const d = m.defaultDimensions;
  return `${d.L} × ${d.W}${d.H ? " × " + d.H : ""} in`;
}

/** Step-by-step how-to (also feeds the HowTo JSON-LD). */
export function howToSteps(m: ModelEntry): { name: string; text: string }[] {
  return [
    { name: `Open the ${m.name} template`, text: `Start from the ready-made ${m.name} template — no drawing, no hand-measuring.` },
    { name: "Enter your size", text: "Type the length, width and height in inches or millimetres; the dieline rebuilds instantly." },
    { name: "Preview it folded", text: "Watch the flat dieline and the folded 3D box update live as you type." },
    { name: "Export & cut", text: "Download a 1:1 PDF, SVG or DXF and cut it on a Cricut, Silhouette or laser cutter." },
  ];
}

/** Per-model FAQ (visible on the page AND emitted as FAQPage JSON-LD). */
export function modelFaqItems(m: ModelEntry): QA[] {
  const sz = fmtSize(m);
  return [
    { q: `Is the ${m.name} template free?`, a: `Yes. The ${m.name} dieline generates free in your browser — no signup and no watermark — and is yours to use for personal and commercial projects.` },
    { q: `What size can I make the ${m.name}?`, a: `Any size — it's parametric. Type your own dimensions (a typical ${m.name} is about ${sz}) or pick a preset, and the dieline resizes exactly.` },
    { q: `What files do I get?`, a: `A print-ready PDF, SVG and DXF at true 1:1 scale, so your ${m.name} prints and cuts ruler-accurate on any machine.` },
    { q: `Does the ${m.name} work with Cricut and Silhouette?`, a: `Yes — export SVG (Cricut Design Space, Silhouette Designer Edition) or DXF (free Silhouette edition). Blue lines cut, red lines score.` },
  ];
}

const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Crawlable body markup for a template page — used by BOTH the static build
 *  output and the React page (dangerouslySetInnerHTML) so the copy is identical.
 *  `related` are same-category cross-links {name, href}. */
export function templateContentHtml(
  m: ModelEntry,
  categoryLabel: string,
  related: { name: string; href: string }[],
): string {
  const steps = howToSteps(m)
    .map((s, i) => `<li><strong>${i + 1}. ${escHtml(s.name)}.</strong> ${escHtml(s.text)}</li>`)
    .join("");
  const faq = modelFaqItems(m)
    .map((f) => `<dt>${escHtml(f.q)}</dt><dd>${escHtml(f.a)}</dd>`)
    .join("");
  const rel = related
    .map((r) => `<li><a href="${r.href}">${escHtml(r.name)} template</a></li>`)
    .join("");
  return `<nav class="seo-bc" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/docs">Templates</a> › ${escHtml(categoryLabel)} › <span>${escHtml(m.name)}</span></nav>
<h1>${escHtml(m.name)} template — free dieline generator</h1>
<p class="seo-lead">${escHtml(cleanDesc(m.description))} Design it at the exact size you need, preview it folded in 3D, and export a print-ready <strong>1:1 PDF, SVG or DXF</strong> cut file — free, no signup.</p>
<p><a class="seo-cta" href="/editor?model=${m.id}">Open the ${escHtml(m.name)} in the editor →</a></p>
<h2>How to make a ${escHtml(m.name)}</h2>
<ol class="seo-steps">${steps}</ol>
<h2>Details</h2>
<ul class="seo-specs">
<li><strong>Category:</strong> ${escHtml(categoryLabel)}</li>
<li><strong>Typical size:</strong> ${fmtSize(m)} — fully adjustable</li>
<li><strong>Exports:</strong> PDF · SVG · DXF at exact 1:1 scale</li>
<li><strong>Works with:</strong> Cricut, Silhouette &amp; laser cutters</li>
<li><strong>Price:</strong> Free — no account, no watermark</li>
</ul>
<h2>${escHtml(m.name)} — frequently asked questions</h2>
<dl class="seo-faq">${faq}</dl>
${rel ? `<h2>Related templates</h2><ul class="seo-related">${rel}</ul>` : ""}
<p><a class="seo-cta" href="/editor?model=${m.id}">Make your ${escHtml(m.name)} now →</a></p>`;
}

/* ── Docs / "template library" hub ────────────────────────────────────────── */

export function docsSeo(): SeoMeta {
  return {
    title: `Template Library — All Free Dieline Templates | ${SITE_NAME}`,
    description:
      "Browse every Die Cut Studio template — boxes, trays, mailers, envelopes, " +
      "gift tags, labels, jewelry display cards, party favors, animal treat boxes " +
      "and paper decorations. Each has its own page with sizing help and a one-click " +
      "jump into the free editor. 50+ parametric dieline templates, exact 1:1 scale.",
    canonical: `${SITE_URL}/docs`,
    keywords: ["dieline templates", "box template library", "free packaging templates", "animal treat box template", "party favor box", ...PRIMARY_KEYWORDS.slice(0, 8)].join(", "),
    image: OG_IMAGE,
    type: "website",
  };
}

/** One-line, keyword-rich descriptor per category for the docs hub (also helps
 *  users scan). Keyed by CategoryId; unknown categories just render no blurb. */
export const CATEGORY_BLURB: Record<string, string> = {
  boxes:
    "Folding-carton workhorses — tuck boxes, mailers, trays, sleeves, drawer and gift boxes, telescoping lids and corrugated shipping boxes (RSC). Every one is parametric: type your product size and the dieline rebuilds exactly.",
  animals:
    "A whole line of animal treat / favour boxes — bunny, cat, bear, fox, panda, pig, owl, dog, lion, unicorn, frog, mouse and sheep, plus the seasonal bat (Halloween), chick (Easter) and reindeer (Christmas). Each is a four-corner glued box with a tuck-top lid and a printable, recolourable face — made for kids' parties, baby showers and holiday favors.",
  "envelopes-cards":
    "A-style and baronial envelopes plus folded gift-card holders, in announcement, wedding and standard sizes — with optional contrast liners.",
  "tags-wraps":
    "Gift tags, jar and product labels, bookmarks, cupcake wrappers and belly bands — small wraps and labels that gang many-up on a single sheet to save material.",
  "display-cards":
    "Product display cards for handmade sellers — earring, necklace and hair-bow / clip cards with hang holes and retainer slots sized to your piece.",
  party:
    "Party favours and celebration pieces — pyramid favour boxes, bunting banners, paper rosettes, place cards / table tents and layered paper flowers. (The animal treat boxes have their own category above.)",
  organizers:
    "Craft organizers and studio helpers, like embroidery-floss bobbin cards — print-and-cut tools that keep your supplies tidy.",
  decor:
    "Paper decorations for backdrops and garlands — slit lanterns, 3D folded stars, geometric snowflakes and layered paper flowers.",
};

/** Docs hub body — every template grouped by category (with a keyword-rich
 *  blurb per category), each linking to its content page. Shared by DocsPage
 *  (React) AND the static build so they match. Takes the lists as params so this
 *  module stays registry-free. */
export function docsContentHtml(
  models: ModelEntry[],
  categories: { id: string; label: string }[],
): string {
  const sections = categories
    .map((c) => {
      const inCat = models.filter((m) => m.category === c.id);
      if (!inCat.length) return "";
      const blurb = CATEGORY_BLURB[c.id] ? `<p>${escHtml(CATEGORY_BLURB[c.id])}</p>\n` : "";
      const lis = inCat
        .map((m) => `<li><a href="${templatePath(m)}">${escHtml(m.name)}</a> — ${escHtml(cleanDesc(m.description))}</li>`)
        .join("");
      return `<h2>${escHtml(c.label)} (${inCat.length})</h2>\n${blurb}<ul class="seo-related">${lis}</ul>`;
    })
    .filter(Boolean)
    .join("\n");
  return `<nav class="seo-bc" aria-label="Breadcrumb"><a href="/">Home</a> › <span>Template library</span></nav>
<h1>Free dieline & box template library</h1>
<p class="seo-lead">Every ${SITE_NAME} template, each with its own page — what it is, how to size it, and a one-click jump into the free editor. ${models.length} parametric templates across ${categories.filter((c) => models.some((m) => m.category === c.id)).length} categories — boxes, envelopes, tags, labels, display cards, party favors, animal treat boxes and paper decorations — all at exact 1:1 scale, exported as print-ready PDF · SVG · DXF cut files for Cricut, Silhouette and laser cutters.</p>
<p><a class="seo-cta" href="/#templates">Browse the visual gallery →</a> &nbsp; <a class="seo-cta" href="/editor">Open the editor →</a></p>
${sections}`;
}

/** Structured data for the docs hub (CollectionPage + Breadcrumb + ItemList of
 *  every template). Shared by the live DocsPage and the static build so the
 *  emitted JSON-LD can't drift. */
export function docsLd(
  models: ModelEntry[],
  _categories: { id: string; label: string }[],
) {
  const seo = docsSeo();
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": `${SITE_URL}/docs`, url: `${SITE_URL}/docs`, name: "Template library", description: seo.description },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Template library", item: `${SITE_URL}/docs` },
        ],
      },
      {
        "@type": "ItemList",
        numberOfItems: models.length,
        itemListElement: models.map((m, i) => ({
          "@type": "ListItem", position: i + 1, name: m.name, url: templateUrl(m),
        })),
      },
    ],
  };
}
