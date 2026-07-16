# OpenRiskRadar Native App Strategy

## Vision

OpenRiskRadar is now intentionally split across product tracks:

- **OpenRiskRadar Web** is a free, open-source, anonymous browser-first product.
- **OpenRiskRadar for iOS** is a separate Apple-native product track with a privacy-first, device-centered experience.
- **OpenRiskRadar for Android** is a possible future native product track, not a current implementation priority.

The web application remains a complete public product. The iOS product should draw on the web project for source integration research, risk models, UX learnings, and normalization behavior, but it should never be a WebView wrapper.

## Product boundaries

### Web

OpenRiskRadar Web is:

- Public.
- Open source.
- Anonymous.
- Browser-first.
- No accounts.
- No authentication.
- No subscription required.
- Independent of the mobile products.

It is a first-class situational-awareness application in its own right.

### iOS

OpenRiskRadar for iOS is:

- Native.
- Apple-first.
- Commercial product candidate.
- Privacy-focused.
- CloudKit-oriented for personal sync and sharing.
- Independent of the web app for user identity and backend flow.

It will use Swift, SwiftUI, MapKit, CloudKit, UserNotifications/APNs, WidgetKit, ActivityKit, App Intents, and other Apple-native frameworks where appropriate.

### Android

OpenRiskRadar for Android is:

- A future native product track only.
- Not the current implementation priority.
- Able to reuse concepts, product research, risk models, incident correlation logic, and UX lessons from the web and iOS projects.

The current strategy is not to force cross-platform architecture for theoretical Android reuse.

## Why separate the products?

- Avoid adding authentication to the public website.
- Preserve the web app as a privacy-friendly anonymous experience.
- Keep the web architecture simple and browser-first.
- Maintain a clear privacy boundary between public and personal products.
- Allow the iOS product to use Apple-native capabilities deeply.
- Preserve open-source community value and research from the web project.

## CloudKit architecture considerations

OpenRiskRadar for iOS should evaluate CloudKit as the primary mechanism for:

- Private saved locations.
- Personal watch preferences.
- Cross-device Apple synchronization.
- Family and small-team sharing.
- Shared locations and watches.
- Notes and acknowledgements.
- Shared incident state where appropriate.

CloudKit can provide:

- Private database storage.
- Shared database access through CKShare.
- Device-level identity via the user’s Apple/iCloud account.
- Native synchronization behavior.

But CloudKit is not a substitute for a continuously running hazard-ingestion engine.

### CloudKit limitations

- CloudKit does not fetch or normalize external hazard feeds on behalf of the app.
- It does not guarantee 24/7 monitoring when the device is offline or the app is closed.
- It is not equivalent to a backend change-detection service.

A future always-on compute layer may still be required if the product promises reliable background monitoring and immediate notifications.

## Security and privacy

Apple provides underlying platform security and synchronization infrastructure, but OpenRiskRadar remains responsible for:

- Correct permission handling.
- Secure application logic.
- Minimizing stored personal data.
- Privacy disclosures.
- Secure local persistence.
- Safe use of location data.
- Notification privacy.
- Correct CloudKit schema configuration.

The iOS product should preserve user control over data and avoid sending identifiable location data to third parties unless explicitly required and disclosed.

## Continuous monitoring limitation

CloudKit does not automatically monitor NWS, USGS, NIFC, Meteoalarm, GDACS, NASA, NOAA, or other public data feeds.

Guaranteed server-side monitoring requires a separate compute service that can:

1. Fetch authoritative sources.
2. Normalize risk events.
3. Correlate incidents.
4. Determine meaningful changes.
5. Match incidents against monitored places.
6. Trigger remote notifications.

This repository’s current strategy does not commit to a specific backend provider for that future capability.

## Reuse from the current web project

The iOS product can reuse these concepts:

- `RiskEvent` and hazard category models.
- Canonical incident correlation logic.
- Provider priority and attribution rules.
- Severity ranking and impact classification.
- Geospatial distance and proximity logic.
- Correlation rules and deduplication heuristics.
- Watch concepts and saved-location workflows.
- Location criticality and personal watch preferences.
- Source research and integration patterns.
- UX lessons around incident summaries and map-based risk context.

TypeScript implementation details may not be directly reusable in Swift, but the domain models, algorithms, tests, and behavior specifications are highly reusable.

## Practical guidance

- Keep the web app anonymous and useful on its own.
- Build iOS as a native product with Apple-first behavior.
- Treat CloudKit as a privacy-first sync and sharing layer, not a headless monitoring engine.
- Keep Android as a possible future product track, not a current architecture driver.
- Preserve the value of public documentation, source attribution, and open-source research.
