import { describe, expect, it } from "vitest";
import type { ResolvedLocation } from "../../types/location";
import {
  createLocationFeedContext,
  eligibleLocationEventFeeds,
  LOCATION_EVENT_FEEDS,
  LOCATION_WATCH_AUDIT_SOURCES,
  locationEventFeedEnabled,
} from "../locationEventFeeds";

const illinois: ResolvedLocation = {
  city: "Grayslake",
  state: "Illinois",
  postalCode: "60030",
  country: "USA",
  latitude: 42.3445,
  longitude: -88.0418,
  county: "Lake County",
  stateFips: "17",
  countyFips: "17097",
};

describe("location event feed registry", () => {
  it("provides unique, complete runtime contracts", () => {
    const ids = LOCATION_EVENT_FEEDS.map((feed) => feed.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const feed of LOCATION_EVENT_FEEDS) {
      expect(feed.label.length).toBeGreaterThan(0);
      expect(feed.hazards.length).toBeGreaterThan(0);
      expect(feed.surfaces.length).toBeGreaterThan(0);
      expect(feed.staleTime).toBeGreaterThan(0);
      expect(feed.retry).toBeGreaterThanOrEqual(0);
    }
  });

  it("derives public watch coverage from the registry", () => {
    expect(LOCATION_WATCH_AUDIT_SOURCES).toEqual([
      "NWS", "USGS", "NIFC", "NHC", "JMA", "GDACS", "NASA EONET",
    ]);
  });

  it("selects the U.S. dashboard feeds from resolved location context", () => {
    const feeds = eligibleLocationEventFeeds(
      createLocationFeedContext(illinois, 50),
      "dashboard"
    ).map((feed) => feed.id);

    expect(feeds).toContain("nws-point");
    expect(feeds).toContain("nifc");
    expect(feeds).toContain("spc");
    expect(feeds).not.toContain("dwd");
    expect(feeds).not.toContain("geonet");
  });

  it("limits watch audits to worker-safe feeds relevant to selected hazards", () => {
    const context = createLocationFeedContext(illinois, 25);

    expect(eligibleLocationEventFeeds(context, "watch-audit", ["earthquake"])
      .map((feed) => feed.id)).toEqual(["usgs", "gdacs"]);
    expect(eligibleLocationEventFeeds(context, "watch-audit", ["tropical"])
      .map((feed) => feed.id)).toEqual(["nhc", "jma", "gdacs", "eonet"]);
  });

  it("automatically activates country-specific feeds", () => {
    const germany = createLocationFeedContext({
      ...illinois,
      city: "Berlin",
      state: "Berlin",
      postalCode: "10115",
      country: "Germany",
      latitude: 52.52,
      longitude: 13.405,
      county: null,
      stateFips: null,
      countyFips: null,
    }, 50);

    const feeds = eligibleLocationEventFeeds(germany, "saved-summary")
      .map((feed) => feed.id);
    expect(feeds).toContain("dwd");
    expect(feeds).toContain("meteoalarm");
    expect(feeds).not.toContain("nws-point");
  });

  it("checks both location eligibility and surface eligibility", () => {
    const context = createLocationFeedContext(illinois, 25);
    const spc = LOCATION_EVENT_FEEDS.find((feed) => feed.id === "spc")!;
    expect(locationEventFeedEnabled(spc, context, "dashboard")).toBe(true);
    expect(locationEventFeedEnabled(spc, context, "watch-audit")).toBe(false);
    expect(locationEventFeedEnabled(spc, null, "dashboard")).toBe(false);
  });
});
