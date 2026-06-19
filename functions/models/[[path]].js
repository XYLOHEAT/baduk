// Pages Function: stream /models/* from the R2 bucket (MODELS binding), same-origin,
// so the dan net (>25MB, can't be a Pages static file) loads under CSP connect-src 'self'.
export async function onRequestGet(context) {
  const { params, env } = context;
  const key = Array.isArray(params.path) ? params.path.join('/') : params.path;
  let obj = null;
  try { obj = env.MODELS ? await env.MODELS.get(key) : null; } catch (e) { obj = null; }
  if (!obj) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  if (!headers.has('content-type')) headers.set('content-type', 'application/gzip');
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('cross-origin-resource-policy', 'same-origin'); // loadable under COEP require-corp
  return new Response(obj.body, { headers });
}
