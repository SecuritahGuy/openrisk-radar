import { describe, expect, it } from "vitest";
import type { ResolvedLocation } from "../../types/location";
import {
  createLocationFeedContext,
  eligibleLocationEventFeeds,
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
});
