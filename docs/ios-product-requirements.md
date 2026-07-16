# OpenRiskRadar for iOS — Product Requirements

## Product vision

OpenRiskRadar for iOS is a private, Apple-native risk intelligence application for monitoring the places, people, properties, trips, and locations that matter.

It should answer:

- What changed?
- Where did it change?
- How severe is it?
- Does it affect a place I care about?

## Target users

- Travelers and commuters who want location-aware hazard awareness.
- Property owners and managers who monitor assets and locations.
- Families and small groups sharing location-based watches.
- Professionals who need a private, native risk summary without web accounts.

## Core jobs to be done

- Monitor saved locations for meaningful hazard changes.
- Understand the severity and impact of nearby incidents.
- Explore risk through native maps and location search.
- Keep personal saved places private and synced across devices.
- Receive timely alerts for relevant risks.

## Free user experience

- Native map and search.
- Local saved places.
- Basic hazard feed and incident detail.
- Severity summaries and source attribution.
- Native offline-friendly behavior.
- CloudKit private sync for saved items if signed into iCloud.

## Paid user experience hypotheses

- Premium watch rules and notification thresholds.
- More aggressive background refresh and alert delivery.
- Additional map layers, overlays, or incident summaries.
- Family sharing or small-team shared watches.
- Advanced property and trip monitoring.

## Personal saved places

- Save and name locations.
- Store radius, category, and severity preferences.
- Use CloudKit private data for sync across the user’s devices.
- Keep location metadata private by default.

## Family/shared locations

- Support shared places and watches through CloudKit sharing.
- Define ownership and participant permissions.
- Allow share recipients to view or collaborate on monitors.
- Handle revoked access clearly.

## Trips and temporary watches

- Support temporary travel watches for trips.
- Let users mark places as short-term or permanent.
- Provide clear expiration and local-only controls.

## Properties

- Support property-specific saved places.
- Track address, location, radius, and context.
- Connect properties to risk summaries and incident detail.

## Small teams

- Support shared watches and shared locations for small groups.
- Keep the model Apple-native rather than a SaaS team backend.
- Use CloudKit sharing when appropriate.

## Risk summary

- Prioritize current impact and severity.
- Show the most important active incidents near saved places.
- Preserve source attribution.
- Use native cards and summaries.

## Incident feed

- Present canonical incidents in a native feed.
- Show source, category, severity, timing, and location.
- Offer filtering by saved places, severity, and hazard type.

## Map

- Use MapKit for native map rendering.
- Show saved place circles, incident pins, and overlays.
- Support place search and map exploration.

## Notifications

- Support opt-in alerts for relevant saved places.
- Use APNs and UserNotifications.
- Respect quiet hours and severity thresholds.
- Do not promise guaranteed 24/7 monitoring without backend support.

## Widgets

- Home Screen widgets for saved-location status.
- Lock Screen widgets for active high-priority incidents.
- Use native widget families.

## Live Activities

- Use Live Activities for time-bound high-priority incidents when appropriate.
- Keep Live Activities scoped and useful.

## Sharing

- Support CloudKit sharing for family and small groups.
- Allow shared location/watch collaboration.
- Keep shared data ownership clear.

## Offline behavior

- Cache saved places locally.
- Provide best-effort native refresh when network is available.
- Avoid implying live hazard data when offline.

## Privacy

- Preserve private saved places and watch preferences.
- Minimize central storage of personally identifiable information.
- Prefer Apple/iCloud data ownership for private sync.
- Make user consent explicit for location, notifications, and sharing.

## CloudKit

- Use CloudKit for private sync and sharing, not for risk ingestion.
- Model private records and CKShare behavior carefully.
- Keep CloudKit as the preferred starting point for Apple-native persistence.

## StoreKit

- Plan free and paid tiers without hard-coded pricing.
- Define subscription and restoration flows.
- Prepare for App Store launch requirements.

## Accessibility

- Support VoiceOver, Dynamic Type, contrast, and native Apple accessibility.
- Make incident cards and map interactions accessible.

## Open questions

- What is the initial CloudKit record schema for saved places and watches?
- What is the minimum viable background refresh capability for launch?
- What should the first paid feature set include?
- How should shared watches behave when participants are removed?
- What should the offline experience communicate clearly?

## Explicit non-goals for v1

- No web account or SaaS login requirement.
- No WebView-based native product.
- No forced backend subscription service for the first native launch.
- No cross-platform framework requirement driven by Android.
- No hard-coded pricing for products.
