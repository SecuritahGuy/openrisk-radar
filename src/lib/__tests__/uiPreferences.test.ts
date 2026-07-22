import { describe, expect, it } from "vitest";
import { readBooleanPreference, writeBooleanPreference } from "../uiPreferences";

describe("UI preferences", () => {
  it("persists the monitored-place collapse state", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };
    expect(readBooleanPreference(storage, "overview")).toBe(false);
    writeBooleanPreference(storage, "overview", true);
    expect(readBooleanPreference(storage, "overview")).toBe(true);
  });

  it("falls back safely when browser storage is unavailable", () => {
    const broken = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    };
    expect(readBooleanPreference(broken, "overview", true)).toBe(true);
    expect(() => writeBooleanPreference(broken, "overview", false)).not.toThrow();
  });
});
