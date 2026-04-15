/**
 * Decide whether a navigation entry should render as the active route.
 *
 * - Root (`/`) only matches exactly. Without this, every route would treat
 *   the home link as active because every path starts with `/`.
 * - Non-root entries match either exactly or as a path prefix on a `/`
 *   boundary, so `/repositories` stays active while viewing
 *   `/repositories/abc` but not `/repositories-archive`.
 */
export function isActiveNavHref(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
