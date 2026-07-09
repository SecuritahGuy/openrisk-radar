# Security Policy

## Reporting a Vulnerability

Please report security issues through a private GitHub security advisory on this repository if GitHub private vulnerability reporting is enabled.

If private vulnerability reporting is not available, open a GitHub issue with a minimal, non-sensitive description and avoid posting exploit details, secrets, private data, or live abuse instructions. The maintainer can then coordinate a private follow-up channel.

## Scope

Relevant reports include:

- Cross-site scripting or unsafe rendering paths.
- Dependency vulnerabilities with a practical impact on this application.
- Exposure of secrets or credentials.
- Unsafe handling of saved locations or browser storage.
- Supply-chain or deployment configuration risks.

## Notes

OpenRisk Radar is currently a static browser application. Saved locations are stored locally in browser IndexedDB. The project should not require API keys or secrets for its current public data sources.
