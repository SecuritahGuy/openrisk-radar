import { adsenseClient, isAdEligibleRoute } from "../../config/advertising";

export function AdSlot({ pathname, placement }: { pathname: string; placement: string }) {
  const enabled = import.meta.env.PROD && Boolean(adsenseClient()) && isAdEligibleRoute(pathname);
  // Consent management and real slot IDs are intentionally not implemented yet.
  if (!enabled) return null;
  return <div className="ad-slot" data-placement={placement} aria-label="Advertisement" />;
}
