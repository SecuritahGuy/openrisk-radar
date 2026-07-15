import { describe, expect, it } from "vitest";
import { pushFailureAction } from "../pushDelivery";

describe("push provider failure handling", () => {
  it("invalidates expired endpoints", () => {
    expect(pushFailureAction(404)).toBe("invalid");
    expect(pushFailureAction(410)).toBe("invalid");
  });

  it("retries throttling and provider failures only", () => {
    expect(pushFailureAction(429)).toBe("retry");
    expect(pushFailureAction(503)).toBe("retry");
    expect(pushFailureAction(400)).toBe("failed");
    expect(pushFailureAction()).toBe("failed");
  });
});
