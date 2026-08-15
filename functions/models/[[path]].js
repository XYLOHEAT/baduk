// Pages Function: stream /models/* from the R2 bucket (MODELS binding), same-origin,
// so the dan net (>25MB, can't be a Pages static file) loads under CSP connect-src 'self'.
// Handles GET (worker fetch) and HEAD; HEAD uses .head() to avoid pulling the whole object.
export async function onRequest(context) {
  const { params, env, request } = context;
  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD') return new Response('Method not allowed', { status: 405 });

  // Anti-hotlink hygiene for the ~93MB net. The neural worker's same-origin fetch() is labelled
  // Sec-Fetch-Site: same-origin; requests explicitly labelled cross-site (hotlinked from another
  // site) or 'none' (URL pasted straight into the address bar) are refused. Missing header
  // (older browsers, CLI tools) still passes.
  // NOTE: the response is cached at the edge as immutable, and a cache HIT never reaches this
  // Function — so this only applies on cache misses. That is fine: a cached hit costs no R2
  // reads and Pages bandwidth is unmetered, so hotlinking is cheap rather than dangerous.
  // Deliberately NOT adding `Vary: Sec-Fetch-Site`, which would enforce it on every request but
  // split a 93MB object into several cache variants — a worse trade than the threat.
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
