import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFemaRiskIndexCounty } from "../femaRiskIndex";

describe("fetchFemaRiskIndexCounty", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps county-level NRI data and sorts top hazards by score", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            attributes: {
              COUNTY: "Cook",
              STATEABBRV: "IL",
              STCOFIPS: "17031",
              POPULATION: 5_200_000,
              RISK_SCORE: 99.9,
              RISK_RATNG: "Very High",
              RISK_SPCTL: 99.9,
              EAL_VALT: 2_424_304_449,
              EAL_RATNG: "Very High",
              SOVI_RATNG: "Relatively High",
              RESL_RATNG: "Relatively High",
              TRND_RISKS: 95,
              TRND_RISKR: "Very High",
              HWAV_RISKS: 88,
              HWAV_RISKR: "Relatively High",
              WFIR_RISKS: 2,
              WFIR_RISKR: "Relatively Low",
            },
          },
        ],
      }),
    } as Response);

    const result = await fetchFemaRiskIndexCounty("17031");

    expect(result).toMatchObject({
      county: "Cook",
      state: "IL",
      stateCountyFips: "17031",
      riskRating: "Very High",
      expectedAnnualLoss: 2_424_304_449,
      socialVulnerabilityRating: "Relatively High",
      communityResilienceRating: "Relatively High",
    });
    expect(result?.topHazards.map((hazard) => hazard.label)).toEqual([
      "Tornado",
      "Heat wave",
      "Wildfire",
    ]);
  });

  it("returns null when no county record is found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    } as Response);

    await expect(fetchFemaRiskIndexCounty("99999")).resolves.toBeNull();
  });
});
