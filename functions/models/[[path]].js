// Pages Function: serve /models/* from the R2 bucket (MODELS binding), same-origin,
// so the big dan net (>25MB, can't be a Pages static file) loads under CSP connect-src 'self'.
// Falls back to static assets (e.g. the small net) when the key isn't in R2.
export async function onRequestGet(context) {
  const { params, env, request } = context;
  const key = Array.isArray(params.path) ? params.path.join('/') : params.path;
  const obj = env.MODELS ? await env.MODELS.get(key) : null;
  if (obj) {
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    if (!headers.has('content-type')) headers.set('content-type', 'application/gzip');
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    headers.set('cross-origin-resource-policy', 'same-origin'); // loadable under COEP require-corp
    return new Response(obj.body, { headers });
  }
  return env.ASSETS.fetch(request); // static fallback (small net, etc.)
}
