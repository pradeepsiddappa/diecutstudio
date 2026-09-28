// Build-time SEO generator. Runs AFTER `vite build` (see scripts/seo-build.mjs,
// wired into the npm "build" script). It reads the model registry — the single
// source of truth — and emits, into dist/:
//   • sitemap.xml                  (landing + every template's content page)
//   • llms.txt                     (LLM/AI-search summary + the template list)
//   • templates/<slug>/index.html  (a pre-rendered, crawlable CONTENT page per
//                                   template: unique title/meta/JSON-LD + body
//                                   copy — the canonical URL search engines rank)
//   • index.html                   (injects the full template link list; swaps
//                                   the placeholder domain for the real SITE_URL)
//   • robots.txt                   (swaps the placeholder domain)
// Keeping this generated from the registry means the SEO surface can never drift
// from the actual catalogue — add a model and it's a content page + sitemap entry
// automatically. The per-template body copy comes from the SAME siteConfig
// helper the React TemplatePage uses, so the static and live pages match.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { MODELS, CATEGORIES } from "../src/core/models/registry";
import {
  SITE_URL, SITE_NAME, SITE_DESCRIPTION, PRIMARY_KEYWORDS,
  modelSlug, templatePath, modelSeo, modelLd, templateContentHtml,
  docsSeo, docsContentHtml, docsLd,
} from "../src/seo/siteConfig";

const DIST = "dist";
const PLACEHOLDER = "https://diecutstudio.com";
const today = new Date().toISOString().slice(0, 10);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
const relatedFor = (model: typeof MODELS[number]) =>
  MODELS.filter((m) => m.category === model.category && m.id !== model.id)
    .slice(0, 6)
    .map((m) => ({ name: m.name, href: templatePath(m) }));

/* ── 1. sitemap.xml ───────────────────────────────────────────────────────── */
const urls = [
  { loc: `${SITE_URL}/`, priority: "1.0", changefreq: "weekly" },
  { loc: `${SITE_URL}/docs`, priority: "0.7", changefreq: "weekly" },
  { loc: `${SITE_URL}/editor`, priority: "0.6", changefreq: "monthly" },
  ...MODELS.map((m) => ({
    loc: `${SITE_URL}${templatePath(m)}`,
    priority: "0.8",
    changefreq: "monthly",
  })),
];
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;
writeFileSync(join(DIST, "sitemap.xml"), sitemap);

/* ── 2. llms.txt (AI-search / LLM-friendly summary) ───────────────────────── */
const byCat = CATEGORIES.map((c) => ({
  label: c.label,
  models: MODELS.filter((m) => m.category === c.id),
})).filter((g) => g.models.length);

const llms =
  `# ${SITE_NAME}\n\n` +
  `> ${SITE_DESCRIPTION}\n\n` +
  `${SITE_NAME} is a free, browser-based, parametric dieline generator. You type a ` +
  `box or package's dimensions and it produces a print-ready cut file (dieline) at ` +
  `exact 1:1 physical scale, with a live 3D fold preview. Everything runs client-side; ` +
  `there is no account, signup, paywall or watermark, and the output is free for ` +
  `personal and commercial use.\n\n` +
  `## How it works\n` +
  `1. Pick a template. 2. Type the length, width and height (inches or mm). ` +
  `3. Preview the dieline and the box folding in 3D. 4. Export a 1:1 PDF, SVG or DXF ` +
  `cut file for Cricut, Silhouette or a laser cutter.\n\n` +
  `## Templates\n` +
  byCat
    .map(
      (g) =>
        `### ${g.label}\n` +
        g.models
          .map((m) => `- [${m.name}](${SITE_URL}${templatePath(m)}): ${m.description}`)
          .join("\n"),
    )
    .join("\n\n") +
  `\n\n## Keywords\n${PRIMARY_KEYWORDS.join(", ")}\n\n` +
  `## Links\n` +
  `- Home: ${SITE_URL}/\n- Editor: ${SITE_URL}/editor\n- Sitemap: ${SITE_URL}/sitemap.xml\n`;
writeFileSync(join(DIST, "llms.txt"), llms);

/* ── 3. per-template static content pages ─────────────────────────────────── */
const idxPath = join(DIST, "index.html");
const BRAND_SVG =
  `<div class="seo-brand"><svg width="26" height="26" viewBox="0 0 61 30" aria-hidden="true">` +
  `<circle cx="16" cy="15" r="13" fill="#2a45c4"/>` +
  `<circle cx="34" cy="15" r="11.5" fill="none" stroke="#e0322b" stroke-width="3"/>` +
  `<circle cx="47" cy="15" r="11.5" fill="none" stroke="#2bb24c" stroke-width="3"/></svg> ` +
  `<a href="/" style="color:inherit;text-decoration:none">Die Cut Studio</a></div>`;

// Rewrite the <head> (title/meta/canonical/OG/Twitter + JSON-LD) of the built
// shell for a sub-page.
function applyHead(
  h: string,
  seo: { title: string; description: string; canonical: string },
  ogType: string,
  ld: string,
): string {
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(seo.title)}</title>`);
  h = h.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(seo.description)}$2`);
  h = h.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${seo.canonical}$2`);
  h = h.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(seo.title)}$2`);
  h = h.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(seo.description)}$2`);
  h = h.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${seo.canonical}$2`);
  h = h.replace(/(<meta property="og:type" content=")[^"]*(")/, `$1${ogType}$2`);
  h = h.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(seo.title)}$2`);
  h = h.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(seo.description)}$2`);
  h = h.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n${ld}\n</script>`,
  );
  return h;
}
// Replace the crawlable #root shell content.
const setShell = (h: string, content: string) =>
  h.replace(/<main class="seo-shell">[\s\S]*?<\/main>/, `<main class="seo-shell">\n${content}\n</main>`);

function makeTemplatePage(base: string, m: typeof MODELS[number]): string {
  const cat = catLabel(m.category);
  const h = applyHead(base, modelSeo(m), "article", JSON.stringify(modelLd(m, cat)));
  return setShell(h, `${BRAND_SVG}\n${templateContentHtml(m, cat, relatedFor(m))}`);
}

function makeDocsPage(base: string): string {
  const seo = docsSeo();
  const ld = JSON.stringify(docsLd(MODELS, CATEGORIES));
  return setShell(applyHead(base, seo, "website", ld), `${BRAND_SVG}\n${docsContentHtml(MODELS, CATEGORIES)}`);
}

let pagesWritten = 0;
if (existsSync(idxPath)) {
  const base = readFileSync(idxPath, "utf8");
  const swap = (s: string) => (SITE_URL !== PLACEHOLDER ? s.split(PLACEHOLDER).join(SITE_URL) : s);

  for (const m of MODELS) {
    const dir = join(DIST, "templates", modelSlug(m));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), swap(makeTemplatePage(base, m)));
    pagesWritten++;
  }

  /* ── 4. docs / template-library hub ──────────────────────────────────────── */
  mkdirSync(join(DIST, "docs"), { recursive: true });
  writeFileSync(join(DIST, "docs", "index.html"), swap(makeDocsPage(base)));

  /* ── 5. homepage index.html: inject template list + swap domain ──────────── */
  const lis = MODELS.map(
    (m) =>
      `<li><a href="${templatePath(m)}">${esc(m.name)} template</a> ` +
      `<span>(${esc(catLabel(m.category))})</span> — ${esc(m.description)}</li>`,
  ).join("\n          ");
  writeFileSync(idxPath, swap(base.replace("<!--SEO_TEMPLATES-->", lis)));
}

/* ── 5. robots.txt: swap domain ───────────────────────────────────────────── */
const robotsPath = join(DIST, "robots.txt");
if (existsSync(robotsPath) && SITE_URL !== PLACEHOLDER) {
  writeFileSync(robotsPath, readFileSync(robotsPath, "utf8").split(PLACEHOLDER).join(SITE_URL));
}

console.log(
  `[seo] sitemap.xml (${urls.length} urls), llms.txt, ${pagesWritten} template pages, ` +
    `docs hub, homepage template list (${MODELS.length} models)` +
    `${SITE_URL !== PLACEHOLDER ? `, domain → ${SITE_URL}` : ""} ✓`,
);
