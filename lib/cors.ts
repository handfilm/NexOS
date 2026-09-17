/**
 * CORS Security Helper for Public API Endpoints
 * Supports https://b2b.handsandhead.com and local development origins
 */

const ALLOWED_ORIGINS = [
  'https://b2b.handsandhead.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

export function getCorsHeaders(request?: Request): Record<string, string> {
  let origin = 'https://b2b.handsandhead.com';
  if (request) {
    const reqOrigin = request.headers.get('origin');
    if (reqOrigin && (ALLOWED_ORIGINS.includes(reqOrigin) || reqOrigin.endsWith('.handsandhead.com'))) {
      origin = reqOrigin;
    }
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

export function handleOptionsResponse(request?: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
