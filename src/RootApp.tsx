import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { HomePage } from "./pages/HomePage";
import { LearnArticlePage, LearnIndexPage } from "./pages/LearnPages";
import { AboutPage, ContactPage, DataSourcesPage, MethodologyPage, NotFoundPage, PrivacyPage, TermsPage } from "./pages/InformationPages";
import { navigate, ScrollToTop, usePathname } from "./router";
import { routeKind } from "./routes";
import "./site.css";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const legacyDashboardParams = ["q", "radius", "weather", "layer"];

export default function RootApp() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/") return;
    const params = new URLSearchParams(window.location.search);
    if (legacyDashboardParams.some((key) => params.has(key))) navigate(`/app${window.location.search}${window.location.hash}`, true);
  }, [pathname]);

  let page: ReactNode;
  switch (routeKind(pathname)) {
    case "home": page = <HomePage />; break;
    case "dashboard": page = <Suspense fallback={<div className="route-loading" aria-live="polite">Loading live radar…</div>}><DashboardPage /></Suspense>; break;
    case "learn": page = <LearnIndexPage />; break;
    case "article": page = <LearnArticlePage pathname={pathname} />; break;
    case "data-sources": page = <DataSourcesPage />; break;
    case "methodology": page = <MethodologyPage />; break;
    case "about": page = <AboutPage />; break;
    case "privacy": page = <PrivacyPage />; break;
    case "terms": page = <TermsPage />; break;
    case "contact": page = <ContactPage />; break;
    default: page = <NotFoundPage />;
  }
  return <><ScrollToTop pathname={pathname} />{page}</>;
}
