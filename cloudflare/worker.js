/**
 * PlayMaster Air — Cloudflare path router.
 *
 * Required binding:
 *   AIR_PAGES_ORIGIN = https://<project>.pages.dev
 *
 * Optional binding (when a compatible backend is deployed):
 *   AIR_API_ORIGIN = https://<api-host>
 *
 * Browser URLs remain under /Air/. The API origin must implement the existing
 * /api/* contract used by Air (session, library/audio, RSS, Voice Track, etc.).
 */
export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const prefix = "/Air";

    if (incoming.pathname === prefix) {
      return Response.redirect(new URL(prefix + "/", incoming), 308);
    }
    if (!incoming.pathname.startsWith(prefix + "/")) return fetch(request);

    if (incoming.pathname.startsWith(prefix + "/traffic-api/")) {
      if (!env.AIR_TRAFFIC_ORIGIN) {
        return new Response(JSON.stringify({
          error: "PlayMaster Traffic ainda não está configurado.",
          code: "AIR_TRAFFIC_ORIGIN_MISSING"
        }), {
          status: 503,
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
        });
      }
      const trafficOrigin = new URL(env.AIR_TRAFFIC_ORIGIN);
      if (trafficOrigin.protocol !== "https:") {
        return new Response("AIR_TRAFFIC_ORIGIN precisa usar HTTPS.", { status: 500 });
      }
      const trafficTarget = new URL(incoming.pathname.slice((prefix + "/traffic-api").length) + incoming.search, trafficOrigin);
      return fetch(new Request(trafficTarget, request));
    }

    if (incoming.pathname.startsWith(prefix + "/api/")) {
      if (!env.AIR_API_ORIGIN) {
        return new Response(JSON.stringify({
          error: "Backend do PlayMaster Air ainda não configurado.",
          code: "AIR_API_ORIGIN_MISSING"
        }), {
          status: 503,
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
        });
      }
      const apiOrigin = new URL(env.AIR_API_ORIGIN);
      if (apiOrigin.protocol !== "https:") {
        return new Response("AIR_API_ORIGIN precisa usar HTTPS.", { status: 500 });
      }
      const apiTarget = new URL(incoming.pathname.slice(prefix.length) + incoming.search, apiOrigin);
      return fetch(new Request(apiTarget, request));
    }

    if (!env.AIR_PAGES_ORIGIN) {
      return new Response("AIR_PAGES_ORIGIN não configurado.", { status: 503 });
    }
    const pagesOrigin = new URL(env.AIR_PAGES_ORIGIN);
    if (pagesOrigin.protocol !== "https:") {
      return new Response("AIR_PAGES_ORIGIN precisa usar HTTPS.", { status: 500 });
    }
    const pageTarget = new URL(incoming.pathname.slice(prefix.length) + incoming.search, pagesOrigin);
    return fetch(new Request(pageTarget, request));
  },
};
