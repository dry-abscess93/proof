import type { CronozenConfig, ProofAPIErrorBody } from './types';
import { CronozenError, NetworkError, TimeoutError } from './errors';

const DEFAULT_TIMEOUT = 10_000;

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly timeout: number;

  constructor(config: CronozenConfig) {
    if (!config.apiKey) {
      throw new Error('Cronozen: apiKey is required');
    }
    if (!config.baseUrl) {
      throw new Error('Cronozen: baseUrl is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.fetchFn = config.fetch ?? globalThis.fetch;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      query?: Record<string, string | number | undefined>;
    },
  ): Promise<T> {
    const url = this.buildUrl(path, options?.query);

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url, {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorBody: ProofAPIErrorBody;
        try {
          errorBody = await response.json() as ProofAPIErrorBody;
        } catch {
          throw new CronozenError(
            `HTTP ${response.status}: ${response.statusText}`,
            'UNKNOWN',
            response.status,
          );
        }
        throw CronozenError.fromResponse(response.status, errorBody);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof CronozenError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new TimeoutError(this.timeout);
      }

      throw new NetworkError(
        error instanceof Error ? error.message : 'Unknown network error',
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }
}
