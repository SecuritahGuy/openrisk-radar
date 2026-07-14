import { describe, expect, it } from "vitest";
import { gridValueAtTime } from "../nwsWeatherOverlay";

describe("gridValueAtTime", () => {
  it("selects the value whose NWS validity interval contains the current time", () => {
    const values = [
      { validTime: "2026-07-14T10:00:00Z/PT2H", value: 10 },
      { validTime: "2026-07-14T12:00:00Z/PT3H", value: 60 },
    ];
    expect(gridValueAtTime(values, new Date("2026-07-14T13:00:00Z").getTime())).toBe(60);
  });

  it("uses the next forecast value before the series begins", () => {
    const values = [{ validTime: "2026-07-14T12:00:00Z/PT1H", value: 25 }];
    expect(gridValueAtTime(values, new Date("2026-07-14T11:00:00Z").getTime())).toBe(25);
  });
});
