import type { Request } from 'express';

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.substring(7).trim();
  }
  return null;
}
