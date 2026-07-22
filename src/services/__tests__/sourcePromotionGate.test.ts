import { describe, expect, it } from "vitest";
import {
  assessPayloadFreshness,
  assessPromotionMetadata,
  extractRecordTimestamps,
} from "../../../experiments/source-promotion/gate";

const source = {
  id: "test-source",
  access: "public",
  endpoint: "https://example.gov/events",
  refreshSeconds: 3600,
  attribution: "Example Agency",
  termsUrl: "https://example.gov/terms",
  status: "validated",
  format: "geojson",
  proxyRequired: false,
};

describe("experiment source promotion gate", () => {
  it("requires validated public HTTPS sources with attribution and terms", () => {
    expect(assessPromotionMetadata(source).readyForProbe).toBe(true);
    const blocked = assessPromotionMetadata({
      ...source,
      status: "discovered",
      access: "api-key",
      termsUrl: "http://example.gov",
    });
    expect(blocked.readyForProbe).toBe(false);
    expect(blocked.blockers).toHaveLength(3);
  });

  it("finds ISO, millisecond, and second timestamps in nested records", () => {
    expect(extractRecordTimestamps({ features: [
      { properties: { updated_at: "2026-07-22T10:00:00Z" } },
      { attributes: { published_time: 1_774_000_000_000 } },
      { reported_date: 1_774_000_000 },
    ] })).toHaveLength(3);
  });

  it("blocks stale active-feed payloads and requires review when dates are absent", () => {
    const now = new Date("2026-07-22T12:00:00Z").getTime();
    expect(assessPayloadFreshness(source, {
      features: [{ attributes: { discovered_date: "1987-08-01T00:00:00Z" } }],
    }, now).status).toBe("stale");
    expect(assessPayloadFreshness(source, {
      features: [{ attributes: { name: "No timestamp" } }],
    }, now).status).toBe("unknown");
    expect(assessPayloadFreshness(source, {
      features: [{ attributes: { updated_at: "2026-07-22T11:00:00Z" } }],
    }, now).status).toBe("fresh");
  });
});
