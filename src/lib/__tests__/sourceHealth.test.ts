import { describe, expect, it } from "vitest";
import { hardSourceErrors, querySourceHealth } from "../sourceHealth";

describe("source health", () => {
  it("marks a failed refresh with cached data as degraded", () => {
    const health = querySourceHealth({
      id: "example",
      label: "Example source",
      enabled: true,
      isLoading: false,
      isFetching: false,
      error: "upstream returned 502",
      count: 3,
      liveDetail: "3 records.",
      emptyDetail: "No records.",
    });

    expect(health).toMatchObject({ status: "degraded", count: 3 });
    expect(health.detail).toContain("Showing cached data");
    expect(hardSourceErrors([health])).toEqual([]);
  });

  it("keeps an initial failure as a hard source error", () => {
    const health = querySourceHealth({
      id: "example",
      label: "Example source",
      enabled: true,
      isLoading: false,
      isFetching: false,
      error: "upstream returned 502",
      count: 0,
      liveDetail: "Records available.",
      emptyDetail: "No records.",
    });

    expect(health.status).toBe("error");
    expect(hardSourceErrors([health])).toEqual([
      "Example source: upstream returned 502",
    ]);
  });

  it("can classify an optional source failure as unavailable", () => {
    const health = querySourceHealth({
      id: "optional",
      label: "Optional source",
      enabled: true,
      isLoading: false,
      isFetching: false,
      error: "temporarily offline",
      count: 0,
      liveDetail: "Records available.",
      emptyDetail: "No records.",
      failureStatus: "unavailable",
    });

    expect(health.status).toBe("unavailable");
    expect(hardSourceErrors([health])).toEqual([]);
  });
});
