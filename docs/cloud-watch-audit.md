# Cloud watch audit mode

This document describes the opt-in Cloudflare background-monitoring implementation. The dashboard remains fully useful without it: saved locations stay in the browser unless a user explicitly enables a cloud watch.

Cloud watch audit mode evaluates an explicitly opted-in saved-location watch when the site is closed. It records matching changes and can queue Web Push delivery for watches included in the configured canary rollout.

## Privacy model

- Registration is optional and per saved location.
- The browser sends coordinates rounded to four decimal places, radius, timezone, and watch preferences.
- Location labels, email addresses, and account identities are not sent.
- A random control token is returned once and stored in the browser's IndexedDB record.
- D1 stores only the SHA-256 hash of that control token.
- Updating, reading, or deleting a watch requires the control token.
- Deleting a locally saved location first deletes its cloud copy so the control token is not lost.

## Audit behavior

- One Cron Trigger runs every 15 minutes.
- Each scheduled invocation leases and queues at most 24 due watches.
- Every queued watch is evaluated by a separate Worker invocation, preserving an independent Cloudflare subrequest budget for each location.
- Queue consumer batches are intentionally limited to one message.
- Immediate watches become due hourly; daily watches become due every 24 hours.
- The first successful evaluation establishes a baseline and never counts as a notification.
- Later fingerprint changes are recorded as `wouldNotify`, `quiet_hours`, or `resolved` outcomes.
- A partial provider failure does not replace the previous fingerprint, preventing false change notices.
- Audit records and expired watches are retained for 30 days.
- The evaluator uses the shared location-feed registry and currently covers NWS, USGS, NIFC, NHC, JMA, GDACS, and NASA EONET when the selected hazards apply.
- NHC uses NOAA's aggregate forecast-points layer plus its outlook layer rather than querying every possible storm slot.

## Cloudflare setup

After authenticating Wrangler:

```sh
npx wrangler d1 create openradar-risk
```

Add the returned database ID to `wrangler.jsonc` as the `DB` binding:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "openradar-risk",
    "database_id": "<database-id>",
    "migrations_dir": "migrations"
  }
]
```

Apply the schema before deploying:

```sh
npx wrangler d1 migrations apply openradar-risk --remote
```

For local development, the same migration can be applied with `--local` after the binding is configured.

Migration `0005_watch_audit_queue.sql` must be applied before deploying the
queue-isolated evaluator. It creates retry-safe audit jobs linked to each
scheduled audit run.
