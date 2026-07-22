export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readBooleanPreference(
  storage: PreferenceStorage | null,
  key: string,
  fallback = false
): boolean {
  if (!storage) return fallback;
  try {
    const value = storage.getItem(key);
    return value == null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

export function writeBooleanPreference(
  storage: PreferenceStorage | null,
  key: string,
  value: boolean
): void {
  if (!storage) return;
  try {
    storage.setItem(key, String(value));
  } catch {
    // The UI remains usable when storage is unavailable or full.
  }
}
