# Security Policy

## Reporting a vulnerability

Please report security issues privately via **GitHub Security Advisories**
(repo → Security → "Report a vulnerability") rather than opening a public issue.
We aim to acknowledge reports within a few days.

## Scope / threat model

Die Cut Studio is a **100% client-side static web app**. It has:

- **No backend, no database, no user accounts, no API keys or secrets.**
- No network calls for your designs — all geometry and file generation (PDF/SVG/DXF) happens in
  the browser. Generated files are created locally and downloaded by the user.
- No execution of untrusted input as code; numeric inputs only.

This minimizes the attack surface: there is no server to compromise and no user
data stored or transmitted.

## Known advisories (dev tooling only)

`npm audit` may report **moderate** advisories in `vite` / `esbuild`. These
affect only the **local development server** (`npm run dev`) — an attacker would
need you to visit a malicious page while your dev server is running. They do
**not** affect the production build (`dist/`) or anyone using the deployed site.

We track these and will clear them when we upgrade to the next major Vite
release. Production output ships no Vite/esbuild runtime code.

## Dependencies

Runtime deps are intentionally minimal: `react`, `react-dom`, `three`, `pdf-lib`,
`lucide-react`, and the optional `posthog-js` analytics client.
SVG and DXF exporters are hand-written (no dependencies).
