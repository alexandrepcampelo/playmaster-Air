(()=>{"use strict";
document.addEventListener("DOMContentLoaded",()=>{
 const pane=document.getElementById("airMenuCatalogPane");
 const filesPanel=document.querySelector("#airMenuCatalogPane .air-catalog-files");
 const folderHeader=document.querySelector("#airMenuCatalogPane .air-catalog-folder-name");
 if(!pane||!filesPanel||!folderHeader)return;
 const localByCategory=new Map();
 const input=document.createElement("input");
 input.type="file";input.accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.opus,.aiff";input.multiple=true;input.hidden=true;
 document.body.append(input);
 let pendingCategory=null;
 const status=()=>pane.querySelector(".air-catalog-status");
 const currentCategory=()=>folderHeader.querySelector("strong")?.textContent?.trim()||"";
 const cleanName=name=>String(name||"Áudio").replace(/\.[^.]+$/,"");
 const addButton=document.createElement("button");
 addButton.type="button";addButton.className="air-menu-catalog-add";addButton.textContent="＋ ADICIONAR ÁUDIOS";
 addButton.addEventListener("click",()=>{
  const category=currentCategory();
  if(!category){const label=status();if(label)label.textContent="Primeiro selecione uma categoria do Catálogo.";return}
  pendingCategory=category;input.value="";input.click();
 });
 const intro=pane.querySelector(".air-menu-catalog-intro");
 if(intro)intro.after(addButton);else pane.prepend(addButton);
 function formatDuration(value){const n=Math.max(0,Math.floor(value||0));return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")}
 function makeRow(item){
  const row=document.createElement("article");row.className="air-catalog-row air-local-catalog-row";row.dataset.trackId=item.id;
  const progress=document.createElement("span");progress.className="air-catalog-progress";
  const icon=document.createElement("span");icon.className="air-catalog-file-icon";icon.textContent="♫";icon.style.color="#159cf2";
  const info=document.createElement("div");info.className="air-catalog-file-info";
  const title=document.createElement("strong");title.textContent=item.title;
  const meta=document.createElement("small");meta.textContent=(item.fileName.split(".").pop()||"AUDIO").toUpperCase()+"　"+(item.duration?formatDuration(item.duration):"Áudio local");
  info.append(title,meta);
  const actions=document.createElement("span");actions.className="air-catalog-row-actions";
  const add=document.createElement("button");add.type="button";add.className="air-catalog-cue";add.textContent="PLAYLIST";add.title="Adicionar à Playlist";
  add.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();window.dispatchEvent(new CustomEvent("playmaster:local-catalog-add",{detail:{item}}));add.textContent="OK";setTimeout(()=>{add.textContent="PLAYLIST"},900)});
  actions.append(add);row.append(progress,icon,info,actions);return row;
 }
 function renderLocalRows(){
  const category=currentCategory();if(!category)return;
  const items=localByCategory.get(category)||[];
  const existing=[...filesPanel.querySelectorAll(".air-local-catalog-row")].map(row=>row.dataset.trackId);
  if(existing.length===items.length&&items.every((item,index)=>existing[index]===item.id))return;
  filesPanel.querySelectorAll(".air-local-catalog-row").forEach(row=>row.remove());
  for(const item of items)filesPanel.append(makeRow(item));
  const label=status();if(label&&items.length)label.textContent=category+" · "+items.length+" áudio(s) local(is) disponíveis para teste";
 }
 const observer=new MutationObserver(()=>renderLocalRows());
 observer.observe(filesPanel,{childList:true});
 const headerObserver=new MutationObserver(()=>renderLocalRows());
 headerObserver.observe(folderHeader,{childList:true,subtree:true,characterData:true});
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
  const label=status();if(label)label.textContent=selected.length+" áudio(s) adicionado(s) a "+category+". Toque em PLAYLIST para inserir na fila.";
  renderLocalRows();
 });
 const style=document.createElement("style");
 style.textContent=`
 #airMenuCatalogPane .air-menu-catalog-add{flex:none;align-self:flex-start;min-height:34px;padding:0 12px;border:1px solid #147ba8;border-radius:4px;background:#0b5279;color:#fff;font-size:10px;font-weight:700;letter-spacing:.03em;cursor:pointer}
 #airMenuCatalogPane .air-menu-catalog-add:active{background:#087b40}
 #airMenuCatalogPane .air-local-catalog-row{grid-template-columns:20px minmax(0,1fr) 58px!important}
 #airMenuCatalogPane .air-local-catalog-row .air-catalog-row-actions{display:flex;justify-content:flex-end}
 #airMenuCatalogPane .air-local-catalog-row .air-catalog-cue{width:48px!important;min-width:48px!important;height:19px!important;min-height:19px!important;background:#159b69!important;color:#fff!important}
 #airMenuCatalogPane .air-local-catalog-row .air-catalog-file-info strong{color:#eaf2f8}
 `;
 document.head.append(style);
});
})();