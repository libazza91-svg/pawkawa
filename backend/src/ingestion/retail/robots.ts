import { RobotsCheckResult } from './types';

interface RuleGroup {
  agents: string[];
  disallow: string[];
  allow: string[];
}

function normalizePath(value: string): string {
  return value.trim().split('#')[0].trim();
}

export function parseRobotsTxt(content: string): RuleGroup[] {
  const groups: RuleGroup[] = [];
  let current: RuleGroup | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim();
    if (!line || !line.includes(':')) continue;
    const [rawKey, ...rest] = line.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (key === 'user-agent') {
      if (!current || current.disallow.length > 0 || current.allow.length > 0) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if (!current) continue;
    if (key === 'disallow') current.disallow.push(normalizePath(value));
    if (key === 'allow') current.allow.push(normalizePath(value));
  }

  return groups;
}

function matchesPattern(pathname: string, pattern: string): boolean {
  if (!pattern) return false;
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\\\$/g, '$');
  return new RegExp(`^${escaped}`).test(pathname);
}

export function isAllowedByRobots(content: string, targetUrl: string, userAgent: string): RobotsCheckResult {
  const url = new URL(targetUrl);
  const groups = parseRobotsTxt(content);
  const normalizedAgent = userAgent.toLowerCase();
  const matchingGroups = groups.filter((group) => group.agents.some((agent) => agent === '*' || normalizedAgent.includes(agent)));
  const group = matchingGroups[0];

  if (!group) {
    return { allowed: true, robotsUrl: new URL('/robots.txt', url.origin).toString(), reason: 'No matching robots group' };
  }

  const allowMatch = group.allow.filter((rule) => matchesPattern(url.pathname, rule)).sort((a, b) => b.length - a.length)[0];
  const disallowMatch = group.disallow.filter((rule) => matchesPattern(url.pathname, rule)).sort((a, b) => b.length - a.length)[0];

  if (disallowMatch && (!allowMatch || disallowMatch.length >= allowMatch.length)) {
    return {
      allowed: false,
      robotsUrl: new URL('/robots.txt', url.origin).toString(),
      reason: `Disallowed by robots rule ${disallowMatch}`,
    };
  }

  return { allowed: true, robotsUrl: new URL('/robots.txt', url.origin).toString(), reason: allowMatch ? `Allowed by rule ${allowMatch}` : 'No disallow match' };
}

export async function checkRobotsAllowed(targetUrl: string, userAgent: string, fetchText = fetch): Promise<RobotsCheckResult> {
  const url = new URL(targetUrl);
  const robotsUrl = new URL('/robots.txt', url.origin).toString();
  const response = await fetchText(robotsUrl, { headers: { 'user-agent': userAgent } });
  if (!response.ok) {
    return { allowed: false, robotsUrl, reason: `robots.txt returned HTTP ${response.status}` };
  }
  const content = await response.text();
  return isAllowedByRobots(content, targetUrl, userAgent);
}
