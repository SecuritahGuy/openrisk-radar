# Contributing to OpenRisk Radar

Thanks for helping improve OpenRisk Radar. The project values accurate source attribution, browser-compatible data access, and changes that preserve the core map/feed workflow.

## Local Setup

Use Node 22.

```bash
npm ci
npm run dev
```

The local development server runs at `http://localhost:5173`.

## Branches

Create a focused branch from `main`:

```bash
git checkout main
git pull
git checkout -b feature/short-description
```

## Project scope

This repository is primarily focused on OpenRiskRadar Web, the open-source browser-first application. Contributors should not introduce web authentication, Stripe, subscription billing, team workspaces, or SaaS account infrastructure without an explicit architectural decision. New web features should preserve anonymous use and minimize dependence on centralized personal data.

Native apps are a separate product track. If native-source code is added in the future, it should remain clearly separated from the web application unless the repo is explicitly extended for multi-platform work.

## Required Checks

Run these before opening a pull request:

```bash
npm run lint
npm test
npm run build
```

Do not add placeholder tests. Prefer focused tests around deterministic logic such as severity mapping, filtering, geospatial distance, or source normalization. When adding new source integrations, consider whether the domain logic can later be specified in a platform-independent way.

## Pull Request Expectations

- Keep changes scoped and explain the user-facing impact.
- Include screenshots for UI changes.
- Update README, ROADMAP, or docs when behavior or source status changes.
- Preserve existing source attribution and provider links.
- Do not commit API keys, secrets, private URLs, or credentials.
- Avoid large rewrites unless they are required for the stated change.

## Adding a Data Source

New source integrations should usually include:

- A source-specific adapter in `src/services/`.
- Normalization to `RiskEvent` or `SupplementalRiskSignal`.
- Source attribution and outbound provider URL.
- Browser/CORS validation.
- CSP `connect-src` update in `public/_headers`.
- Documentation updates in README and ROADMAP.
- Focused tests for deterministic mapping logic when practical.

Before adding a source, check:

- Provider terms and licensing.
- Authentication requirements.
- Browser CORS compatibility.
- Data freshness and update cadence.
- Geographic coverage.
- Whether the feed duplicates an existing source.

## Data Attribution

Provider attribution is part of the product. Keep source names, raw source identifiers, confidence labels, and outbound provider URLs intact wherever possible.
