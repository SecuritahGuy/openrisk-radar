import { describe, expect, it } from "vitest";
import { readJsonResponse, readTextResponse } from "../http";

describe("HTTP response validation", () => {
  it("explains when a proxy falls through to the SPA", async () => {
    const response = new Response("<!doctype html><title>OpenRisk</title>", {
      headers: { "Content-Type": "text/html" },
    });
    await expect(readJsonResponse(response, "FEMA NRI API")).rejects.toThrow("proxy is unavailable");
  });

  it("parses valid JSON", async () => {
    const response = new Response('{"items":[]}', {
      headers: { "Content-Type": "application/json" },
    });
    await expect(readJsonResponse<{ items: unknown[] }>(response, "NOAA Tsunami API"))
      .resolves.toEqual({ items: [] });
  });

  it("rejects HTML even when its content type is wrong", async () => {
    const response = new Response("  <!DOCTYPE html><p>fallback</p>");
    await expect(readTextResponse(response, "NOAA Storm Events API")).rejects.toThrow(
      "app shell instead of data"
    );
  });
});
