import { RetailerDiscoveryConfig, RobotsComplianceResult } from './types';

function pathMatches(rulePath: string, targetPath: string): boolean {
  if (!rulePath) return false;
  if (rulePath === '/') return true;
  return targetPath.startsWith(rulePath);
}

export function evaluateRobotsTxt(
  robotsTxt: string,
  targetUrl: string,
  userAgent = '*',
): Pick<RobotsComplianceResult, 'allowed' | 'reason'> {
  const target = new URL(targetUrl);
  const groups: { agents: string[]; rules: Array<{ type: 'allow' | 'disallow'; path: string }> }[] = [];
  let current: { agents: string[]; rules: Array<{ type: 'allow' | 'disallow'; path: string }> } | null = null;

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (key === 'user-agent') {
      current = { agents: [value.toLowerCase()], rules: [] };
      groups.push(current);
      continue;
    }

    if (!current) continue;
    if (key === 'allow' || key === 'disallow') {
      current.rules.push({ type: key, path: value });
    }
  }

  const agent = userAgent.toLowerCase();
  const matchingGroups = groups.filter((group) => group.agents.includes('*') || group.agents.includes(agent));
  const matchingRules = matchingGroups.flatMap((group) => group.rules).filter((rule) => pathMatches(rule.path, target.pathname));

  if (matchingRules.length === 0) {
    return { allowed: true, reason: 'No matching disallow rule.' };
  }

  const strongest = matchingRules.sort((a, b) => b.path.length - a.path.length)[0];
  if (strongest.type === 'allow') {
    return { allowed: true, reason: `Allowed by robots rule: ${strongest.path}` };
  }

  return { allowed: false, reason: `Disallowed by robots rule: ${strongest.path}` };
}

export async function checkRobotsCompliance(
  config: RetailerDiscoveryConfig,
  targetUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<RobotsComplianceResult> {
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetcher(config.robots_url, {
      headers: { 'User-Agent': 'PawkawaBot/0.1 (+https://pawkawa.local)' },
    });

    if (!response.ok) {
      return {
        source: config.name,
        robots_url: config.robots_url,
        checked_at: checkedAt,
        allowed: false,
        reason: `Robots check failed with HTTP ${response.status}.`,
      };
    }

    const robotsTxt = await response.text();
    const result = evaluateRobotsTxt(robotsTxt, targetUrl);
    return {
      source: config.name,
      robots_url: config.robots_url,
      checked_at: checkedAt,
      ...result,
    };
  } catch (error) {
    return {
      source: config.name,
      robots_url: config.robots_url,
      checked_at: checkedAt,
      allowed: false,
      reason: `Robots check failed: ${(error as Error).message}`,
    };
  }
}
