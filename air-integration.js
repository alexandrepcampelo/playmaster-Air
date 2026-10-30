(()=> {
"use strict";
const CATEGORIES=["Músicas","Comerciais","Vinhetas","Intercons","Trilhas","Chamadas","Locução","Hora Certa","Temperatura","Outros"];
const key="playmaster-air-queues-v1";
const queue={Playlist:[]};
let activeQueue="Playlist",currentIndex=-1,sessionOk=false,catalogCategory="Músicas",catalogItems=[],demoMode=false;const playedTrackIds=new Set();const skippedTrackIds=new Set();
let selectedAction=null,selectedQueueIndex=-1,transportLoopItem=null,playbackPaused=false,loopSelectionMode=false,pauseSelectionMode=false,pauseResumePending=false;
const audio=new Audio();audio.preload="auto";audio.playsInline=true;audio.setAttribute("playsinline","");audio.setAttribute("webkit-playsinline","");audio.controls=true;audio.setAttribute("controls","");audio.setAttribute("aria-hidden","true");audio.tabIndex=-1;audio.style.cssText="display:block;position:fixed;width:1px;height:1px;left:0;bottom:0;opacity:0;pointer-events:none;z-index:0";document.body.append(audio);let playbackAttemptId=0,playbackWatchdog=null;
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const titleOf=x=>x?.title||x?.fileName||x?.name||"Áudio";
const durationOf=x=>Math.max(0,Number(x?.duration)||0);
const fmt=n=>{n=Math.floor(Math.max(0,Number(n)||0));return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")};
const persist=()=>localStorage.setItem(key,JSON.stringify(queue));
try{const saved=JSON.parse(localStorage.getItem(key)||"{}");queue.Playlist=Array.isArray(saved.Playlist)?saved.Playlist:[...(saved["Músicas"]||[]),...(saved.Comerciais||[])];demoMode=false}catch{demoMode=true}
async function json(path,options={}){const r=await fetch(path,{...options,credentials:"same-origin",cache:"no-store"});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||("Falha HTTP "+r.status));return d}
const overlay=document.createElement("div");overlay.className="air-catalog-overlay";overlay.hidden=true;
overlay.innerHTML='<section class="air-catalog-dialog" role="dialog" aria-modal="true" aria-label="Catálogo de áudio"><header><strong>CATÁLOGO DE ÁUDIO</strong><button type="button" data-close aria-label="Fechar">×</button></header><form class="air-catalog-login" hidden><span>Entre no Auto Import para acessar os áudios.</span><input name="username" autocomplete="username" placeholder="Usuário"><input name="password" type="password" autocomplete="current-password" placeholder="Senha"><button type="submit">Entrar</button><small></small></form><nav class="air-catalog-categories"></nav><input class="air-catalog-search" type="search" placeholder="Buscar arquivo…"><div class="air-catalog-status" aria-live="polite"></div><div class="air-catalog-files"></div></section>';
document.body.append(overlay);
const catNav=$(".air-catalog-categories",overlay),files=$(".air-catalog-files",overlay),search=$(".air-catalog-search",overlay),status=$(".air-catalog-status",overlay),login=$(".air-catalog-login",overlay);
for(const c of CATEGORIES){const b=document.createElement("button");b.type="button";b.textContent=c;b.dataset.category=c;catNav.append(b)}
const close=()=>{overlay.hidden=true};
overlay.addEventListener("click",e=>{if(e.target===overlay||e.target.closest("[data-close]"))close()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!overlay.hidden)close()});
async function checkSession(){try{await json("/api/me");sessionOk=true;login.hidden=true;return true}catch{sessionOk=false;login.hidden=false;return false}}
login.addEventListener("submit",async e=>{e.preventDefault();const b=$('button[type="submit"]',login),msg=$("small",login);b.disabled=true;msg.textContent="";try{const d=new FormData(login);await json("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:d.get("username"),password:d.get("password")})});sessionOk=true;login.hidden=true;await loadCategory(catalogCategory)}catch(err){msg.textContent=err.message}finally{b.disabled=false}});
function renderCatalog(){files.replaceChildren();const q=search.value.trim().toLocaleLowerCase("pt-BR");const list=catalogItems.filter(x=>[titleOf(x),x.artist].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(q)));if(!list.length){const p=document.createElement("p");p.className="air-catalog-empty";p.textContent=sessionOk?"Nenhum áudio nesta categoria.":"Faça login para carregar o catálogo.";files.append(p);return}for(const item of list){const row=document.createElement("article");row.className="air-catalog-row";const info=document.createElement("div");info.innerHTML='<strong>'+esc(titleOf(item))+'</strong><small>'+esc(item.artist||item.category||"")+' · '+fmt(durationOf(item))+'</small>';const add=document.createElement("button");add.type="button";add.textContent="Adicionar à Playlist";add.addEventListener("click",()=>addToQueue(item));row.append(info,add);files.append(row)}}
async function loadCategory(c){catalogCategory=c;catNav.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.category===c));search.value="";status.textContent="Carregando "+c+"…";try{if(!sessionOk&&!await checkSession()){catalogItems=[];status.textContent="Sessão do Auto Import necessária.";renderCatalog();return}const d=await json("/api/library?category="+encodeURIComponent(c)+"&limit=500&offset=0");catalogItems=(d.items||[]).map(x=>({...x,category:x.category||c}));status.textContent=catalogItems.length+" arquivo(s)";renderCatalog()}catch(e){catalogItems=[];status.textContent=e.message;renderCatalog()}}
catNav.addEventListener("click",e=>{const b=e.target.closest("button[data-category]");if(b)loadCategory(b.dataset.category)});
search.addEventListener("input",renderCatalog);
function updateNow(item){const track=$(".track");if(!track)return;const name=$("strong",track),meta=$("small",track),times=$$(".progress span",track);if(name)name.textContent=titleOf(item);if(meta)meta.textContent=(item.artist||"")+" • "+(item.category||"Áudio")+" • Playlist única";if(times.length>1)times[1].textContent=fmt(item.duration);updateProgress()}
function $$(s,r=document){return [...r.querySelectorAll(s)]}
function updateAirTimers(){const introCard=$("#introTimerCard"),introLabel=$("#introTimerLabel"),introValue=$("#introTimerValue"),progressiveValue=$("#progressiveTimerValue");if(!introCard||!introLabel||!introValue||!progressiveValue)return;const hasTrack=currentIndex>=0&&Boolean(queue[activeQueue][currentIndex]);const elapsed=hasTrack?(audio.currentTime||0):0;const duration=hasTrack?(Number.isFinite(audio.duration)?audio.duration:durationOf(queue[activeQueue][currentIndex])):0;const inIntro=hasTrack&&elapsed<5;const isPaused=playbackPaused&&hasTrack&&audio.paused;const shown=inIntro?Math.max(0,5-elapsed):Math.max(0,duration-elapsed);introCard.classList.toggle("is-paused",isPaused);introLabel.textContent=isPaused?"":inIntro||!hasTrack?"INTRO":"TEMPO REGRESSIVO";introCard.classList.toggle("is-regressive",hasTrack&&!isPaused&&!inIntro);introValue.textContent=isPaused?"PAUSE":fmtTenths(shown);progressiveValue.textContent=fmtTenths(elapsed)}
function fmtTenths(seconds){seconds=Math.max(0,Number(seconds)||0);const whole=Math.floor(seconds),minutes=Math.min(99,Math.floor(whole/60)),secs=whole%60,tenth=Math.floor((seconds-whole)*10);return String(minutes).padStart(2,"0")+":"+String(secs).padStart(2,"0")+","+tenth}
function attachProgressSeeking(){const bar=$(".track .bar");if(!bar||bar.dataset.seekReady)return;bar.dataset.seekReady="1";bar.setAttribute("role","slider");bar.setAttribute("tabindex","0");bar.setAttribute("aria-label","Posição do áudio");bar.addEventListener("click",event=>{if(!Number.isFinite(audio.duration)||audio.duration<=0)return;const rect=bar.getBoundingClientRect();if(!rect.width)return;const ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));audio.currentTime=ratio*audio.duration;updateProgress()});bar.addEventListener("keydown",event=>{if(!Number.isFinite(audio.duration)||audio.duration<=0)return;const step=event.shiftKey?10:5;if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+(event.key==="ArrowRight"?step:-step)));updateProgress()}})}
function updateProgress(){attachProgressSeeking();const track=$(".track");if(track){const playing=!audio.paused&&currentIndex>=0;const displayIndex=playing?currentIndex:(selectedQueueIndex>=0?selectedQueueIndex:currentIndex);const item=displayIndex>=0?queue[activeQueue][displayIndex]:null;const total=playing&&Number.isFinite(audio.duration)?audio.duration:durationOf(item);const current=playing?(audio.currentTime||0):0;const p=total?Math.min(100,current/total*100):0;const bar=$(".bar",track);if(bar){bar.style.background="linear-gradient(90deg,#fa7c13 0 "+p+"%,#14283a "+p+"%)";bar.style.setProperty("--play-progress",p+"%")}const times=$(".progress span",track);if(times.length>1){times[0].textContent=fmt(current);times[1].textContent=fmt(total)}}updateAirTimers()}
let fadeInterval=null;let fadeTimeout=null;let loopButton=null;function cancelFade(){if(fadeInterval!==null){clearInterval(fadeInterval);fadeInterval=null}if(fadeTimeout!==null){clearTimeout(fadeTimeout);fadeTimeout=null}const graph=vuGraphs?.get?.(audio);if(graph?.gain){const now=graph.gain.context.currentTime;graph.gain.gain.cancelScheduledValues(now);graph.gain.gain.setValueAtTime(1,now)}audio.volume=1}function playIndex(i,autoplay=true,diagnostic=false){playbackPaused=false;pauseResumePending=false;cancelPlaybackWatchdog();cancelFade();prepareVuMeter();const list=queue[activeQueue];if(!list.length)return;const nextIndex=(i+list.length)%list.length;const item=list[nextIndex];if(transportLoopItem&&transportLoopItem!==item){transportLoopItem=null;audio.loop=false;if(loopButton){loopButton.classList.remove("is-active");loopButton.setAttribute("aria-pressed","false")}}currentIndex=nextIndex;selectedQueueIndex=currentIndex;audio.loop=Boolean(item.__airLoop);transportLoopItem=audio.loop?item:null;audio.pause();audio.volume=1;audio.src="/api/library/"+encodeURIComponent(item.id)+"/audio";audio.load();updateNow(item);renderQueue();if(autoplay){const request=audio.play();monitorPlaybackStart(item,diagnostic);if(request&&typeof request.catch==="function")request.catch(error=>{void showPlaybackError(error,item);refreshOnAir();renderQueue()})}else audio.pause()}
function categoryIcon(item){const category=String(item?.category||"Músicas").toLocaleLowerCase("pt-BR");if(category.includes("comercial"))return{cls:"cat-commercial",text:"$"};if(category.includes("vinheta"))return{cls:"cat-vinheta",svg:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4h4l7 5V5l-7 5H3Z"/><path d="M14 9c2 .6 3 1.6 3 3s-1 2.4-3 3"/><path d="m6 14 1.5 5h3"/></svg>'};if(category.includes("hora certa"))return{cls:"cat-clock",svg:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'};return{cls:"cat-music",text:"♫"}}
function plannedAt(list,index,item){const fixed=item?.plannedTime||item?.scheduledTime||item?.airTime;if(fixed){const parsed=new Date(fixed);return Number.isNaN(parsed.getTime())?String(fixed):parsed.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}const seconds=list.slice(0,index).reduce((sum,x)=>sum+durationOf(x),0)-(currentIndex>=0?(audio.currentTime||0):0);return new Date(Date.now()+Math.max(0,seconds)*1000).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}
function introTimeOf(item){const value=item?.introTime??item?.introSeconds??item?.intro??0;if(typeof value==="string"&&/^\d{1,2}:\d{2}$/.test(value.trim()))return value.trim();return fmt(value)}
function genreInfo(item){const raw=[item?.genre,item?.musicalStyle,item?.style,item?.metadata?.genre,item?.tags?.genre].find(value=>typeof value==="string"&&value.trim())||item?.category||"Música";const label=String(raw).trim();const normalized=label.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");const kinds=[["classico","classico"],["sucesso","success"],["pop","pop"],["rock","rock"],["jazz","jazz"],["reggae","reggae"],["sertanejo","sertanejo"],["mpb","mpb"],["eletronica","eletronica"],["comercial","commercial"],["vinheta","vinheta"],["hora certa","clock"],["temperatura","temperatura"]];const key=kinds.find(([name])=>normalized.includes(name))?.[1]||"musica";return{label:label.toLocaleUpperCase("pt-BR"),key}}
function queueStateMarkup(index){const item=queue[activeQueue][index],id=String(item?.id??titleOf(item||{}));if(index===currentIndex&&!audio.paused)return '<span class="queue-state is-playing" aria-label="Em execução"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5a.8.8 0 0 1 1.2-.68l6.2 4.2a1.1 1.1 0 0 1 0 1.96l-6.2 4.2A.8.8 0 0 1 3 10.5z"/></svg></span>';if(playedTrackIds.has(id))return '<span class="queue-state is-played" aria-label="Executada"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2 6.2 2.5 2.5L10 3.4"/></svg></span>';if(skippedTrackIds.has(id))return '<span class="queue-state is-skipped" aria-label="Iniciada, mas avançada antes do fim"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="25 10" stroke-linecap="round" transform="rotate(-45 8 8)"/></svg></span>';return '<span class="queue-state" aria-hidden="true"></span>'}
function queueActionMarkup(item,preview=false){const isLoopSelected=Boolean(item?.__airLoop),isPauseSelected=Boolean(item?.__airPauseAfter),rowAction=item?.__airQueueAction==="Loop"?null:item?.__airQueueAction;if(loopSelectionMode||isLoopSelected){return '<span class="queue-action action-loop'+(isLoopSelected?' loop-picked':'')+'" aria-label="Loop"'+(isLoopSelected?' title="Loop ativado para esta faixa"':' title="Marcar loop nesta faixa"')+'>↻</span>'}if(pauseSelectionMode||isPauseSelected){return '<span class="queue-action action-pause'+(isPauseSelected?' loop-picked':'')+'" aria-label="Pause"'+(isPauseSelected?' title="Pausar depois desta faixa"':' title="Marcar pausa depois desta faixa"')+'><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg></span>'}const selected=item===transportLoopItem?"Loop":rowAction||(preview?selectedAction:null);if(!selected)return '<span class="queue-action" aria-hidden="true"></span>';const icons={Pause:['action-pause','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>'],Loop:['action-loop','↻'],Delete:['action-delete','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v7m4-7v7M5 7l1 14h12l1-14M9 7V4h6v3"/></svg>'],Clock:['action-clock','<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'],Temperature:['action-temperature','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 14.8V5a3 3 0 0 0-6 0v9.8a5 5 0 1 0 6 0Z"/><path d="M11 11v7"/></svg>'],Cue:['action-cue','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13v-2a3 3 0 0 1 3-3h2v10H6a3 3 0 0 1-3-3zM21 13v-2a3 3 0 0 0-3-3h-2v10h2a3 3 0 0 0 3-3zM8 8a4 4 0 0 1 8 0"/></svg>'],Move:['action-move','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7 4-4 4 4M12 3v18m-4-4 4 4 4-4"/></svg>']};const actionKey=({Excluir:"Delete","Hora Certa":"Clock",Temperatura:"Temperature","Mover faixa":"Move"})[selected]||selected;const [cls,icon]=icons[actionKey]||icons.Pause;return '<span class="queue-action '+cls+(preview&&!item?.__airQueueAction?' queue-action-preview':'')+'" aria-label="'+esc(selected)+'" title="'+esc(selected)+'">'+icon+'</span>'}
function syncStaticQueueActions(){document.querySelectorAll(".playlist-row").forEach(row=>{const placeholder=$(".queue-action",row);if(!placeholder)return;if(placeholder.classList.contains("loop-picked"))return;const selected=selectedAction||row.dataset.airQueueAction;const template=document.createElement("template");template.innerHTML=queueActionMarkup({__airQueueAction:selected},!!selectedAction).trim();placeholder.replaceWith(template.content.firstElementChild)})}
function selectQueueRow(index){if(index<0||index>=queue.Playlist.length)return;selectedQueueIndex=index;if(audio.paused)updateNow(queue.Playlist[index]);renderQueue()}
function renderQueue(){const list=$(".playlist-list");if(!list)return;const tracks=queue.Playlist;const headings=$(".playlist>.playhead span");if(headings[0])headings[0].textContent="PLAYLIST ÚNICA";if(headings[1])headings[1].textContent=demoMode&&!tracks.length?"EXEMPLO • 14 FAIXAS":tracks.length+" / 14 FAIXAS";if(!tracks.length){if(demoMode)return;list.replaceChildren();const empty=document.createElement("div");empty.className="air-queue-empty";empty.textContent="Adicione faixas pelo Catálogo";list.append(empty);const track=$(".track");if(track){const name=$("strong",track),meta=$("small",track),times=$(".progress span",track),bar=$(".bar",track);if(name)name.textContent="Nenhuma faixa selecionada";if(meta)meta.textContent="Adicione uma faixa à playlist para reproduzir";if(times.length>1){times[0].textContent="00:00";times[1].textContent="00:00"}if(bar){bar.style.background="linear-gradient(90deg,#fa7c13 0%,#14283a 0%)";bar.style.setProperty("--play-progress","0%")}}currentIndex=-1;selectedQueueIndex=-1;return}if(selectedQueueIndex<0||selectedQueueIndex>=tracks.length)selectedQueueIndex=0;if(audio.paused&&currentIndex<0)updateNow(tracks[selectedQueueIndex]);list.replaceChildren();tracks.forEach((item,i)=>{const row=document.createElement("div");row.className="playlist-row";row.tabIndex=0;row.setAttribute("role","button");row.setAttribute("aria-label","Selecionar "+titleOf(item));const icon=categoryIcon(item);const badge=document.createElement("span");badge.className="category-icon "+icon.cls;if(icon.svg)badge.innerHTML=icon.svg;else badge.textContent=icon.text;const info=document.createElement("div");info.className="playlist-info";const title=document.createElement("span");title.className="track-title";const artist=String(item.artist||"").trim();title.textContent=titleOf(item)+(artist&&!titleOf(item).toLocaleLowerCase("pt-BR").includes(artist.toLocaleLowerCase("pt-BR"))?" — "+artist:"");const sub=document.createElement("div");sub.className="track-sub";const scheduled=document.createElement("time");scheduled.className="queue-scheduled";scheduled.textContent=plannedAt(tracks,i,item);const duration=document.createElement("span");duration.className="queue-time";duration.textContent=fmt(durationOf(item));const intro=document.createElement("span");intro.className="queue-intro";intro.textContent=introTimeOf(item);const genre=genreInfo(item);const tag=document.createElement("span");tag.className="genre-label genre-"+genre.key;tag.textContent=genre.label;tag.title=genre.label;sub.append(scheduled,duration,intro);sub.insertAdjacentHTML("beforeend",queueStateMarkup(i));sub.append(tag);sub.insertAdjacentHTML("beforeend",queueActionMarkup(item,!!selectedAction));info.append(title,sub);row.append(badge,info);row.addEventListener("click",()=>selectQueueRow(i));row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectQueueRow(i)}});list.append(row)})}
function addToQueue(item){queue.Playlist.push({...item});activeQueue="Playlist";demoMode=false;localStorage.setItem("playmaster-air-demo-dismissed","1");persist();renderQueue();status.textContent="Adicionada à playlist."}
function deleteQueueTrack(index){const list=queue.Playlist,item=list[index];if(!item)return;const wasCurrent=index===currentIndex;if(wasCurrent){cancelPlaybackWatchdog();cancelFade();audio.pause();audio.removeAttribute("src");audio.load();audio.loop=false;transportLoopItem=null;playbackPaused=false;pauseResumePending=false;currentIndex=-1;if(loopButton){loopButton.classList.remove("is-active");loopButton.setAttribute("aria-pressed","false")}setMainPlayState(false)}else if(index<currentIndex)currentIndex--;if(selectedQueueIndex>index)selectedQueueIndex--;else if(selectedQueueIndex===index)selectedQueueIndex=Math.min(index,list.length-2);list.splice(index,1);if(!list.length){currentIndex=-1;selectedQueueIndex=-1}else if(selectedQueueIndex<0)selectedQueueIndex=Math.min(index,list.length-1);persist();renderQueue();refreshOnAir()}
function nextTrack(){const list=queue.Playlist;const endedItem=currentIndex>=0?list[currentIndex]:null;if(audio.ended&&endedItem?.__airPauseAfter){playbackPaused=true;pauseResumePending=true;selectedQueueIndex=currentIndex;audio.loop=false;transportLoopItem=null;if(loopButton){loopButton.classList.remove('is-active');loopButton.setAttribute('aria-pressed','false')}renderQueue();return}if(currentIndex>=0&&!audio.ended&&!audio.paused&&audio.currentTime>0){const item=list[currentIndex];const id=String(item?.id??titleOf(item||{}));skippedTrackIds.add(id);playedTrackIds.delete(id)}if(currentIndex+1<list.length)playIndex(currentIndex+1);else{setLoop(false);audio.pause();currentIndex=-1;renderQueue()}}
function setQueue(){activeQueue="Playlist";renderQueue()}
function ensureTabs(){document.querySelector(".air-queue-tabs")?.remove();renderQueue()}
function openCatalog(){overlay.hidden=false;loadCategory(catalogCategory)}
const staticPlaylist=$(".playlist-list");staticPlaylist?.addEventListener("click",event=>{if(!demoMode||queue.Playlist.length)return;if(event.target.closest(".playlist-row"))event.preventDefault()});
const toolbarActions=new Set(["Pause","Loop","Excluir","Cue","Hora Certa","Temperatura","Mover faixa"]);$$(".tool").forEach(el=>{const label=$("span",el)?.textContent.trim();if(label==="Catálogo")el.addEventListener("click",openCatalog)});document.addEventListener("click",event=>{const tool=event.target?.closest?.(".toolbar .tool");if(!tool)return;const label=$("span",tool)?.textContent.trim();if(!toolbarActions.has(label))return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(label==="Loop"){loopSelectionMode=!loopSelectionMode;pauseSelectionMode=false;selectedAction=null;delete document.body.dataset.armedQueueAction;persist();renderQueue();syncStaticQueueActions();window.dispatchEvent(new CustomEvent("playmaster:queue-action-consumed"));return}if(label==="Pause"){pauseSelectionMode=!pauseSelectionMode;loopSelectionMode=false;selectedAction=null;delete document.body.dataset.armedQueueAction;persist();renderQueue();syncStaticQueueActions();window.dispatchEvent(new CustomEvent("playmaster:queue-action-consumed"));return}loopSelectionMode=false;pauseSelectionMode=false;const removeAll=selectedAction===label;selectedAction=removeAll?null:label;delete document.body.dataset.armedQueueAction;queue.Playlist.forEach(item=>{if(removeAll)delete item.__airQueueAction;else item.__airQueueAction=label});document.querySelectorAll(".playlist-row").forEach(row=>{if(removeAll)delete row.dataset.airQueueAction;else row.dataset.airQueueAction=label});persist();renderQueue();syncStaticQueueActions();window.dispatchEvent(new CustomEvent("playmaster:queue-action-consumed"))},true);document.addEventListener("click",event=>{const icon=event.target?.closest?.(".playlist-row .queue-action.action-loop");if(!icon||!loopSelectionMode)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const row=icon.closest(".playlist-row"),rows=Array.from(document.querySelectorAll(".playlist-row")),index=rows.indexOf(row),item=queue.Playlist[index];if(!item)return;item.__airLoop=!item.__airLoop;if(index===currentIndex){audio.loop=Boolean(item.__airLoop);transportLoopItem=audio.loop?item:null;if(loopButton){loopButton.classList.toggle("is-active",audio.loop);loopButton.setAttribute("aria-pressed",String(audio.loop))}}persist();renderQueue()},true);document.addEventListener("click",event=>{const icon=event.target?.closest?.(".playlist-row .queue-action.action-pause");if(!icon||!pauseSelectionMode)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const row=icon.closest(".playlist-row"),rows=Array.from(document.querySelectorAll(".playlist-row")),index=rows.indexOf(row),item=queue.Playlist[index];if(!item)return;item.__airPauseAfter=!item.__airPauseAfter;persist();renderQueue()},true);document.addEventListener("click",event=>{const icon=event.target?.closest?.(".playlist-row .queue-action.action-delete");if(!icon)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const row=icon.closest(".playlist-row"),rows=Array.from(document.querySelectorAll(".playlist-row")),index=rows.indexOf(row);if(index<0)return;deleteQueueTrack(index)},true);
const transport=$$(".transport button");
const mainPlayButton=transport[2];
function setMainPlayState(playing){
  if(!mainPlayButton)return;
  mainPlayButton.classList.toggle("is-playing",playing);
  mainPlayButton.setAttribute("aria-label",playing?"Stop":"Play");
  mainPlayButton.title=playing?"Stop":"Play";
  const svg=mainPlayButton.querySelector("svg");
  if(svg)svg.innerHTML=playing
    ?'<rect x="6" y="6" width="12" height="12" rx="1.5" fill="#ff334a"/>'
    :'<path d="M7 4.5a1 1 0 0 1 1.5-.86l11 7a1.6 1.6 0 0 1 0 2.72l-11 7A1 1 0 0 1 7 19.5z" fill="#20e36f"/>';
}

const rewindPauseCurrent=()=>{if(currentIndex<0)return;playbackPaused=true;cancelPlaybackWatchdog();cancelFade();selectedQueueIndex=currentIndex;audio.pause();audio.currentTime=0;updateProgress();refreshOnAir();renderQueue()};
const rewindCurrent=()=>{if(currentIndex<0)return;cancelPlaybackWatchdog();cancelFade();const wasPlaying=!audio.paused;audio.currentTime=0;selectedQueueIndex=currentIndex;updateProgress();renderQueue();if(wasPlaying)monitorPlaybackStart(queue.Playlist[currentIndex],false)};
const playCurrent=()=>{const list=queue[activeQueue];if(!list.length){showPlaybackNotice("Play clicado, mas a playlist está vazia. Selecione ou adicione uma faixa e tente novamente.");openCatalog();return}if(pauseResumePending){pauseResumePending=false;const pausedItem=currentIndex>=0?list[currentIndex]:null;if(pausedItem?.__airPauseAfter){delete pausedItem.__airPauseAfter;persist()}const resumeIndex=currentIndex+1<list.length?currentIndex+1:0;playIndex(resumeIndex,true,true);renderQueue();return}if(!audio.paused){playbackPaused=false;cancelPlaybackWatchdog();showPlaybackNotice("Comando Stop recebido para "+titleOf(queue.Playlist[currentIndex]||{})+".");audio.pause();audio.currentTime=0;updateProgress();refreshOnAir();return}const target=selectedQueueIndex>=0?selectedQueueIndex:(currentIndex>=0?currentIndex:0);if(target!==currentIndex||!audio.src){playIndex(target,true,true);return}playbackPaused=false;cancelFade();const request=audio.play();monitorPlaybackStart(queue.Playlist[target],true);if(request&&typeof request.catch==="function")request.catch(error=>{void showPlaybackError(error,queue.Playlist[target]);refreshOnAir()})};
const fadeOutCurrent=()=>{if(currentIndex<0)return;if(audio.paused){nextTrack();return}cancelFade();prepareVuMeter();const graph=vuGraphs.get(audio);const duration=900;const started=performance.now();if(graph?.gain){const param=graph.gain.gain,now=graph.gain.context.currentTime;param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);param.linearRampToValueAtTime(0,now+duration/1000)}else{const startVolume=audio.volume;fadeInterval=setInterval(()=>{const progress=Math.min(1,(performance.now()-started)/duration);audio.volume=startVolume*(1-progress)},40)}fadeTimeout=setTimeout(()=>{if(fadeInterval!==null){clearInterval(fadeInterval);fadeInterval=null}fadeTimeout=null;audio.pause();audio.volume=1;const currentGraph=vuGraphs.get(audio);if(currentGraph?.gain){const now=currentGraph.gain.context.currentTime;currentGraph.gain.gain.cancelScheduledValues(now);currentGraph.gain.gain.setValueAtTime(1,now)}nextTrack()},duration+40)};
const setLoop=enabled=>{const item=currentIndex>=0?queue[activeQueue][currentIndex]:null;if(enabled&&!item){showPlaybackNotice("Inicie ou selecione uma faixa antes de ativar Loop.");return}if(item)item.__airLoop=Boolean(enabled);audio.loop=Boolean(enabled&&item);transportLoopItem=audio.loop?item:null;if(loopButton){loopButton.classList.toggle("is-active",audio.loop);loopButton.setAttribute("aria-pressed",String(audio.loop))}persist();renderQueue()};
if(transport[0])transport[0].addEventListener("click",rewindPauseCurrent);
if(transport[1])transport[1].addEventListener("click",rewindCurrent);
if(transport[2])transport[2].addEventListener("click",playCurrent);
if(transport[3])transport[3].addEventListener("click",nextTrack);
if(transport[4])transport[4].addEventListener("click",fadeOutCurrent);
loopButton=transport[5]||null;if(loopButton){loopButton.setAttribute("aria-pressed","false");loopButton.addEventListener("click",()=>setLoop(!audio.loop))}
function cancelPlaybackWatchdog(){playbackAttemptId++;if(playbackWatchdog!==null){clearTimeout(playbackWatchdog);playbackWatchdog=null}}
async function probeAudioSource(){
  try{
    const response=await fetch(audio.currentSrc||audio.src,{method:"GET",headers:{Range:"bytes=0-0"},credentials:"same-origin",cache:"no-store"});
    const result={status:response.status,type:response.headers.get("content-type")||"sem Content-Type",range:response.headers.get("content-range")||"",length:response.headers.get("content-length")||""};
    try{await response.body?.cancel()}catch{}
    return result;
  }catch(error){return{status:"falhou",type:error?.message||"erro de rede",range:"",length:""}}
}
async function showPlaybackError(error,item=queue.Playlist[currentIndex],reason="erro"){
  cancelPlaybackWatchdog();
  let authenticated=sessionOk;
  try{authenticated=await checkSession()}catch{}
  const code=error?.code||audio.error?.code||0;
  const details={1:"reprodução interrompida",2:"falha ao receber áudio do servidor",3:"Safari não conseguiu decodificar o arquivo",4:"formato recebido não compatível com Safari"};
  const source=await probeAudioSource();
  const state="readyState "+audio.readyState+"/4 · networkState "+audio.networkState+"/3 · tempo "+fmt(audio.currentTime||0);
  const server="Servidor: HTTP "+source.status+" · "+source.type+(source.range?" · "+source.range:"");
  const cause=!authenticated
    ?"Sessão do Auto Import não autorizada ou expirada."
    :code?(details[code]||("Erro de mídia "+code+"."))
    :reason==="sem avanço"?"O Play foi aceito, mas o tempo da faixa não avançou."
    :reason==="sem sinal"?"O tempo da faixa avançou, mas o medidor não detectou sinal de áudio."
    :"O navegador não confirmou o início da reprodução.";
  showPlaybackNotice("Diagnóstico: "+titleOf(item||{})+" — "+cause+" "+state+" · "+server);
  console.warn("Diagnóstico da reprodução:",{error,code,authenticated,state,server,source:audio.currentSrc||audio.src});
}
const playbackNotice=document.createElement("div");
playbackNotice.className="air-playback-notice";
playbackNotice.setAttribute("role","status");
playbackNotice.setAttribute("aria-live","polite");
playbackNotice.style.cssText="display:none;position:fixed;z-index:10000;right:16px;bottom:54px;max-width:min(720px,calc(100vw - 32px));padding:10px 14px;border:1px solid #24739a;border-radius:6px;background:#0a1d2d;color:#48c6f2;font:13px/1.4 Arial,Helvetica,sans-serif;box-shadow:0 8px 24px #0009;white-space:normal";
document.body.append(playbackNotice);
let playbackNoticeTimer=null;
function showPlaybackNotice(message){playbackNotice.textContent=message;playbackNotice.style.display="block";if(playbackNoticeTimer!==null)clearTimeout(playbackNoticeTimer);playbackNoticeTimer=setTimeout(()=>{playbackNotice.style.display="none";playbackNoticeTimer=null},message.startsWith("Diagnóstico")?15000:4500)}
function monitorPlaybackStart(item,diagnostic=false){
  cancelPlaybackWatchdog();
  if(!diagnostic)return;
  const attempt=playbackAttemptId,initialTime=audio.currentTime||0;
  showPlaybackNotice("Play recebido para "+titleOf(item||{})+". Aguardando início da faixa…");
  playbackWatchdog=setTimeout(async()=>{
    if(attempt!==playbackAttemptId||audio.ended)return;
    if(audio.error){void showPlaybackError(audio.error,item);return}
    const advanced=!audio.paused&&(audio.currentTime||0)>initialTime+.2;
    const graph=vuGraphs.get(audio);
    const signal=graph?rmsPercent(graph):null;
    const source=await probeAudioSource();
    if(attempt!==playbackAttemptId)return;
    let result;
    if(advanced&&signal!==null&&signal>1.5)result="A faixa avançou e o VU detectou sinal. Se não há som, o problema está na saída de áudio do dispositivo.";
    else if(advanced&&signal!==null)result="A faixa avançou, mas o VU não detectou sinal de áudio.";
    else if(advanced)result="A faixa avançou; o VU não está disponível para confirmar o sinal.";
    else result="O Play foi recebido, mas o tempo da faixa não avançou.";
    const details="Estado Safari: readyState "+audio.readyState+"/4 · networkState "+audio.networkState+"/3 · tempo "+fmt(audio.currentTime||0)+" · HTTP "+source.status+" · "+source.type+(source.range?" · "+source.range:"");
    showPlaybackNotice("Diagnóstico — "+titleOf(item||{})+": "+result+" "+details);
    playbackWatchdog=null;
  },5000);
}
audio.addEventListener("error",()=>{if(currentIndex>=0)void showPlaybackError(audio.error,queue.Playlist[currentIndex])});
audio.addEventListener("play",()=>{setMainPlayState(true);renderQueue()});audio.addEventListener("pause",()=>{setMainPlayState(false);renderQueue()});audio.addEventListener("ended",()=>{setMainPlayState(false);renderQueue()});setMainPlayState(false);
audio.addEventListener("timeupdate",updateProgress);audio.addEventListener("loadedmetadata",updateProgress);audio.addEventListener("ended",()=>{if(currentIndex>=0){const item=queue[activeQueue][currentIndex];playedTrackIds.add(String(item?.id??titleOf(item||{})))}nextTrack()});setInterval(updateAirTimers,100);updateAirTimers();

function updateHeaderClock(){
  const now=new Date(), pad=n=>String(n).padStart(2,"0");
  const clock=document.querySelector(".clock strong");
  const date=document.querySelector(".clock small");
  const meta=document.querySelector(".clock .sub");
  if(!clock||!date||!meta)return;
  const year=now.getFullYear(), month=now.getMonth(), day=now.getDate();
  const weekday=new Intl.DateTimeFormat("pt-BR",{weekday:"long"}).format(now).toLocaleUpperCase("pt-BR");
  const dateUTC=Date.UTC(year,month,day);
  const dayOfYear=Math.floor((dateUTC-Date.UTC(year,0,1))/86400000)+1;
  const iso=new Date(dateUTC);
  iso.setUTCDate(iso.getUTCDate()+4-(iso.getUTCDay()||7));
  const week=Math.ceil((((iso-Date.UTC(iso.getUTCFullYear(),0,1))/86400000)+1)/7);
  clock.textContent=`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  date.textContent=`${pad(day)}/${pad(month+1)}/${year} • ${weekday}`;
  meta.textContent=`DIA ${dayOfYear}  SEMANA ${week}  MÊS ${month+1}`;
}
updateHeaderClock();
setInterval(updateHeaderClock,1000);

const timerOutput=document.querySelector(".timer output");
const timerButtons=[...document.querySelectorAll(".timer nav button")];
if(timerOutput&&timerButtons.length>=3){
  let timerValue=0, timerStartedAt=null, timerCountsDown=false;
  const formatTimer=seconds=>{
    seconds=Math.max(0,Math.floor(seconds));
    const h=String(Math.floor(seconds/3600)).padStart(2,"0");
    const m=String(Math.floor((seconds%3600)/60)).padStart(2,"0");
    const s=String(seconds%60).padStart(2,"0");
    timerOutput.textContent=`${h}:${m}:${s}`;
  };
  const currentTimerValue=()=>{
    if(timerStartedAt===null)return timerValue;
    const elapsed=Math.floor((performance.now()-timerStartedAt)/1000);
    return timerCountsDown?Math.max(0,timerValue-elapsed):timerValue+elapsed;
  };
  timerButtons[0].addEventListener("click",()=>{
    if(timerStartedAt!==null){
      timerValue=currentTimerValue();
      timerStartedAt=null;
      timerButtons[0].textContent="START";
    }else{
      timerStartedAt=performance.now();
      timerButtons[0].textContent="PAUSE";
    }
    formatTimer(currentTimerValue());
  });
  timerButtons[1].addEventListener("click",()=>{
    const input=window.prompt("Defina a duração como HH:MM:SS (ex.: 00:05:00). Deixe vazio para cronômetro crescente.");
    if(input===null)return;
    const value=input.trim();
    if(!value){
      timerValue=0;
      timerCountsDown=false;
    }else{
      const match=value.match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
      if(!match||Number(match[2])>59||Number(match[3])>59){
        window.alert("Use o formato HH:MM:SS.");
        return;
      }
      timerValue=Number(match[1])*3600+Number(match[2])*60+Number(match[3]);
      timerCountsDown=true;
    }
    timerStartedAt=null;
    timerButtons[0].textContent="START";
    formatTimer(timerValue);
  });
  timerButtons[2].addEventListener("click",()=>{
    timerValue=0;
    timerStartedAt=null;
    timerCountsDown=false;
    timerButtons[0].textContent="START";
    formatTimer(0);
  });
  setInterval(()=>{
    const current=currentTimerValue();
    if(timerCountsDown&&timerStartedAt!==null&&current===0){
      timerValue=0;
      timerStartedAt=null;
      timerButtons[0].textContent="START";
    }
    formatTimer(current);
  },250);
}

const modeButtons=$$(".mode-button");
const modeNames={M:"MANUAL",A:"AUTOMÁTICO",S:"SATÉLITE"};
let activeMode="M";
function selectMode(mode){
  activeMode=mode;
  modeButtons.forEach(button=>{
    const active=button.dataset.mode===mode;
    button.classList.toggle("is-active",active);
    button.setAttribute("aria-pressed",String(active));
  });
  const label=$("#activeModeText");
  if(label)label.textContent=modeNames[mode]||"AUTOMÁTICO";
}
modeButtons.forEach(button=>button.addEventListener("click",()=>selectMode(button.dataset.mode)));
selectMode("M");

const onAirTile=$(".onair");
const boundAirMedia=new WeakSet(),activeAirMedia=new Set(),vuGraphs=new WeakMap();
let vuContext=null,vuAnimation=0;
function ensureVuContext(){
  if(vuContext)return vuContext;
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return null;
  try{vuContext=new AudioContextClass()}catch(error){console.warn("Web Audio indisponível para os VUs:",error);return null}
  return vuContext;
}
function prepareVuMeter(el=audio){
  const context=ensureVuContext();
  if(!context||!el)return false;
  if(context.state!=="running"){
    if(context.state==="suspended")void context.resume().then(()=>{
      if(context.state==="running"&&!vuGraphs.has(el))prepareVuMeter(el);
    }).catch(error=>console.warn("AudioContext não retomou; mantendo reprodução nativa:",error));
    return false;
  }
  if(!vuGraphs.has(el)){
    try{
      const source=context.createMediaElementSource(el);
      const analyser=context.createAnalyser();
      const gain=context.createGain();
      gain.gain.value=1;
      analyser.fftSize=1024;
      analyser.smoothingTimeConstant=.45;
      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(context.destination);
      vuGraphs.set(el,{analyser,gain,data:new Float32Array(analyser.fftSize)});
    }catch(error){console.warn("Não foi possível conectar o áudio aos VUs:",error);return false}
  }
  return true;
}
function refreshOnAir(){
  if(!onAirTile)return;
  const playing=[...document.querySelectorAll("audio,video")].some(el=>!el.paused&&!el.ended)||[...activeAirMedia].some(el=>!el.paused&&!el.ended);
  onAirTile.classList.toggle("is-live",playing);
  if(!playing)paintVuMeters(0,0);
}
function bindAirMedia(el){
  if(!el||boundAirMedia.has(el))return;
  boundAirMedia.add(el);
  ["play","playing","pause","ended","emptied","timeupdate"].forEach(eventName=>el.addEventListener(eventName,()=>{
    if(eventName==="play"||eventName==="playing"){
      activeAirMedia.add(el);
      onAirTile?.classList.add("is-live");
      prepareVuMeter(el);
      animateVuMeter();
    }
    if(eventName==="pause"||eventName==="ended"||eventName==="emptied")activeAirMedia.delete(el);
    refreshOnAir();
  }));
}
function rmsPercent(graph){
  if(!graph?.analyser||!graph.data)return 0;
  graph.analyser.getFloatTimeDomainData(graph.data);
  let sum=0;
  for(const sample of graph.data)sum+=sample*sample;
  const rms=Math.sqrt(sum/graph.data.length);
  const db=20*Math.log10(Math.max(rms,.00001));
  return Math.max(0,Math.min(100,(db+54)/48*100));
}
function paintVuMeters(left,right){
  const meters=$$(".track .meter");
  [left,right].forEach((level,index)=>{
    const meter=meters[index];if(!meter)return;
    const green=Math.min(level,72),yellow=Math.max(0,Math.min(level,88)-72),red=Math.max(0,level-88);
    const yellowStart=green,redStart=green+yellow,activeEnd=green+yellow+red;
    meter.style.background=level<=0?"#172b3b":`linear-gradient(90deg,#23d56d 0 ${green}%,#f5c32c ${yellowStart}% ${redStart}%,#d93d41 ${redStart}% ${activeEnd}%,#172b3b ${activeEnd}% 100%)`;
  });
}
function animateVuMeter(){
  if(vuAnimation)return;
  const draw=()=>{
    vuAnimation=0;
    const playing=[...activeAirMedia].filter(el=>!el.paused&&!el.ended);
    if(!playing.length){paintVuMeters(0,0);return}
    let level=0;
    for(const el of playing){
      if(!vuGraphs.has(el))prepareVuMeter(el);
      level=Math.max(level,rmsPercent(vuGraphs.get(el)));
    }
    paintVuMeters(level,level);
    vuAnimation=requestAnimationFrame(draw);
  };
  vuAnimation=requestAnimationFrame(draw);
}
bindAirMedia(audio);
document.querySelectorAll("audio,video").forEach(bindAirMedia);
new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
  if(node.nodeType!==1)return;
  if(node.matches?.("audio,video"))bindAirMedia(node);
  node.querySelectorAll?.("audio,video").forEach(bindAirMedia);
}))).observe(document.body,{childList:true,subtree:true});
refreshOnAir();
setInterval(refreshOnAir,250);

const commercialRemaining=$("#commercialRemaining"),nextCommercialTime=$("#nextCommercialTime");
let nextCommercialDeadline=null;
function renderCommercialSchedule(){
  if(!commercialRemaining||!nextCommercialTime)return;
  if(nextCommercialDeadline===null){
    commercialRemaining.textContent="--:--";
    nextCommercialTime.textContent="--:--";
    return;
  }
  const secondsLeft=Math.max(0,Math.ceil((nextCommercialDeadline-Date.now())/1000));
  commercialRemaining.textContent=fmt(secondsLeft);
}
async function refreshCommercialSchedule(){
  try{
    const response=await fetch("https://traffic.apcgestor.com.br/api/air/next-block",{mode:"cors",credentials:"omit",cache:"no-store"});
    if(!response.ok)throw new Error("Traffic indisponível");
    const data=await response.json();
    const time=String(data.nextBlockTime||"");
    const secondsUntil=Number(data.secondsUntil);
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!Number.isFinite(secondsUntil)){
      nextCommercialDeadline=null;
      if(nextCommercialTime)nextCommercialTime.textContent="--:--";
    }else{
      nextCommercialDeadline=Date.now()+Math.max(0,secondsUntil)*1000;
      nextCommercialTime.textContent=time;
    }
  }catch{
    if(nextCommercialDeadline===null){
      if(commercialRemaining)commercialRemaining.textContent="--:--";
      if(nextCommercialTime)nextCommercialTime.textContent="--:--";
    }
  }
  renderCommercialSchedule();
}
refreshCommercialSchedule();
setInterval(refreshCommercialSchedule,30000);
setInterval(renderCommercialSchedule,1000);

ensureTabs();
})();
