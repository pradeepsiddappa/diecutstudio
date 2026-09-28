// Runtime <head> manager. The app is a client-rendered SPA, so on every route
// change we rewrite the title / meta / canonical / Open Graph / Twitter tags and
// the per-page JSON-LD. This is the head a JS-executing crawler (Googlebot,
// Bingbot) indexes; the static fallback in index.html covers no-JS crawlers.
import { useEffect } from "react";
import { SeoMeta, SITE_NAME, OG_IMAGE, TWITTER_HANDLE, LOCALE } from "./siteConfig";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Imperatively apply page metadata to <head>. */
export function applyHead(m: SeoMeta) {
  const image = m.image ?? OG_IMAGE;
  const type = m.type ?? "website";

  document.title = m.title;
  setMeta("name", "description", m.description);
  if (m.keywords) setMeta("name", "keywords", m.keywords);
  setLink("canonical", m.canonical);

  // Open Graph
  setMeta("property", "og:title", m.title);
  setMeta("property", "og:description", m.description);
  setMeta("property", "og:url", m.canonical);
  setMeta("property", "og:type", type);
  setMeta("property", "og:image", image);
  setMeta("property", "og:site_name", SITE_NAME);
  setMeta("property", "og:locale", LOCALE);

  // Twitter
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", m.title);
  setMeta("name", "twitter:description", m.description);
  setMeta("name", "twitter:image", image);
  if (TWITTER_HANDLE) {
    setMeta("name", "twitter:site", TWITTER_HANDLE);
    setMeta("name", "twitter:creator", TWITTER_HANDLE);
  }
}

const LD_ID = "ld-page";

/** Inject/replace the per-page JSON-LD <script>. Pass null to clear it. */
export function setJsonLd(data: unknown | null) {
  let el = document.getElementById(LD_ID) as HTMLScriptElement | null;
  if (data == null) {
    if (el) el.textContent = "";
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.id = LD_ID;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** React hook: keep <head> in sync with the current page. */
export function useSeo(meta: SeoMeta, jsonLd?: unknown | null) {
  useEffect(() => {
    applyHead(meta);
    setJsonLd(jsonLd ?? null);
  }, [meta.canonical, meta.title, meta.description]);
}
