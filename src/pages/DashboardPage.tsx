import { useState } from "react";
import Dashboard from "../App";
import { Seo } from "../components/site/Seo";
import { GITHUB_URL, Wordmark } from "../components/site/SiteLayout";
import { Link } from "../router";

const INTRO_KEY = "openrisk:dashboard-intro-dismissed:v1";

export default function DashboardPage() {
  const [showIntro, setShowIntro] = useState(() => localStorage.getItem(INTRO_KEY) !== "1");
  const dismiss = () => {
    localStorage.setItem(INTRO_KEY, "1");
    setShowIntro(false);
  };
  return <div className="dashboard-page">
    <Seo path="/app" title="Live Risk Radar | OpenRisk Radar" description="Search and explore public weather, earthquake, wildfire, flood, disaster, and environmental signals around a place." />
    <header className="dashboard-header"><Link to="/" className="brand-link"><Wordmark /></Link><nav aria-label="Dashboard navigation"><Link to="/learn">Learn</Link><Link to="/data-sources">Data Sources</Link><Link to="/about">About</Link><a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a></nav></header>
    {showIntro && <aside className="dashboard-intro"><p><strong>New to OpenRisk Radar?</strong> It combines public hazard and risk feeds into one interactive view. <Link to="/learn/using-openriskradar">Learn how the data works.</Link></p><button type="button" onClick={dismiss} aria-label="Dismiss introduction">Dismiss</button></aside>}
    <div className="dashboard-stage"><Dashboard /></div>
  </div>;
}
