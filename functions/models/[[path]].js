// Pages Function: stream /models/* from the R2 bucket (MODELS binding), same-origin,
// so the dan net (>25MB, can't be a Pages static file) loads under CSP connect-src 'self'.
// Handles GET (worker fetch) and HEAD; HEAD uses .head() to avoid pulling the whole object.
export async function onRequest(context) {
  const { params, env, request } = context;
  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD') return new Response('Method not allowed', { status: 405 });

  // Only our own page may pull the ~93MB net. Browsers label the request via Sec-Fetch-Site;
  // the neural worker's same-origin fetch() sends 'same-origin'. Anything explicitly labelled
  // cross-site (hotlinking from another site) or 'none' (someone pasting the URL directly) is
  // refused. Requests without the header (older browsers, curl) are still allowed — this stops
  // casual hotlinking and accidental downloads, not a determined scraper; rate limiting at the
  // edge is the control for that.
  const site = request.headers.get('sec-fetch-site');
  if (site === 'cross-site' || site === 'none') {
    return new Response('Not available for direct or cross-site requests', {
      status: 403, headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' }
    });
  }

  const key = Array.isArray(params.path) ? params.path.join('/') : params.path;
  try {
    if (method === 'HEAD') {
      const meta = env.MODELS ? await env.MODELS.head(key) : null;
      if (!meta) return new Response(null, { status: 404 });
      const h = new Headers();
      meta.writeHttpMetadata(h); h.set('etag', meta.httpEtag);
      if (!h.has('content-type')) h.set('content-type', 'application/gzip');
      h.set('content-length', String(meta.size));
      h.set('cache-control', 'public, max-age=31536000, immutable');
      h.set('cross-origin-resource-policy', 'same-origin');
      return new Response(null, { headers: h });
    }
    const obj = env.MODELS ? await env.MODELS.get(key) : null;
    if (!obj) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    const h = new Headers();
    obj.writeHttpMetadata(h); h.set('etag', obj.httpEtag);
    if (!h.has('content-type')) h.set('content-type', 'application/gzip');
    h.set('cache-control', 'public, max-age=31536000, immutable');
    h.set('cross-origin-resource-policy', 'same-origin'); // loadable under COEP require-corp
    return new Response(obj.body, { headers: h });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
}
