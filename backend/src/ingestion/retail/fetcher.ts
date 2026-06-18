import { FetchResult, RetailIngestionConfig } from './types';

export const DEFAULT_RETAIL_INGESTION_CONFIG: RetailIngestionConfig = {
  userAgent: process.env.PAWKAWA_INGESTION_USER_AGENT ?? 'PawkawaBot/0.1 (+contact placeholder; price comparison pilot)',
  timeoutMs: 12000,
  retryCount: 1,
  delayMs: 2500,
  minimumWriteConfidence: 0.8,
};

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithTimeout(url: string, config: RetailIngestionConfig = DEFAULT_RETAIL_INGESTION_CONFIG): Promise<FetchResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'user-agent': config.userAgent,
          accept: 'text/html,application/xhtml+xml',
        },
      });
      const body = await response.text();
      if (response.status === 429 || response.status === 403) {
        throw Object.assign(new Error(`Fetch blocked with HTTP ${response.status}`), { status: response.status });
      }
      return {
        status: response.status,
        url: response.url || url,
        body,
        contentType: response.headers.get('content-type') ?? undefined,
      };
    } catch (error) {
      lastError = error;
      if (attempt >= config.retryCount) break;
      await delay(Math.min(config.delayMs, 1000));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Fetch failed');
}
