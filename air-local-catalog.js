(()=>{"use strict";
const start=()=>{
 const pane=document.getElementById("airMenuCatalogPane");
 const menuFiles=pane?.querySelector(".air-menu-catalog-files");
 const menuHeader=pane?.querySelector(".air-catalog-folder-header");
 const addButton=pane?.querySelector(".air-menu-catalog-add");
 const menuStatus=pane?.querySelector(".air-catalog-status");
 const mainSection=document.getElementById("airCatalogSection");
 const mainFiles=mainSection?.querySelector(".air-catalog-files");
 const mainHeader=mainSection?.querySelector(".air-catalog-folder-header");
 if(!pane||!menuFiles||!menuHeader||!addButton||!menuStatus||!mainFiles||!mainHeader)return;
 const localByCategory=new Map();
 const input=document.createElement("input");
 input.type="file";input.accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.opus,.aiff";input.multiple=true;input.hidden=true;document.body.append(input);
 let pendingCategory=null;
 const menuCategory=()=>menuHeader.querySelector("strong")?.textContent?.trim()||"";
 const mainCategory=()=>mainHeader.querySelector(".air-catalog-folder-name strong")?.textContent?.trim()||"";
 const cleanName=name=>String(name||"Áudio").replace(/\.[^.]+$/,"");
 const formatDuration=value=>{const n=Math.max(0,Math.floor(value||0));return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")};
 function makeRow(item,location){
  const row=document.createElement("article");row.className="air-catalog-row air-local-catalog-row";row.dataset.trackId=item.id;
  const icon=document.createElement("span");icon.className="air-catalog-file-icon";icon.setAttribute("aria-hidden","true");icon.textContent="♫";icon.style.color="#159cf2";
  const info=document.createElement("div");info.className="air-catalog-file-info";
  const title=document.createElement("strong");title.textContent=item.title;
  const meta=document.createElement("small");meta.textContent=(item.fileName.split(".").pop()||"AUDIO").toUpperCase()+"　"+formatDuration(item.duration);
  info.append(title,meta);
  const actions=document.createElement("span");actions.className="air-catalog-row-actions";
  const add=document.createElement("button");add.type="button";add.className="air-catalog-cue";add.textContent="PLAYLIST";add.title="Adicionar à Playlist";
  add.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();window.dispatchEvent(new CustomEvent("playmaster:local-catalog-add",{detail:{item}}));add.textContent="OK";setTimeout(()=>{add.textContent="PLAYLIST"},900)});
  actions.append(add);row.append(icon,info,actions);
  if(location==="main")row.style.gridTemplateColumns="22px minmax(0,1fr) 58px";
  else row.style.gridTemplateColumns="22px minmax(0,1fr) 58px";
  return row;
 }
 function renderMenuRows(){
  const category=menuCategory();if(!category)return;
  const items=localByCategory.get(category)||[];
  menuFiles.replaceChildren(...items.map(item=>makeRow(item,"menu")));
 }
 function renderMainRows(){
  const category=mainCategory();if(!category)return;
  const items=localByCategory.get(category)||[];
  const existing=new Set([...mainFiles.querySelectorAll(".air-local-catalog-row")].map(row=>row.dataset.trackId));
  mainFiles.querySelectorAll(".air-local-catalog-row").forEach(row=>{if(!items.some(item=>item.id===row.dataset.trackId))row.remove()});
  for(const item of items)if(!existing.has(item.id))mainFiles.append(makeRow(item,"main"));
 }
 addButton.addEventListener("click",()=>{
  const category=menuCategory();if(!category){menuStatus.textContent="Primeiro selecione uma pasta.";return}
  pendingCategory=category;input.value="";input.click();
 });
 input.addEventListener("change",async()=>{
  const category=pendingCategory;if(!category)return;
  const selected=[...input.files||[]].filter(file=>file.type.startsWith("audio/")||/\.(mp3|wav|ogg|flac|aac|m4a|opus|aiff?)$/i.test(file.name));
  if(!selected.length)return;
  const items=localByCategory.get(category)||[];
  for(const file of selected){
   const url=URL.createObjectURL(file);const probe=new Audio();probe.preload="metadata";probe.src=url;
   const duration=await new Promise(resolve=>{const done=()=>resolve(Number.isFinite(probe.duration)?probe.duration:0);probe.addEventListener("loadedmetadata",done,{once:true});probe.addEventListener("error",()=>resolve(0),{once:true});setTimeout(()=>resolve(0),2500)});
   items.push({id:"local-"+(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2)),title:cleanName(file.name),name:cleanName(file.name),fileName:file.name,category,duration,__airLocalUrl:url,__airLocal:true});
  }
  localByCategory.set(category,items);
  menuStatus.textContent=selected.length+" áudio(s) adicionado(s) à pasta "+category+".";
  renderMenuRows();renderMainRows();
 });
 const observer=new MutationObserver(()=>renderMainRows());
 observer.observe(mainFiles,{childList:true});
 const headerObserver=new MutationObserver(()=>renderMainRows());
 headerObserver.observe(mainHeader,{childList:true,subtree:true,characterData:true});
 pane.querySelector(".air-menu-catalog-categories")?.addEventListener("click",()=>{renderMenuRows()});
 const style=document.createElement("style");
 style.textContent=`
 #airCatalogSection .air-local-catalog-row{grid-template-columns:22px minmax(0,1fr) 58px!important}
 #airCatalogSection .air-local-catalog-row .air-catalog-file-icon{display:flex;align-items:center;justify-content:center;font-size:19px}
 #airCatalogSection .air-local-catalog-row .air-catalog-row-actions{display:flex;justify-content:flex-end}
 #airCatalogSection .air-local-catalog-row .air-catalog-cue,#airMenuCatalogPane .air-local-catalog-row .air-catalog-cue{width:54px!important;min-width:54px!important;height:22px!important;min-height:22px!important;padding:0 3px!important;background:#159b69!important;color:#fff!important;font-size:8px!important;font-weight:700}
 #airCatalogSection .air-local-catalog-row .air-catalog-file-info strong,#airMenuCatalogPane .air-local-catalog-row .air-catalog-file-info strong{color:#eaf2f8}
 #airMenuCatalogPane .air-local-catalog-row{grid-template-columns:22px minmax(0,1fr) 58px!important}
 #airMenuCatalogPane .air-menu-catalog-files .air-local-catalog-row{display:grid!important;grid-template-columns:22px minmax(0,1fr) 58px!important;align-items:center!important;gap:6px!important;box-sizing:border-box!important;height:42px!important;min-height:42px!important;max-height:42px!important;padding:4px 6px!important;overflow:hidden!important}
 #airMenuCatalogPane .air-menu-catalog-files .air-local-catalog-row .air-catalog-file-icon{display:flex!important;align-items:center!important;justify-content:center!important}
 #airMenuCatalogPane .air-menu-catalog-files .air-local-catalog-row .air-catalog-file-info{display:flex!important;min-width:0!important;flex-direction:column!important;justify-content:center!important;gap:2px!important;overflow:hidden!important}
 #airMenuCatalogPane .air-menu-catalog-files .air-local-catalog-row .air-catalog-file-info strong{display:block!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;font-size:10px!important;line-height:13px!important;max-width:100%!important}
 #airMenuCatalogPane .air-menu-catalog-files .air-local-catalog-row .air-catalog-file-info small{display:block!important;font-size:8px!important;line-height:10px!important;margin:0!important}
 #airMenuCatalogPane .air-menu-catalog-files .air-local-catalog-row .air-catalog-row-actions{align-self:center!important;display:flex!important;justify-content:flex-end!important} `;
 document.head.append(style);
};
if(document.readyState==="complete")start();else document.addEventListener("DOMContentLoaded",start,{once:true});
})();