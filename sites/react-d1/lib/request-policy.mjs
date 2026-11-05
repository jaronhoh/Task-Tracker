import { HttpError } from './rules.mjs';

// CR-024 defense-in-depth at the application's API boundary.
//
// This is a browser request-integrity check, NOT user authentication.
// The real Sites Owner-only access policy MUST be verified to protect every
// /api/** route before the request reaches this handler.
export function assertInternalApiRequest(request) {
  const url = new URL(request.url)
  const fetchSite = request.headers.get('sec-fetch-site')
  // "same-site" includes other subdomains, which are not this application.
  // Browser "none" denotes an address-bar navigation or similar direct action.
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) {
    throw new HttpError(403, 'Cross-origin API requests are not allowed.', 'CROSS_ORIGIN_API_DENIED')
  }
  const origin = request.headers.get('origin')
  if (origin) {
    let parsed
    try { parsed = new URL(origin) } catch {
      throw new HttpError(403, 'Invalid request Origin.', 'CROSS_ORIGIN_API_DENIED')
    }
    if (parsed.origin !== url.origin) {
      throw new HttpError(403, 'Cross-origin API requests are not allowed.', 'CROSS_ORIGIN_API_DENIED')
    }
  }

  // JSON-only writes make form-encoded/text-plain CSRF attempts unusable.
  // This does not replace the Sites login/session or its CSRF protection.
  if (['POST', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type') || ''
    if (!/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
      throw new HttpError(415, 'JSON Content-Type is required.', 'UNSUPPORTED_MEDIA_TYPE')
    }
  }
}

export const apiHeaders = {
  'Cache-Control': 'no-store',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff'
}

export function apiError(error) {
  return Response.json({
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error instanceof HttpError ? error.message : 'An unexpected server error occurred.',
      ...(Number.isInteger(error.taskCount) ? { taskCount: error.taskCount } : {})
    }
  }, {
    status: error instanceof HttpError ? error.status : 500,
    headers: apiHeaders
  })
}
