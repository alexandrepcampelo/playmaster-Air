/**
 * PlayMaster Air — path router for Cloudflare Workers.
 *
 * Bind AIR_PAGES_ORIGIN to the project's *.pages.dev origin, e.g.
 * https://playmaster-air.pages.dev (no trailing slash).
 *
 * Requests to /Air/* are forwarded to the Pages project with /Air stripped.
 * The browser URL remains under /Air/.
 */
export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const prefix = "/Air";

    if (incoming.pathname === prefix) {
      return Response.redirect(new URL(prefix + "/", incoming), 308);
    }

    if (!incoming.pathname.startsWith(prefix + "/")) {
      return fetch(request);
    }

    if (!env.AIR_PAGES_ORIGIN) {
      return new Response("AIR_PAGES_ORIGIN não configurado.", { status: 503 });
    }

    const origin = new URL(env.AIR_PAGES_ORIGIN);
    if (origin.protocol !== "https:") {
      return new Response("AIR_PAGES_ORIGIN precisa usar HTTPS.", { status: 500 });
    }

    const target = new URL(incoming.pathname.slice(prefix.length) + incoming.search, origin);
    return fetch(new Request(target, request));
  },
};
