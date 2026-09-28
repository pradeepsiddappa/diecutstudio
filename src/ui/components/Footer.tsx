// Shared site footer — used by the Landing, Docs and Template pages so the
// footer is identical everywhere. Styled by `.landing .foot` (landing.css), so
// render it inside a `.landing`-scoped container.
interface Props {
  onNavigate: (to: string) => void;
}

export function Footer({ onNavigate }: Props) {
  return (
    <footer className="foot">
      <span>© 2026 Die Cut Studio · MIT licensed · Templates you export are yours — free to use</span>
      <span>
        <a href="/#templates" onClick={(e) => { e.preventDefault(); onNavigate("/#templates"); }}>Templates</a>
        <a href="/docs" onClick={(e) => { e.preventDefault(); onNavigate("/docs"); }}>Docs</a>
      </span>
    </footer>
  );
}

export default Footer;
