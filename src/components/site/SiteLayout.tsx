import { useEffect, useState, type ReactNode } from "react";
import { Link } from "../../router";

export const GITHUB_URL = "https://github.com/SecuritahGuy/openrisk-radar";

const navigation = [
  ["Live Radar", "/app"],
  ["Learn", "/learn"],
  ["Data Sources", "/data-sources"],
  ["Methodology", "/methodology"],
  ["About", "/about"],
] as const;

export function Wordmark() {
  return <span className="wordmark"><span className="wordmark-mark" aria-hidden="true">◎</span><span>OpenRisk Radar</span></span>;
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand-link" aria-label="OpenRisk Radar home"><Wordmark /></Link>
        <button className="mobile-nav-toggle" type="button" aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen((value) => !value)}>
          <span className="sr-only">Toggle navigation</span><span aria-hidden="true">{open ? "Close" : "Menu"}</span>
        </button>
        <nav id="site-navigation" className={`site-nav ${open ? "is-open" : ""}`} aria-label="Primary navigation">
          {navigation.map(([label, to]) => <Link key={to} to={to} onClick={() => setOpen(false)}>{label}</Link>)}
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub<span className="sr-only"> (opens in a new tab)</span></a>
          <Link to="/app" className="button button-small">Open Live Radar</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-grid">
        <div><Wordmark /><p>Public risk and hazard feeds for broader situational awareness.</p></div>
        <nav aria-label="Footer navigation"><Link to="/learn">Learn</Link><Link to="/data-sources">Data Sources</Link><Link to="/methodology">Methodology</Link><Link to="/about">About</Link></nav>
        <nav aria-label="Legal navigation"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/contact">Contact</Link><a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a></nav>
      </div>
      <div className="site-container footer-note">Informational only. Follow official instructions during emergencies. © {new Date().getFullYear()} OpenRisk Radar contributors.</div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return <div className="public-site"><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader /><main id="main-content">{children}</main><SiteFooter /></div>;
}

export function PageHero({ eyebrow, title, description }: { eyebrow?: string; title: string; description: string }) {
  return <section className="page-hero"><div className="site-container narrow">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div></section>;
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb"><ol>{items.map((item, index) => <li key={item.label}>{item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}{index < items.length - 1 && <span aria-hidden="true">/</span>}</li>)}</ol></nav>;
}

export function Disclaimer() {
  return <aside className="disclaimer"><strong>Use official channels for urgent decisions.</strong><p>OpenRisk Radar is an informational situational-awareness tool, not an official or guaranteed emergency alerting service. Data and optional notifications can be delayed, incomplete, duplicated, unavailable, or revised.</p></aside>;
}
