export interface Config {
  apiBaseUrl: string;
  apiToken: string;
  port: number;
}

export function loadConfig(): Config {
  const apiBaseUrl = process.env.CRONOZEN_API_URL || 'http://localhost:3000';
  const apiToken = process.env.CRONOZEN_API_TOKEN || '';
  const port = parseInt(process.env.MCP_PORT || '3100', 10);

  if (!apiToken) {
    console.warn(
      'Warning: CRONOZEN_API_TOKEN is not set. Authenticated API calls will fail.'
    );
  }

  return Object.freeze({ apiBaseUrl, apiToken, port });
}
