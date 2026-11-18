(()=>{"use strict";
const folders=[...document.querySelectorAll(".air-panel-categories .folder[data-catalog-category]")];
const filesPanel=document.querySelector(".air-catalog-files");
if(!folders.length||!filesPanel)return;
const localByCategory=new Map();
const input=document.createElement("input");
input.type="file";input.accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.opus,.aiff";input.multiple=true;input.hidden=true;
document.body.append(input);
let selectedCategory=null;
let pendingCategory=null;
const status=()=>document.querySelector(".air-catalog-status");
const currentCategory=()=>document.querySelector(".air-catalog-folder-name strong")?.textContent?.trim()||selectedCategory;
const cleanName=name=>String(name||"Áudio").replace(/\.[^.]+$/,"");
function makeRow(item){
 const row=document.createElement("article");row.className="air-catalog-row air-local-catalog-row";row.dataset.trackId=item.id;
 const progress=document.createElement("span");progress.className="air-catalog-progress";
 const icon=document.createElement("span");icon.className="air-catalog-file-icon";icon.textContent="♫";icon.style.color="#159cf2";
 const info=document.createElement("div");info.className="air-catalog-file-info";
 const title=document.createElement("strong");title.textContent=item.title;
 const meta=document.createElement("small");meta.textContent=(item.fileName.split(".").pop()||"AUDIO").toUpperCase()+"　"+(item.duration?formatDuration(item.duration):"Áudio local");
 info.append(title,meta);
 const actions=document.createElement("span");actions.className="air-catalog-row-actions";
 const add=document.createElement("button");add.type="button";add.className="air-catalog-cue";add.textContent="PLAYLIST";add.title="Adicionar à Playlist";add.style.cssText="width:54px!important;background:#159b69!important;color:#fff!important";
 add.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();window.dispatchEvent(new CustomEvent("playmaster:local-catalog-add",{detail:{item}}));add.textContent="OK";setTimeout(()=>{add.textContent="PLAYLIST"},900)});
 actions.append(add);row.append(progress,icon,info,actions);return row;
}
function formatDuration(value){const n=Math.max(0,Math.floor(value||0));return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")}
function renderLocalRows(){
 const category=currentCategory();
 if(!category)return;
 filesPanel.querySelectorAll(".air-local-catalog-row").forEach(row=>row.remove());
 const items=localByCategory.get(category)||[];
 for(const item of items)filesPanel.append(makeRow(item));
 const label=status();if(label&&items.length)label.textContent=category+" · "+items.length+" áudio(s) local(is) disponíveis para teste";
}
const observer=new MutationObserver(()=>renderLocalRows());
observer.observe(filesPanel,{childList:true});
const headerObserver=new MutationObserver(()=>renderLocalRows());
const folderHeader=document.querySelector(".air-catalog-folder-name");
if(folderHeader)headerObserver.observe(folderHeader,{childList:true,subtree:true,characterData:true});
folders.forEach(folder=>{
 const category=folder.dataset.catalogCategory;
 const button=document.createElement("button");button.type="button";button.className="air-local-folder-button";button.title="Adicionar áudios de "+category;button.setAttribute("aria-label","Adicionar áudios à categoria "+category);
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h7l2 2H21v9.8a1.7 1.7 0 0 1-1.7 1.7H4.7A1.7 1.7 0 0 1 3 18.3z"/><path d="M3 8.5h18M12 11v5m-2.5-2.5h5"/></svg>';
 button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();pendingCategory=category;input.value="";input.click()});
 folder.append(button);
});
input.addEventListener("change",async()=>{
 const category=pendingCategory;if(!category)return;
 const selected=[...input.files||[]].filter(file=>file.type.startsWith("audio/")||/\.(mp3|wav|ogg|flac|aac|m4a|opus|aiff?)$/i.test(file.name));
 if(!selected.length)return;
 const items=localByCategory.get(category)||[];
 for(const file of selected){
  const url=URL.createObjectURL(file);
  const probe=new Audio();probe.preload="metadata";probe.src=url;
  const duration=await new Promise(resolve=>{const done=()=>resolve(Number.isFinite(probe.duration)?probe.duration:0);probe.addEventListener("loadedmetadata",done,{once:true});probe.addEventListener("error",()=>resolve(0),{once:true});setTimeout(()=>resolve(0),2500)});
  items.push({id:"local-"+(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2)),title:cleanName(file.name),fileName:file.name,category,duration,__airLocalUrl:url,__airLocal:true});
 }
 localByCategory.set(category,items);
 const label=status();if(label)label.textContent=selected.length+" áudio(s) adicionado(s) a "+category+". Selecione PLAYLIST para inserir na fila.";
 renderLocalRows();
});
const style=document.createElement("style");
style.textContent='.air-panel-categories>.folder{position:relative;padding-right:38px!important}.air-local-folder-button{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:29px;height:29px;display:grid;place-items:center;padding:3px;border:1px solid #17658b;border-radius:4px;background:#0b2a40;color:#24bff0;cursor:pointer}.air-local-folder-button svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.air-local-folder-button:active{background:#075078}.air-local-catalog-row .air-catalog-file-info strong{color:#eaf2f8}';
document.head.append(style);
})();
