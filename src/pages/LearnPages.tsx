import { Breadcrumbs, Disclaimer, PageHero, SiteLayout } from "../components/site/SiteLayout";
import { Seo } from "../components/site/Seo";
import { learnArticleByPath, learnArticles, type LearnArticle } from "../data/learnArticles";
import { Link } from "../router";

export function LearnIndexPage() {
  const categories = Array.from(new Set(learnArticles.map((article) => article.category)));
  return <SiteLayout><Seo path="/learn" title="Learn About Risk | OpenRisk Radar" description="Understand public alerts, hazard terminology, data sources, and the limitations behind the events displayed in OpenRisk Radar." />
    <PageHero eyebrow="Learning center" title="Learn About Risk" description="Understand the alerts, terminology, public datasets, and limitations behind the events displayed in OpenRisk Radar." />
    <section className="section"><div className="site-container"><div className="filter-label" aria-label="Available learning categories"><span>Browse topics:</span>{categories.map((category) => <span className="topic-chip" key={category}>{category}</span>)}</div><div className="article-grid light-cards">{learnArticles.map((article) => <ArticleCard article={article} key={article.slug} />)}</div></div></section>
  </SiteLayout>;
}

function ArticleCard({ article }: { article: LearnArticle }) {
  return <article className="article-card"><p className="article-meta">{article.category} · {article.readingTime}</p><h2><Link to={`/learn/${article.slug}`}>{article.title}</Link></h2><p>{article.description}</p><p className="reviewed">Last reviewed {article.reviewedAt}</p><Link className="text-link" to={`/learn/${article.slug}`}>Read guide <span aria-hidden="true">→</span></Link></article>;
}

export function LearnArticlePage({ pathname }: { pathname: string }) {
  const article = learnArticleByPath.get(pathname);
  if (!article) return null;
  const structuredData = [
    { "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.description, dateModified: article.reviewedAt, author: { "@type": "Organization", name: "OpenRisk Radar Editorial" }, publisher: { "@type": "Organization", name: "OpenRisk Radar" }, mainEntityOfPage: `https://openriskradar.com${pathname}` },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: "https://openriskradar.com/" }, { "@type": "ListItem", position: 2, name: "Learn", item: "https://openriskradar.com/learn" }, { "@type": "ListItem", position: 3, name: article.title, item: `https://openriskradar.com${pathname}` }] },
  ];
  return <SiteLayout><Seo path={pathname} title={`${article.title} | OpenRisk Radar`} description={article.description} type="article" structuredData={structuredData} />
    <article className="learn-article"><header className="article-hero"><div className="site-container narrow"><Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Learn", to: "/learn" }, { label: article.title }]} /><p className="eyebrow">{article.category}</p><h1>{article.title}</h1><p className="article-deck">{article.description}</p><div className="byline"><span>OpenRisk Radar Editorial</span><span>{article.readingTime}</span><span>Last reviewed {article.reviewedAt}</span></div></div></header>
      <div className="site-container article-layout"><div className="article-body">{article.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}</section>)}<Disclaimer /><section className="article-sources"><h2>Authoritative sources</h2><p>Use these public sources for definitions, current records, and hazard-specific guidance.</p><ul>{article.sources.map((source) => <li key={source.url}>{source.url.startsWith("/") ? <Link to={source.url}>{source.label}</Link> : <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>}</li>)}</ul></section></div><aside className="article-aside"><p>Explore the current view</p><h2>{article.cta}</h2><p>Filter and inspect source records for a location in the operational dashboard.</p><Link to="/app" className="button">Open Live Radar</Link></aside></div>
    </article>
  </SiteLayout>;
}
