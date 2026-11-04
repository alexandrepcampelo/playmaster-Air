const CACHE_NAME="playmaster-air-shell-v395";
const APP_SHELL=["/","/index.html","/manifest.webmanifest","/playmaster-logo.png.png","/air-integration.js?v=375","/botoneira.js?v=40","/carimbo.js?v=39"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("playmaster-air-shell-")&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).catch(()=>caches.match("/index.html")));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
function readCarimbo(id){return new Promise((resolve,reject)=>{const request=indexedDB.open("playmaster-air-carimbo-v1",1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("mixes"))request.result.createObjectStore("mixes",{keyPath:"id"})};request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction("mixes","readonly"),get=tx.objectStore("mixes").get(id);get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);tx.oncomplete=()=>db.close()}})}
function carimboResponse(blob,range){const size=blob.size,headers={"Content-Type":"audio/wav","Accept-Ranges":"bytes","Cache-Control":"no-store"};if(!range)return new Response(blob,{headers:{...headers,"Content-Length":String(size)}});const match=/^bytes=([0-9]*)-([0-9]*)$/.exec(range);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{...headers,"Content-Range":"bytes */"+size}});const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2])),end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;if(start>=size||end<start)return new Response(null,{status:416,headers:{...headers,"Content-Range":"bytes */"+size}});return new Response(blob.slice(start,end+1),{status:206,headers:{...headers,"Content-Length":String(end-start+1),"Content-Range":"bytes "+start+"-"+end+"/"+size}})}
self.addEventListener("fetch",event=>{const url=new URL(event.request.url),match=new RegExp("^/api/library/([^/]+)/audio$").exec(url.pathname);if(event.request.method!=="GET"||url.origin!==self.location.origin||!match||url.searchParams.has("carimboOriginal"))return;event.respondWith(readCarimbo(decodeURIComponent(match[1])).then(saved=>saved?.blob?carimboResponse(saved.blob,event.request.headers.get("Range")):fetch(event.request)).catch(()=>fetch(event.request)))});
