// ── Connector Registry (Epic B3) ─────────────────────────────────

import { Connector } from './interface';

const registry = new Map<string, Connector>();

export function register(connector: Connector): void {
  if (registry.has(connector.name)) {
    throw new Error(`Connector "${connector.name}" is already registered`);
  }
  registry.set(connector.name, connector);
}

export function get(name: string): Connector | undefined {
  return registry.get(name);
}

export function listAll(): Connector[] {
  return Array.from(registry.values());
}
