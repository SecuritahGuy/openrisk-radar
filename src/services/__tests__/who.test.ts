import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResolvedLocation } from "../../types/location";
import { fetchWhoOutbreaks, whoItemMatchesLocation, type WhoOutbreakItem } from "../who";

const india: ResolvedLocation = {
  city: "Delhi",
  state: "Delhi",
  postalCode: "110001",
  country: "India",
  latitude: 28.61,
  longitude: 77.21,
  county: null,
  stateFips: null,
  countyFips: null,
};

const recentIndia: WhoOutbreakItem = {
  DonId: "don-india",
  Title: "Nipah virus disease - India",
  Summary: "A new public-health report for India.",
  PublicationDateAndTime: "2026-06-25T18:00:00Z",
  LastModified: "2026-06-25T18:30:00Z",
};

afterEach(() => vi.restoreAllMocks());

describe("WHO outbreak locality and freshness", () => {
  it("requires the resolved place to appear in the report", () => {
    expect(whoItemMatchesLocation(recentIndia, india)).toBe(true);
    expect(whoItemMatchesLocation({ ...recentIndia, Title: "Yellow fever - Brazil", Summary: "" }, india))
      .toBe(false);
    expect(whoItemMatchesLocation({ ...recentIndia, Title: "Nipah virus - Delhi", Summary: "" }, india))
      .toBe(false);
  });

  it("requests newest reports and drops old or unrelated records", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      value: [
        recentIndia,
        { ...recentIndia, DonId: "old", PublicationDateAndTime: "2006-03-20T00:00:00Z" },
        { ...recentIndia, DonId: "brazil", Title: "Yellow fever - Brazil", Summary: "" },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const events = await fetchWhoOutbreaks(india, new Date("2026-07-22T12:00:00Z").getTime());
    expect(events.map((event) => event.sourceEventId)).toEqual(["who-don-india"]);
    expect(events[0].provider?.id).toBe("who-don");
    const url = vi.mocked(fetch).mock.calls[0][0].toString();
    expect(url).toContain("%24orderby=PublicationDateAndTime+desc");
  });
});
