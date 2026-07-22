import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTsunamiFeed, parseTsunamiAtom } from "../tsunamiFallback";

const ACTIVE_ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#">
  <entry>
    <title>Near the coast of Test</title>
    <updated>2026-07-22T10:00:00Z</updated>
    <geo:lat>14.4</geo:lat><geo:long>-93.0</geo:long>
    <summary type="xhtml"><div><strong>Category:</strong> Warning<br/>Move inland.</div></summary>
    <id>urn:uuid:test-warning</id>
    <link rel="alternate" title="Bulletin" href="https://www.tsunami.gov/test.txt" />
  </entry>
</feed>`;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("official tsunami feed fallback", () => {
  it("normalizes only recent active warning-center entries", () => {
    const signals = parseTsunamiAtom(ACTIVE_ATOM, "PTWC", new Date("2026-07-22T12:00:00Z").getTime());
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      source: "NOAA_TSUNAMI",
      sourceEventId: "atom-test-warning",
      severity: "Extreme",
      headline: "PTWC Tsunami Warning — Near the coast of Test",
      geometry: { type: "Point", latitude: 14.4, longitude: -93 },
    });

    expect(parseTsunamiAtom(
      ACTIVE_ATOM.replace(
        "Category:</strong> Warning<br/>Move inland.",
        "Category:</strong> Information<br/>A tsunami warning, advisory, or watch may exist elsewhere."
      ),
      "PTWC",
      new Date("2026-07-22T12:00:00Z").getTime()
    )).toEqual([]);
    expect(parseTsunamiAtom(ACTIVE_ATOM, "PTWC", new Date("2026-07-24T12:00:00Z").getTime())).toEqual([]);
  });

  it("uses the official Atom feeds when the JSON endpoint fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T12:00:00Z"));
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Bad gateway", { status: 502 }))
      .mockResolvedValueOnce(new Response(ACTIVE_ATOM, { status: 200 }))
      .mockResolvedValueOnce(new Response("<feed></feed>", { status: 200 }));

    const result = await fetchTsunamiFeed({ noaaEnabled: true });
    expect(result.mode).toBe("official-fallback");
    expect(result.primaryError).toContain("502");
    expect(result.signals).toHaveLength(1);
  });

  it("throws a combined error only when the JSON and both Atom paths fail", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Bad gateway", { status: 502 }))
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));

    await expect(fetchTsunamiFeed({ noaaEnabled: true }))
      .rejects.toThrow(/NOAA Tsunami unavailable.*official Atom fallback unavailable/);
  });

  it("reports official-feed failure for locations outside the JSON endpoint coverage", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));

    await expect(fetchTsunamiFeed({ noaaEnabled: false }))
      .rejects.toThrow(/Official NOAA tsunami feeds unavailable/);
  });
});
