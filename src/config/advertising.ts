export const AD_ELIGIBLE_ROUTES = ["/", "/learn", "/data-sources", "/methodology"] as const;
export const AD_EXCLUDED_ROUTES = ["/app", "/privacy", "/terms", "/contact", "/404"] as const;

export function isAdEligibleRoute(pathname: string): boolean {
  if (AD_EXCLUDED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return false;
  return pathname === "/" || pathname === "/learn" || pathname.startsWith("/learn/") || pathname === "/data-sources" || pathname === "/methodology";
}

export function adsenseClient(): string | null {
  const value = import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT?.trim();
  return value || null;
}
