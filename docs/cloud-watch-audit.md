# Cloud watch audit mode

This document describes experimental Cloudflare watch audit research. The implementation is a proof of concept for background watch evaluation and is not required for OpenRiskRadar Web to remain useful.

Cloud watch audit mode evaluates an explicitly opted-in saved-location watch when the site is closed. It records whether a notification would have been sent, but it does not deliver notifications.

## Privacy model

- Registration is optional and per saved location.
- The browser sends coordinates rounded to four decimal places, radius, timezone, and watch preferences.
- Location labels, email addresses, and account identities are not sent.
- A random control token is returned once and stored in the browser's IndexedDB record.
- D1 stores only the SHA-256 hash of that control token.
- Updating, reading, or deleting a watch requires the control token.
- Deleting a locally saved location first deletes its cloud copy so the control token is not lost.

## Audit behavior

- One Cron Trigger runs every 30 minutes.
- Each invocation processes at most three due watches.
- Immediate watches become due hourly; daily watches become due every 24 hours.
- The first successful evaluation establishes a baseline and never counts as a notification.
- Later fingerprint changes are recorded as `wouldNotify`, `quiet_hours`, or `resolved` outcomes.
- A partial provider failure does not replace the previous fingerprint, preventing false change notices.
- Audit records and expired watches are retained for 30 days.
- The initial evaluator covers NWS alerts, USGS earthquakes, and NIFC wildfires.

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
