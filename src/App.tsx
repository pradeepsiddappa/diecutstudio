// Top-level router. Tiny custom approach (no react-router-dom) — two routes:
//   '/'        → Landing (gallery)
//   anything   → Editor (the current parametric dieline tool)
// Navigation is via history.pushState; the back/forward buttons just work.
//
// We track `path` as pathname + search so navigations between e.g.
//   /editor?model=A  →  /editor?model=B
// trigger a re-render. The `key={path}` on the Editor forces a remount on
// every URL change, so per-model state (default L/W/H, etc.) re-initialises
// from the new ?model param instead of sticking at the previous values.
import { useState, useEffect, lazy, Suspense } from "react";

const Landing = lazy(() => import("./ui/pages/Landing").then(m => ({ default: m.Landing })));
const Editor = lazy(() => import("./ui/pages/Editor").then(m => ({ default: m.Editor })));
const TemplatePage = lazy(() => import("./ui/pages/TemplatePage").then(m => ({ default: m.TemplatePage })));
const DocsPage = lazy(() => import("./ui/pages/DocsPage").then(m => ({ default: m.DocsPage })));

const currentUrl = () => window.location.pathname + window.location.search;

export function App() {
  const [path, setPath] = useState(currentUrl);

  useEffect(() => {
    const onPop = () => setPath(currentUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigate(to: string) {
    if (to === currentUrl()) return;
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  // Pathname for routing (ignore the query string for the route decision)
  const pathname = path.split("?")[0];
  const isLanding = pathname === "/" || pathname === "" || pathname === "/templates";
  const isDocs = pathname === "/docs";
  const isTemplate = pathname.startsWith("/templates/");

  return (
    <Suspense fallback={<div style={{ padding: 48, color: "#6b7280" }}>Loading…</div>}>
      {isLanding ? (
        <Landing onNavigate={navigate} />
      ) : isDocs ? (
        <DocsPage onNavigate={navigate} />
      ) : isTemplate ? (
        // key={path} → remount so the slug re-reads from the new URL.
        <TemplatePage key={path} onNavigate={navigate} />
      ) : (
        // key={path} → remount Editor on ANY URL change (path + query) so
        //   defaults re-initialise from the new ?model param.
        <Editor key={path} onNavigate={navigate} />
      )}
    </Suspense>
  );
}
