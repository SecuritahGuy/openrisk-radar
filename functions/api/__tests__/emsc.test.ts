import { describe, expect, it } from "vitest";
import { buildEmscUpstreamUrl } from "../emsc";

describe("EMSC proxy query", () => {
  it("forwards only validated query parameters", () => {
    const upstream = buildEmscUpstreamUrl(
      "https://example.com/api/emsc?format=xml&minlatitude=41&maxlatitude=43&minlongitude=-89&maxlongitude=-87&minmagnitude=2.5&limit=200&ignored=value"
    );
    expect(upstream?.hostname).toBe("www.seismicportal.eu");
    expect(upstream?.searchParams.get("format")).toBe("json");
    expect(upstream?.searchParams.get("ignored")).toBeNull();
  });

  it("rejects invalid bounds and oversized limits", () => {
    expect(buildEmscUpstreamUrl(
      "https://example.com/api/emsc?minlatitude=91&maxlatitude=92&minlongitude=-89&maxlongitude=-87&minmagnitude=2.5&limit=201"
    )).toBeNull();
  });
});
