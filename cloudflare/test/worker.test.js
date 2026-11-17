import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

test("redirects /Air to /Air/", async () => {
  const request = new Request("https://radio.example/Air");
  const response = await worker.fetch(request, {});
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://radio.example/Air/");
});

test("routes static requests to Pages and strips /Air", async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async request => {
    forwarded = request;
    return new Response("pages-ok");
  };
  try {
    const request = new Request("https://radio.example/Air/index.html?mode=1");
    const response = await worker.fetch(request, {
      AIR_PAGES_ORIGIN: "https://air-preview.pages.dev"
    });
    assert.equal(await response.text(), "pages-ok");
    assert.equal(forwarded.url, "https://air-preview.pages.dev/index.html?mode=1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("routes API requests to backend and preserves method, body and query", async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async request => {
    forwarded = request;
    return new Response("api-ok");
  };
  try {
    const request = new Request("https://radio.example/Air/api/library?category=M%C3%BAsicas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ test: true })
    });
    const response = await worker.fetch(request, {
      AIR_API_ORIGIN: "https://api.example.net"
    });
    assert.equal(await response.text(), "api-ok");
    assert.equal(forwarded.url, "https://api.example.net/api/library?category=M%C3%BAsicas");
    assert.equal(forwarded.method, "POST");
    assert.deepEqual(await forwarded.json(), { test: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns explicit 503 when API backend is not configured", async () => {
  const response = await worker.fetch(
    new Request("https://radio.example/Air/api/me"),
    { AIR_PAGES_ORIGIN: "https://air-preview.pages.dev" }
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "AIR_API_ORIGIN_MISSING");
});

test("does not intercept paths outside /Air", async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async request => {
    forwarded = request;
    return new Response("untouched");
  };
  try {
    const request = new Request("https://radio.example/");
    const response = await worker.fetch(request, {});
    assert.equal(await response.text(), "untouched");
    assert.equal(forwarded.url, request.url);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("routes Traffic API through its own origin", async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async request => {
    forwarded = request;
    return new Response(JSON.stringify({ nextBlock: "ok" }), {
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const request = new Request("https://radio.example/Air/traffic-api/next-block?station=1");
    const response = await worker.fetch(request, {
      AIR_TRAFFIC_ORIGIN: "https://traffic.example.org"
    });
    assert.equal(response.status, 200);
    assert.equal(forwarded.url, "https://traffic.example.org/next-block?station=1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns explicit 503 when Traffic is not configured", async () => {
  const response = await worker.fetch(
    new Request("https://radio.example/Air/traffic-api/next-block"),
    { AIR_PAGES_ORIGIN: "https://air-preview.pages.dev" }
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "AIR_TRAFFIC_ORIGIN_MISSING");
});
