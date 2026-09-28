// Docs / "Template library" hub  (/docs).
// The in-app entry point to the per-template content pages: every template,
// grouped by category, each linking to its own /templates/<slug> page. Reached
// from the "Docs" nav link. Body copy comes from siteConfig.docsContentHtml —
// the SAME source the static build pre-renders — so live + crawled match.
import { ArrowRight, Layers, FileText } from "lucide-react";
import { Logo } from "../components/Logo";
import { Footer } from "../components/Footer";
import { MODELS, CATEGORIES } from "../../core/models/registry";
import { docsContentHtml, docsSeo, docsLd } from "../../seo/siteConfig";
import { useSeo } from "../../seo/head";
import "./landing.css";
import "./template.css";

interface Props {
  onNavigate: (to: string) => void;
}

export function DocsPage({ onNavigate }: Props) {
  useSeo(docsSeo(), docsLd(MODELS, CATEGORIES));

  // Intercept internal links in the static body → SPA navigation.
  function onContentClick(e: React.MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href.startsWith("/")) {
      e.preventDefault();
      onNavigate(href);
    }
  }

  return (
    <div className="landing tpl">
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
          <a href="/docs" aria-current="page" onClick={(e) => { e.preventDefault(); onNavigate("/docs"); }}>
            <FileText size={14} /> Docs
          </a>
          <button className="btn btn-pri" onClick={() => onNavigate("/editor")}>
            Open editor <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <main className="tpl-wrap docs-wrap">
        <article
          className="tpl-body"
          onClick={onContentClick}
          dangerouslySetInnerHTML={{ __html: docsContentHtml(MODELS, CATEGORIES) }}
        />
      </main>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
