import { admitSameSiteRequest } from '../../../src/localRequestGate.mjs';

// zh-tw-plugin（Render 部署用）：GEV_TRUST_HOSTING_PROXY=1 時，原本因為帶了
// X-Forwarded-* 而被拒的路線改用 admitSameSiteKeyless 的規則（仍擋跨站請求）。
// 只要伺服器設定了任何金鑰，這個開關自動失效，回到原作者的嚴格規則。
const KEY_ENV_NAMES = Object.freeze([
  'AISSTREAM_API_KEY',
  'CESIUM_ION_TOKEN',
  'FIRMS_MAP_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_MAPS_API_KEY',
  'GOOGLE_MAPS_SERVER_API_KEY',
  'LIVEUAMAP_API_KEY',
  'LL2_API_TOKEN',
  'MAPILLARY_CLIENT_TOKEN',
  'ONTARIO_511_API_KEY',
  'OPENAI_API_KEY',
  'OPENSKY_CLIENT_ID',
  'OPENSKY_CLIENT_SECRET',
  'TOMTOM_API_KEY',
  'WORLDNEWSAPI_KEY',
]);

let warnedKeys = false;
/** Whether the hosting platform's forwarding headers are trusted. */
export function trustsHostingProxy(env = process.env) {
  if (env.GEV_TRUST_HOSTING_PROXY !== '1') return false;
  const configured = KEY_ENV_NAMES.filter((name) =>
    String(env[name] ?? '').trim(),
  );
  if (!configured.length) return true;
  if (!warnedKeys) {
    warnedKeys = true;
    console.warn(
      `[same-site] GEV_TRUST_HOSTING_PROXY ignored: keys are configured (${configured.join(', ')})`,
    );
  }
  return false;
}

/**
 * Cross-site request gate for cost-bearing and log endpoints. Feeds the
 * request to the pure, unit-tested `admitSameSiteRequest` and answers 403
 * itself when the request is refused. Returns true when it has already
 * responded (the caller returns); false when the handler should continue.
 * Refuses cross-site browser requests (foreign or opaque Origin, a
 * Sec-Fetch-Site other than same-origin/none, or reverse-proxy headers) while
 * keeping loopback non-browser tools and the HOST=0.0.0.0 LAN opt-in working.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {boolean} True when a 403 was sent.
 */
export function admitSameSite(req, res) {
  // zh-tw-plugin：免金鑰的公開部署（Render）在反向代理後面，改用 keyless 規則。
  if (trustsHostingProxy()) return admitSameSiteKeyless(req, res);
  const verdict = admitSameSiteRequest({
    hostHeader: req.headers?.host,
    protocol: req.socket?.encrypted ? 'https:' : 'http:',
    origin: req.headers?.origin,
    secFetchSite: req.headers?.['sec-fetch-site'],
    proxyHeaders: req.headers || {},
  });
  if (verdict.ok) return false;
  res.statusCode = verdict.status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ error: verdict.error }));
  return true;
}

/**
 * Wrap a middleware handler so cross-site requests are refused with 403
 * before the handler runs. Loopback tools and same-origin browser requests
 * pass straight through.
 * @param {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next?: Function) => unknown} handler
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next?: Function) => unknown}
 */
export function sameSiteGated(handler) {
  return (req, res, next) => {
    if (admitSameSite(req, res)) return undefined;
    return handler(req, res, next);
  };
}

/**
 * Proxy header values arrive client-controlled; read one only when it is a
 * single scheme token, never a comma-separated chain.
 * @param {import('node:http').IncomingMessage} req
 * @returns {'http:'|'https:'}
 */
function forwardedProtocol(req) {
  if (req.socket?.encrypted) return 'https:';
  const proto = String(req.headers?.['x-forwarded-proto'] || '')
    .trim()
    .toLowerCase();
  return proto === 'https' ? 'https:' : 'http:';
}

/**
 * Cross-site gate for keyless routes the map needs in order to render
 * (`/api/terrain/heights`, `/api/overpass`). It refuses the same cross-site browser shapes as
 * `admitSameSite` (a `Sec-Fetch-Site` other than same-origin/none, a foreign
 * or opaque `Origin`) but does not refuse reverse-proxy forwarding headers:
 * those protect credentials and spend, which a keyless route has neither of,
 * and refusing them would break rendering for an instance served behind the
 * reverse proxy the README documents. A single `X-Forwarded-Proto` supplies
 * the scheme an `Origin` is compared against. That header cannot be attached
 * to a cross-site browser request without a CORS preflight this server never
 * answers, and `Sec-Fetch-Site` is still enforced regardless.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {boolean} True when a 403 was sent.
 */
export function admitSameSiteKeyless(req, res) {
  const verdict = admitSameSiteRequest({
    hostHeader: req.headers?.host,
    protocol: forwardedProtocol(req),
    origin: req.headers?.origin,
    secFetchSite: req.headers?.['sec-fetch-site'],
    proxyHeaders: {},
  });
  if (verdict.ok) return false;
  res.statusCode = verdict.status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ error: verdict.error }));
  return true;
}
