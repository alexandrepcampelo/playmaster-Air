Warning: truncated output (original token count: 228)
Total output lines: 18

const CACHE_NAME="playmaster-air-shell-v179";
const APP_SHELL=["/","/index.html","/manifest.webmanifest","/playmaster-logo.png.png"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(ke…28 tokens truncated…("fetch",event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).catch(()=>caches.match("/index.html")));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
