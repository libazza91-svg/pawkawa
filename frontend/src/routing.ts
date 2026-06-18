import type { RouteState } from './app-types';

export function parseRoute(pathname: string): RouteState {
  if (pathname.startsWith('/price/')) return { name: 'price', slug: decodeURIComponent(pathname.replace('/price/', '')) };
  if (pathname.startsWith('/product/')) return { name: 'product', slug: decodeURIComponent(pathname.replace('/product/', '')) };
  if (pathname.startsWith('/brand/')) return { name: 'brand', slug: decodeURIComponent(pathname.replace('/brand/', '')) };
  if (pathname === '/search') return { name: 'search' };
  if (pathname === '/compare') return { name: 'compare' };
  if (pathname === '/learn') return { name: 'learn' };
  if (pathname === '/about') return { name: 'about' };
  return { name: 'landing' };
}
