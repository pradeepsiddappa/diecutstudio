// Per-template CONTENT page  (/templates/<slug>).
// A crawlable, keyword-rich landing page for each template — the canonical,
// indexable URL that search + AI engines rank, with a prominent CTA into the
// live editor. The body copy comes from siteConfig.templateContentHtml, the
// SAME source the static build output (scripts/seo-gen.ts) uses, so the rendered
// page and the pre-rendered HTML can never drift.
import { useMemo } from "react";
import { ArrowRight, Layers, FileText } from "lucide-react";
import { Logo } from "../components/Logo";
import { Footer } from "../components/Footer";
import { IsoBoxThumb } from "../components/IsoBoxThumb";
import { MODELS, CATEGORIES } from "../../core/models/registry";
import {
  modelSlug, modelSeo, modelLd, templateContentHtml, templatePath, SITE_NAME,
} from "../../seo/siteConfig";
import { useSeo } from "../../seo/head";
import "./landing.css";
import "./template.css";

interface Props {
  onNavigate: (to: string) => void;
}

export function TemplatePage({ onNavigate }: Props) {
  const slug = decodeURIComponent(
    window.location.pathname.replace(/^\/templates\/?/, "").replace(/\/$/, ""),
  );
  const model = useMemo(() => MODELS.find((m) => modelSlug(m) === slug), [slug]);
  const catLabel = model
    ? CATEGORIES.find((c) => c.id === model.category)?.label ?? "Templates"
    : "Templates";

  // Hooks run unconditionally — set the head for the resolved model (or a safe
  // not-found fallback), then branch the render.
  useSeo(
    model
      ? modelSeo(model)
      : {
          title: `Template not found | ${SITE_NAME}`,
          description: "Browse free, parametric dieline and box templates.",
          canonical: `${window.location.origin}/`,
        },
    model ? modelLd(model, catLabel) : null,
  );

  // Intercept internal-link clicks inside the static content → SPA navigation
  // (the href stays a real, crawlable URL for search engines).
  function onContentClick(e: React.MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href.startsWith("/")) {
      e.preventDefault();
      onNavigate(href);
    }
  }

  const nav = (
    <header className="nav">
      <a
        className="logo"
        href="/"
        onClick={(e) => { e.preventDefault(); onNavigate("/"); }}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <Logo size={20} />
      </a>
      <div className="nav-links">
        <a href="/#templates" onClick={(e) => { e.preventDefault(); onNavigate("/#templates"); }}>
          <Layers size={14} /> Templates
        </a>
        <a href="/docs" onClick={(e) => { e.preventDefault(); onNavigate("/docs"); }}>
          <FileText size={14} /> Docs
        </a>
        {model && (
          <button className="btn btn-pri" onClick={() => onNavigate(`/editor?model=${model.id}`)}>
            Open editor <ArrowRight size={14} />
          </button>
        )}
      </div>
    </header>
  );

  if (!model) {
    return (
      <div className="landing tpl">
        {nav}
        <main className="tpl-wrap">
          <h1>Template not found</h1>
          <p>
            <a href="/#templates" onClick={(e) => { e.preventDefault(); onNavigate("/#templates"); }}>
              Browse all templates →
            </a>
          </p>
        </main>
      </div>
    );
  }

  const related = MODELS
    .filter((m) => m.category === model.category && m.id !== model.id)
    .slice(0, 6)
    .map((m) => ({ name: m.name, href: templatePath(m) }));

  return (
    <div className="landing tpl">
      {nav}
      <main className="tpl-wrap">
        <div className="tpl-grid">
          <aside className="tpl-visual">
            <IsoBoxThumb
              L={model.defaultDimensions.L}
              W={model.defaultDimensions.W}
              H={model.defaultDimensions.H}
              modelId={model.id}
            />
          </aside>
          <article
            className="tpl-body"
            onClick={onContentClick}
            dangerouslySetInnerHTML={{ __html: templateContentHtml(model, catLabel, related) }}
          />
        </div>
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
