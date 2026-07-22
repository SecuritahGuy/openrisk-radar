export type SourceHealthStatus =
  | "disabled"
  | "loading"
  | "live"
  | "empty"
  | "degraded"
  | "error"
  | "unavailable";

export interface SourceHealthItem {
  id: string;
  label: string;
  status: SourceHealthStatus;
  count: number | null;
  detail: string;
}

export function querySourceHealth({
  id,
  label,
  enabled,
  isLoading,
  isFetching,
  error,
  count,
  liveDetail,
  emptyDetail,
  disabledDetail,
  failureStatus = "error",
}: {
  id: string;
  label: string;
  enabled: boolean;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  count: number;
  liveDetail: string;
  emptyDetail: string;
  disabledDetail?: string;
  failureStatus?: "error" | "unavailable";
}): SourceHealthItem {
  if (!enabled) {
    return {
      id,
      label,
      status: "disabled",
      count: null,
      detail: disabledDetail ?? "Waiting for a location search.",
    };
  }

  if (error && count > 0) {
    return {
      id,
      label,
      status: "degraded",
      count,
      detail: `Showing cached data; the latest refresh failed: ${error}`,
    };
  }

  if (error) {
    return { id, label, status: failureStatus, count, detail: error };
  }

  if (isLoading || (isFetching && count === 0)) {
    return {
      id,
      label,
      status: "loading",
      count,
      detail: "Checking source.",
    };
  }

  return {
    id,
    label,
    status: count > 0 ? "live" : "empty",
    count,
    detail: count > 0 ? liveDetail : emptyDetail,
  };
}

export function hardSourceErrors(items: SourceHealthItem[]): string[] {
  return items
    .filter((item) => item.status === "error")
    .map((item) => `${item.label}: ${item.detail}`);
}
