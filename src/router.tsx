/* eslint-disable react-refresh/only-export-components -- router utilities and link behavior share one small module */
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

export function normalizePath(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

export function navigate(to: string, replace = false) {
  if (replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function usePathname() {
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname));
  useEffect(() => {
    const update = () => setPathname(normalizePath(window.location.pathname));
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return pathname;
}

export function Link({ to, children, className, onClick, ...rest }: {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (to.startsWith("http") || to.startsWith("mailto:")) return;
    event.preventDefault();
    onClick?.();
    navigate(to);
  };
  return <a href={to} className={className} onClick={handleClick} {...rest}>{children}</a>;
}

export function ScrollToTop({ pathname }: { pathname: string }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}
