/**
 * CORS Security Helper for Public & Dual-Site API Endpoints
 * Supports admin.handsandhead.com, handsandhead.ai.studio, all *.handsandhead.com
 * subdomains, *.aistudio.google.com, *.github.io (RAWx), *.pages.dev, and localhost.
 */

const EXACT_ALLOWED_ORIGINS: ReadonlySet<string> = new Set<string>([
  'https://admin.handsandhead.com',
  'https://handsandhead.ai.studio',
  'https://handsandhead.com',
  'https://www.handsandhead.com',
  'https://storyboard.handsandhead.com',
  'https://d2c.handsandhead.com',
  'https://b2b.handsandhead.com',
]);

const ALLOWED_HTTPS_SUFFIXES: ReadonlyArray<string> = [
  '.handsandhead.com',
  '.aistudio.google.com',
  '.github.io',
  '.pages.dev',
];

export function isOriginAllowed(originHeader: string | null): boolean {
  if (!originHeader) return false;
  const trimmed = originHeader.trim();
  if (EXACT_ALLOWED_ORIGINS.has(trimmed)) return true;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      return true;
    }
  }
  if (parsed.protocol !== 'https:') return false;

  return ALLOWED_HTTPS_SUFFIXES.some((suffix) => host.endsWith(suffix) && host.length > suffix.length);
}

export function getCorsHeaders(request?: Request): Record<string, string> {
  const reqOrigin = request?.headers.get('origin') ?? null;
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-NexOS-Source, X-NexOS-Mirror',
    'Vary': 'Origin',
  };

  if (reqOrigin && isOriginAllowed(reqOrigin)) {
    headers['Access-Control-Allow-Origin'] = reqOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

export function handleOptionsResponse(request?: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
// END OF FILE: lib/cors.ts
