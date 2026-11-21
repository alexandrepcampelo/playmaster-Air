(()=> {
"use strict";
const DB_NAME="playmaster-air-local-library-v1", STORE="audio";
let dbPromise;
function db(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{const d=request.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id"})};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
 return dbPromise;
}
async function allByCategory(category){
 const d=await db();
 return new Promise((resolve,reject)=>{
  const request=d.transaction(STORE,"readonly").objectStore(STORE).getAll();
  request.onsuccess=()=>resolve((request.result||[]).filter(x=>x.category===category).map(({blob,...item})=>item));
  request.onerror=()=>reject(request.error);
 });
}
async function saveAudio(item){
 const d=await db();
 return new Promise((resolve,reject)=>{
  const tx=d.transaction(STORE,"readwrite");
  tx.objectStore(STORE).put(item);
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error);
 });
}
async function localAudio(id){
 const d=await db();
 return new Promise((resolve,reject)=>{
  const request=d.transaction(STORE,"readonly").objectStore(STORE).get(id);
  request.onsuccess=()=>resolve(request.result||null);
  request.onerror=()=>reject(request.error);
 });
}
window.playmasterAirLocalAudio=localAudio;
const originalFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
 const requestUrl=typeof input==="string"||input instanceof URL?new URL(String(input),location.href):new URL(input.url);
 const method=(init?.method||input?.method||"GET").toUpperCase();
 if(requestUrl.origin===location.origin&&method==="GET"){
  if(requestUrl.pathname==="/api/me")return new Response(JSON.stringify({ok:true,user:{id:"local",name:"Catálogo local"}}),{status:200,headers:{"Content-Type":"application/json"}});
  if(requestUrl.pathname==="/api/library"&&requestUrl.searchParams.has("category")){
   const category=requestUrl.searchParams.get("category")||"Músicas";
   try{return new Response(JSON.stringify({items:await allByCategory(category)}),{status:200,headers:{"Content-Type":"application/json"}})}
   catch(error){return new Response(JSON.stringify({error:error.message}),{status:500,headers:{"Content-Type":"application/json"}})}
  }
 }
 return originalFetch(input,init);
};
function currentCategory(){
 const title=document.querySelector(".air-catalog-folder-name strong")?.textContent?.trim();
 return title||"Músicas";
}
function refreshCatalog(){
 const category=currentCategory();
 const button=document.querySelector(".air-catalog-categories button[data-category='"+CSS.escape(category)+"']");
 if(button)button.click();
}
function installControls(){
 const header=document.querySelector(".air-catalog-folder-header");
 if(header&&!header.querySelector(".air-local-add")){
  const add=document.createElement("button");
  add.type="button";add.className="air-local-add";add.textContent="+ Áudio";
  add.style.cssText="margin-left:8px;flex:none;padding:4px 9px;border:1px solid #159bc8;border-radius:4px;background:#075078;color:#fff;font-size:10px;font-weight:700";
  const input=document.createElement("input");
  input.type="file";input.accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac";input.multiple=true;input.hidden=true;
  add.addEventListener("click",()=>input.click());
  input.addEventListener("change",async()=>{
   const files=Array.from(input.files||[]);if(!files.length)return;
   const category=currentCategory();add.disabled=true;
   const status=document.querySelector(".air-catalog-status");
   if(status)status.textContent="Salvando "+files.length+" arquivo(s) neste iPad…";
   try{
    for(const file of files){
     const base=file.name.replace(/\.[^.]+$/,"").trim()||"Áudio";
     const id="local_"+(crypto.randomUUID?crypto.randomUUID():Date.now()+"_"+Math.random().toString(36).slice(2));
     let duration=0;
     try{const url=URL.createObjectURL(file);duration=await new Promise(resolve=>{const audio=document.createElement("audio");audio.preload="metadata";audio.onloadedmetadata=()=>{const value=Number(audio.duration);URL.revokeObjectURL(url);resolve(Number.isFinite(value)?value:0)};audio.onerror=()=>{URL.revokeObjectURL(url);resolve(0)};audio.src=url})}catch{}
     await saveAudio({id,title:base,fileName:file.name,artist:"",category,duration,contentType:file.type||"audio/mpeg",size:file.size,createdAt:Date.now(),blob:file});
    }
    if(status)status.textContent=files.length+" arquivo(s) salvo(s) no catálogo local.";
    refreshCatalog();
   }catch(error){if(status)status.textContent="Não foi possível salvar: "+error.message}
   finally{add.disabled=false;input.value=""}
  });
  header.append(add,input);
 }
 const login=document.querySelector(".air-catalog-login");if(login)login.hidden=true;
 const autoLink=document.querySelector(".air-open-auto-import");
 if(autoLink){
  const localButton=document.createElement("button");localButton.type="button";localButton.className="air-open-auto-import";localButton.textContent="Adicionar música ao catálogo";
  localButton.addEventListener("click",()=>{document.querySelector('.air-panel-categories .folder[data-catalog-category="Músicas"]')?.click()});
  autoLink.replaceWith(localButton);
 }
 document.querySelector(".air-voice-menu-catalog")?.remove();
}
const observer=new MutationObserver(installControls);
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installControls,{once:true});else installControls();
})();