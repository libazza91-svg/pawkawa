import type { RouteState } from './app-types';

export function parseRoute(pathname: string): RouteState {
  if (pathname.startsWith('/product/')) return { name: 'product', slug: decodeURIComponent(pathname.replace('/product/', '')) };
  if (pathname.startsWith('/brand/')) return { name: 'brand', slug: decodeURIComponent(pathname.replace('/brand/', '')) };
  if (pathname === '/search') return { name: 'search' };
  if (pathname === '/compare') return { name: 'compare' };
  return { name: 'landing' };
}
