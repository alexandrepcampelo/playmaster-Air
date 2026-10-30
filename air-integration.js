(()=> {
"use strict";
const CATEGORIES=["Músicas","Comerciais","Vinhetas","Intercons","Trilhas","Chamadas","Locução","Hora Certa","Temperatura","Outros"];
const key="playmaster-air-queues-v1";
const queue={Playlist:[]};
let activeQueue="Playlist",currentIndex=-1,sessionOk=false,catalogCategory="Músicas",catalogItems=[],demoMode=false;const playedTrackIds=new Set();const skippedTrackIds=new Set();
let selectedAction=null,selectedQueueIndex=-1,transportLoopItem=null,playbackPaused=false,loopSelectionMode=false,pauseSelectionMode=false,pauseResumePending=false;
const nativePlaylistAudio=/iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);const audio=new Audio();audio.preload="auto";audio.playsInline=true;audio.setAttribute("playsinline","");audio.setAttribute("webkit-playsinline","");audio.controls=false;audio.removeAttribute("controls");audio.setAttribute("aria-hidden","true");audio.tabIndex=-1;let playbackAttemptId=0,playbackWatchdog=null;
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const titleOf=x=>x?.title||x?.fileName||x?.name||"Áudio";
const rawDuration=x=>{const v=x?.duration;if(typeof v==="string"&&/^\d{1,2}:\d{2}(?:\.\d+)?$/.test(v)){const [m,sec]=v.split(":");return Number(m)*60+Number(sec)}return Math.max(0,Number(v)||0)};
const durationOf=x=>Array.isArray(x?.__airSequence)?x.__airSequence.reduce((sum,part)=>sum+rawDuration(part),0):rawDuration(x);
const segmentList=item=>Array.isArray(item?.__airSequence)&&item.__airSequence.length?item.__airSequence:[item];
let currentSegmentIndex=0;
const sequenceElapsed=item=>segmentList(item).slice(0,currentSegmentIndex).reduce((sum,part)=>sum+rawDuration(part),0)+(audio.currentTime||0);
const fmt=n=>{n=Math.floor(Math.max(0,Number(n)||0));return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")};
const persist=()=>localStorage.setItem(key,JSON.stringify(queue));
try{const saved=JSON.parse(localStorage.getItem(key)||"{}");queue.Playlist=Array.isArray(saved.Playlist)?saved.Playlist:[...(saved["Músicas"]||[]),...(saved.Comerciais||[])];demoMode=false}catch{demoMode=true}
async function json(path,options={}){const r=await fetch(path,{...options,credentials:"same-origin",cache:"no-store"});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||("Falha HTTP "+r.status));return d}
const overlay=document.createElement("div");overlay.className="air-catalog-overlay";overlay.hidden=true;
const catalogProgressStyle=document.createElement("style");catalogProgressStyle.textContent=".air-catalog-row{position:relative;overflow:hidden}.air-catalog-row .air-catalog-progress{position:absolute;inset:0 auto 0 0;width:var(--catalog-progress,0%);background:rgba(66,196,125,.48);pointer-events:none;transition:width .12s linear;z-index:0}.air-catalog-row>*:not(.air-catalog-progress){position:relative;z-index:1}";document.head.append(catalogProgressStyle);
overlay.innerHTML='<section class="air-catalog-dialog" role="dialog" aria-modal="true" aria-label="Catálogo de áudio"><header><strong>CATÁLOGO DE ÁUDIO</strong><button type="button" data-close aria-label="Fechar">×</button></header><form class="air-catalog-login" hidden><span>Entre no Auto Import para acessar os áudios.</span><input name="username" autocomplete="username" placeholder="Usuário"><input name="password" type="password" autocomplete="current-password" placeholder="Senha"><button type="submit">Entrar</button><small></small></form><nav class="air-catalog-categories"></nav><input class="air-catalog-search" type="search" placeholder="Buscar arquivo…"><div class="air-catalog-status" aria-live="polite"></div><div class="air-catalog-files"></div></section>';
document.body.append(overlay);
const hourCueVoiceStorageKey="playmaster-air-hour-cue-voice-v1";
let selectedHourCueVoice=localStorage.getItem(hourCueVoiceStorageKey)||"";
window.playmasterAirSettings=window.playmasterAirSettings||{};
window.playmasterAirSettings.hourCueVoice=selectedHourCueVoice;
const airVoiceMenu=document.createElement("div");airVoiceMenu.className="air-voice-menu-overlay";airVoiceMenu.hidden=true;
airVoiceMenu.innerHTML='<section class="air-voice-menu" role="dialog" aria-modal="true" aria-labelledby="airVoiceMenuTitle"><header><strong id="airVoiceMenuTitle">MENU DO AIR</strong><button type="button" data-close aria-label="Fechar">×</button></header><label for="airHourCueVoice"><span>Voz da Hora Certa</span><select id="airHourCueVoice"><option value="">Carregando vozes…</option></select></label><small class="air-voice-menu-help">A voz selecionada será usada nas faixas de Hora Certa.</small><p class="air-voice-menu-status" aria-live="polite">Carregando opções do Auto Import…</p><button type="button" class="air-voice-menu-catalog">Abrir Catálogo para conectar</button></section>';
document.body.append(airVoiceMenu);
const hourCueVoiceSelect=$("#airHourCueVoice",airVoiceMenu),hourCueVoiceStatus=$(".air-voice-menu-status",airVoiceMenu);
const airVoiceMenuStyle=document.createElement("style");airVoiceMenuStyle.textContent='.air-voice-menu-overlay{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:16px;background:#02070de8}.air-voice-menu-overlay[hidden]{display:none}.air-voice-menu{width:min(390px,100%);padding:10px;border:1px solid #286087;border-radius:7px;background:#02070d;box-shadow:0 18px 60px #000c;display:flex;flex-direction:column;gap:9px}.air-voice-menu header{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border:1px solid #193850;border-radius:4px;background:#102b40;font-size:13px}.air-voice-menu header button{width:29px;height:29px;border:1px solid #31516a;border-radius:4px;background:#10263a;color:#fff;font-size:20px;cursor:pointer}.air-voice-menu label{display:grid;gap:5px;color:#dce8f2}.air-voice-menu select{height:35px;padding:0 9px;border:1px solid #24465e;border-radius:4px;background:#061321;color:#eaf2f8;font:inherit}.air-voice-menu-help,.air-voice-menu-status{margin:0;color:#9eb0bf}.air-voice-menu-status{color:#45b9e8}.air-voice-menu-catalog{display:none;padding:7px;border:1px solid #1b8dba;border-radius:4px;background:#0b5279;color:#fff;cursor:pointer}.air-voice-menu.needs-login .air-voice-menu-catalog{display:block}';document.head.append(airVoiceMenuStyle);
const catNav=$(".air-catalog-categories",overlay),files=$(".air-catalog-files",overlay),search=$(".air-catalog-search",overlay),status=$(".air-catalog-status",overlay),login=$(".air-catalog-login",overlay);
for(const c of CATEGORIES){const b=document.createElement("button");b.type="button";b.textContent=c;b.dataset.category=c;catNav.append(b)}
const close=()=>{overlay.hidden=true};
overlay.addEventListener("click",e=>{if(e.target===overlay||e.target.closest("[data-close]"))close()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!overlay.hidden)close()});
async function checkSession(){try{await json("/api/me");sessionOk=true;login.hidden=true;return true}catch{sessionOk=false;login.hidden=false;return false}}
login.addEventListener("submit",async e=>{e.preventDefault();const b=$('button[type="submit"]',login),msg=$("small",login);b.disabled=true;msg.textContent="";try{const d=new FormData(login);await json("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:d.get("username"),password:d.get("password")})});sessionOk=true;login.hidden=true;await loadCategory(catalogCategory)}catch(err){msg.textContent=err.message}finally{b.disabled=false}});
function catalogItemKey(item){return String(item?.id??item?.fileId??item?.fileName??item?.filename??"")}function syncCatalogRowProgress(){const playing=activeQueue==="Playlist"&&currentIndex>=0&&!audio.paused?queue.Playlist[currentIndex]:null;const playingKey=playing?catalogItemKey(playing):"";const total=durationOf(playing);const progress=playing&&playingKey&&total?Math.min(100,sequenceElapsed(playing)/total*100):0;files.querySelectorAll(".air-catalog-row").forEach(row=>{const active=Boolean(playingKey)&&row.dataset.trackId===playingKey;row.classList.toggle("is-playing",active);const bar=row.querySelector(".air-catalog-progress");if(bar)bar.style.setProperty("--catalog-progress",active?progress+"%":"0%")})}function renderCatalog(){files.replaceChildren();const q=search.value.trim().toLocaleLowerCase("pt-BR");const list=catalogItems.filter(x=>{const queryMatch=[titleOf(x),x.artist].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(q));const voice=String(x.subcategory||"").trim();const voiceMatch=catalogCategory!=="Hora Certa"||!selectedHourCueVoice||!voice||voice===selectedHourCueVoice||/sinal/i.test(String(titleOf(x)));return queryMatch&&voiceMatch});if(!list.length){const p=document.createElement("p");p.className="air-catalog-empty";p.textContent=sessionOk?"Nenhum áudio nesta categoria.":"Faça login para carregar o catálogo.";files.append(p);return}for(const item of list){const row=document.createElement("article");row.className="air-catalog-row";row.dataset.trackId=catalogItemKey(item);const progress=document.createElement("span");progress.className="air-catalog-progress";const info=document.createElement("div");info.innerHTML='<strong>'+esc(titleOf(item))+'</strong><small>'+esc(item.artist||item.category||"")+' · '+fmt(durationOf(item))+'</small>';const add=document.createElement("button");add.type="button";add.textContent="Adicionar à Playlist";add.addEventListener("click",()=>addToQueue(item));row.append(progress,info,add);files.append(row)}syncCatalogRowProgress();}
async function loadCategory(c){catalogCategory=c;catNav.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.category===c));search.value="";status.textContent="Carregando "+c+"…";try{if(!sessionOk&&!await checkSession()){catalogItems=[];status.textContent="Sessão do Auto Import necessária.";renderCatalog();return}const d=await json("/api/library?category="+encodeURIComponent(c)+"&limit=500&offset=0");catalogItems=(d.items||[]).map(x=>({...x,category:x.category||c}));status.textContent=catalogItems.length+" arquivo(s)";renderCatalog()}catch(e){catalogItems=[];status.textContent=e.message;renderCatalog()}}
catNav.addEventListener("click",e=>{const b=e.target.closest("button[data-category]");if(b)loadCategory(b.dataset.category)});
search.addEventListener("input",renderCatalog);
function updateNow(item){const track=$(".track");if(!track)return;const name=$("strong",track),meta=$("small",track),times=$$(".progress span",track);if(name)name.textContent=titleOf(item);if(meta)meta.textContent=(item.artist||"")+" • "+(item.category||"Áudio")+" • Playlist única";if(times.length>1)times[1].textContent=fmt(item.duration);updateProgress()}
function $$(s,r=document){return [...r.querySelectorAll(s)]}
function updateAirTimers(){const introCard=$("#introTimerCard"),introLabel=$("#introTimerLabel"),introValue=$("#introTimerValue"),progressiveValue=$("#progressiveTimerValue");if(!introCard||!introLabel||!introValue||!progressiveValue)return;const hasTrack=currentIndex>=0&&Boolean(queue[activeQueue][currentIndex]);const activeItem=hasTrack?queue[activeQueue][currentIndex]:null;const elapsed=hasTrack?sequenceElapsed(activeItem):0;const duration=hasTrack?durationOf(activeItem):0;const inIntro=hasTrack&&elapsed<5;const isPaused=playbackPaused&&hasTrack&&audio.paused;const shown=inIntro?Math.max(0,5-elapsed):Math.max(0,duration-elapsed);introCard.classList.toggle("is-paused",isPaused);introLabel.textContent=isPaused?"":inIntro||!hasTrack?"INTRO":"TEMPO REGRESSIVO";introCard.classList.toggle("is-regressive",hasTrack&&!isPaused&&!inIntro);introValue.textContent=isPaused?"PAUSE":fmtTenths(shown);progressiveValue.textContent=fmtTenths(elapsed)}
function fmtTenths(seconds){seconds=Math.max(0,Number(seconds)||0);const whole=Math.floor(seconds),minutes=Math.min(99,Math.floor(whole/60)),secs=whole%60,tenth=Math.floor((seconds-whole)*10);return String(minutes).padStart(2,"0")+":"+String(secs).padStart(2,"0")+","+tenth}
function attachProgressSeeking(){const bar=$(".track .bar");if(!bar||bar.dataset.seekReady)return;bar.dataset.seekReady="1";bar.setAttribute("role","slider");bar.setAttribute("tabindex","0");bar.setAttribute("aria-label","Posição do áudio");bar.addEventListener("click",event=>{if(!Number.isFinite(audio.duration)||audio.duration<=0)return;const rect=bar.getBoundingClientRect();if(!rect.width)return;const ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));const selected=currentIndex>=0?currentIndex:selectedQueueIndex;const item=selected>=0?queue[activeQueue][selected]:null;seekPlaylistTo(ratio*durationOf(item));updateProgress()});bar.addEventListener("keydown",event=>{if(!Number.isFinite(audio.duration)||audio.duration<=0)return;const step=event.shiftKey?10:5;if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();const selected=currentIndex>=0?currentIndex:selectedQueueIndex;const item=selected>=0?queue[activeQueue][selected]:null;seekPlaylistTo(Math.max(0,Math.min(durationOf(item),sequenceElapsed(item)+(event.key==="ArrowRight"?step:-step))));updateProgress()}})}
function seekPlaylistTo(position){const index=currentIndex>=0?currentIndex:selectedQueueIndex;const item=index>=0?queue[activeQueue][index]:null;if(!item)return;const parts=segmentList(item),total=durationOf(item);let remain=Math.max(0,Math.min(Number(position)||0,total));let target=0;while(target<parts.length-1&&remain>rawDuration(parts[target])){remain-=rawDuration(parts[target]);target++}if(!item.__airSequence){if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=remain;return}const resume=!audio.paused,part=parts[target];if(target===currentSegmentIndex&&Number.isFinite(audio.duration)&&audio.duration>0){audio.currentTime=Math.min(remain,audio.duration);return}currentSegmentIndex=target;audio.pause();audio.loop=false;audio.volume=Number(part.__airGain??1);audio.src="/api/library/"+encodeURIComponent(part.id)+"/audio";audio.load();const setPosition=()=>{audio.currentTime=Math.min(remain,Number.isFinite(audio.duration)?audio.duration:remain);if(resume){const request=audio.play();if(request&&typeof request.catch==="function")request.catch(error=>{void showPlaybackError(error,item)})}};audio.addEventListener("loadedmetadata",setPosition,{once:true})}
function syncPlaylistRowProgress(){ document.querySelectorAll(".playlist-row").forEach((row,i)=>{const active=activeQueue==="Playlist"&&i===currentIndex&&!audio.paused;row.classList.toggle("is-playing",active);if(!active){row.style.removeProperty("--row-progress");row.style.removeProperty("--row-progress-color");return}const item=queue.Playlist[i],total=durationOf(item),elapsed=sequenceElapsed(item),remaining=Math.max(0,total-elapsed),progress=total?Math.min(100,elapsed/total*100):0;const categories=[row.querySelector(".genre-label")?.textContent,item?.category,item?.audioCategory,item?.type,item?.mediaType,item?.folder,item?.folderName,item?.subcategory].filter(value=>typeof value==="string"&&value.trim()).map(value=>value.toLocaleLowerCase("pt-BR"));const isMusic=categories.some(value=>value.includes("músic")||value.includes("music")||/\\bsongs?\\b/.test(value))||(!categories.length&&!item?.__airSpecialType&&categoryIcon(item).cls==="cat-music");const color=isMusic&&remaining<=15?"#ef3340":isMusic&&remaining<=45?"#ff981f":"#087b40";row.style.setProperty("--row-progress",progress+"%");row.style.setProperty("--row-progress-color",color)})}
function updateProgress(){attachProgressSeeking();const track=$(".track");if(track){const playing=currentIndex>=0&&!audio.paused;const displayIndex=playing?currentIndex:(selectedQueueIndex>=0?selectedQueueIndex:currentIndex);const item=displayIndex>=0?queue[activeQueue][displayIndex]:null;const total=durationOf(item);const current=playing?sequenceElapsed(item):0;const p=total?Math.min(100,current/total*100):0;const bar=$(".bar",track);if(bar){bar.style.background="linear-gradient(90deg,#fa7c13 0 "+p+"%,#14283a "+p+"%)";bar.style.setProperty("--play-progress",p+"%")}const times=$(".progress span",track);if(times.length>1){times[0].textContent=fmt(current);times[1].textContent=fmt(total)}}syncPlaylistRowProgress();syncCatalogRowProgress();updateAirTimers()}
let fadeInterval=null;let fadeTimeout=null;let loopButton=null;function cancelFade(){if(fadeInterval!==null){clearInterval(fadeInterval);fadeInterval=null}if(fadeTimeout!==null){clearTimeout(fadeTimeout);fadeTimeout=null}const graph=vuGraphs?.get?.(audio);if(graph?.gain){const now=graph.gain.context.currentTime;graph.gain.gain.cancelScheduledValues(now);graph.gain.gain.setValueAtTime(1,now)}audio.volume=1}function playIndex(i,autoplay=true,diagnostic=false){playbackPaused=false;pauseResumePending=false;cancelPlaybackWatchdog();cancelFade();prepareVuMeter();const list=queue[activeQueue];if(!list.length)return;const nextIndex=(i+list.length)%list.length;const item=list[nextIndex];if(transportLoopItem&&transportLoopItem!==item){transportLoopItem=null;audio.loop=false;if(loopButton){loopButton.classList.remove("is-active");loopButton.setAttribute("aria-pressed","false")}}currentIndex=nextIndex;selectedQueueIndex=currentIndex;currentSegmentIndex=0;const firstSegment=segmentList(item)[0];audio.loop=Boolean(item.__airLoop)&&!item.__airSequence;transportLoopItem=audio.loop?item:null;audio.pause();audio.volume=Number(firstSegment?.__airGain??1);audio.src="/api/library/"+encodeURIComponent(firstSegment.id)+"/audio";audio.load();updateNow(item);renderQueue();if(autoplay){const request=audio.play();monitorPlaybackStart(item,diagnostic);if(request&&typeof request.catch==="function")request.catch(error=>{void showPlaybackError(error,item);refreshOnAir();renderQueue()})}else audio.pause()}
function categoryIcon(item){const category=String(item?.category||"Músicas").toLocaleLowerCase("pt-BR");if(category.includes("comercial"))return{cls:"cat-commercial",text:"$"};if(category.includes("vinheta"))return{cls:"cat-vinheta",svg:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4h4l7 5V5l-7 5H3Z"/><path d="M14 9c2 .6 3 1.6 3 3s-1 2.4-3 3"/><path d="m6 14 1.5 5h3"/></svg>'};if(category.includes("hora certa"))return{cls:"cat-clock",svg:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'};return{cls:"cat-music",text:"♫"}}
function plannedAt(list,index,item){const fixed=item?.plannedTime||item?.scheduledTime||item?.airTime;if(fixed){const parsed=new Date(fixed);return Number.isNaN(parsed.getTime())?String(fixed):parsed.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}const seconds=list.slice(0,index).reduce((sum,x)=>sum+durationOf(x),0)-(currentIndex>=0?(audio.currentTime||0):0);return new Date(Date.now()+Math.max(0,seconds)*1000).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})}
function introTimeOf(item){const value=item?.introTime??item?.introSeconds??item?.intro??0;if(typeof value==="string"&&/^\d{1,2}:\d{2}$/.test(value.trim()))return value.trim();return fmt(value)}
function genreInfo(item){const raw=[item?.genre,item?.musicalStyle,item?.style,item?.metadata?.genre,item?.tags?.genre].find(value=>typeof value==="string"&&value.trim())||item?.category||"Música";const label=String(raw).trim();const normalized=label.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");const kinds=[["classico","classico"],["sucesso","success"],["pop","pop"],["rock","rock"],["jazz","jazz"],["reggae","reggae"],["sertanejo","sertanejo"],["mpb","mpb"],["eletronica","eletronica"],["comercial","commercial"],["vinheta","vinheta"],["hora certa","clock"],["temperatura","temperatura"]];const key=kinds.find(([name])=>normalized.includes(name))?.[1]||"musica";return{label:label.toLocaleUpperCase("pt-BR"),key}}
function queueStateMarkup(index){const item=queue[activeQueue][index],id=String(item?.id??titleOf(item||{}));if(index===currentIndex&&!audio.paused)return '<span class="queue-state is-playing" aria-label="Em execução"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5a.8.8 0 0 1 1.2-.68l6.2 4.2a1.1 1.1 0 0 1 0 1.96l-6.2 4.2A.8.8 0 0 1 3 10.5z"/></svg></span>';if(playedTrackIds.has(id))return '<span class="queue-state is-played" aria-label="Executada"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2 6.2 2.5 2.5L10 3.4"/></svg></span>';if(skippedTrackIds.has(id))return '<span class="queue-state is-skipped" aria-label="Iniciada, mas avançada antes do fim"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="25 10" stroke-linecap="round" transform="rotate(-45 8 8)"/></svg></span>';return '<span class="queue-state" aria-hidden="true"></span>'}
function queueActionMarkup(item,preview=false){const isLoopSelected=Boolean(item?.__airLoop),isPauseSelected=Boolean(item?.__airPauseAfter),rowAction=item?.__airQueueAction==="Loop"?null:item?.__airQueueAction;if(loopSelectionMode||isLoopSelected){return '<span class="queue-action action-loop'+(isLoopSelected?' loop-picked':'')+'" aria-label="Loop"'+(isLoopSelected?' title="Loop ativado para esta faixa"':' title="Marcar loop nesta faixa"')+'>↻</span>'}if(pauseSelectionMode||isPauseSelected){return '<span class="queue-action action-pause'+(isPauseSelected?' loop-picked':'')+'" aria-label="Pause"'+(isPauseSelected?' title="Pausar depois desta faixa"':' title="Marcar pausa depois desta faixa"')+'><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg></span>'}const selected=item===transportLoopItem?"Loop":rowAction||(preview?selectedAction:null);if(!selected)return '<span class="queue-action" aria-hidden="true"></span>';const icons={Pause:['action-pause','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>'],Loop:['action-loop','↻'],Delete:['action-delete','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v7m4-7v7M5 7l1 14h12l1-14M9 7V4h6v3"/></svg>'],Clock:['action-clock','<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'],Temperature:['action-temperature','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 14.8V5a3 3 0 0 0-6 0v9.8a5 5 0 1 0 6 0Z"/><path d="M11 11v7"/></svg>'],Cue:['action-cue','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13v-2a3 3 0 0 1 3-3h2v10H6a3 3 0 0 1-3-3zM21 13v-2a3 3 0 0 0-3-3h-2v10h2a3 3 0 0 0 3-3zM8 8a4 4 0 0 1 8 0"/></svg>'],Move:['action-move','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7 4-4 4 4M12 3v18m-4-4 4 4 4-4"/></svg>']};const actionKey=({Excluir:"Delete","Hora Certa":"Clock",Temperatura:"Temperature","Mover faixa":"Move"})[selected]||selected;const [cls,icon]=icons[actionKey]||icons.Pause;return '<span class="queue-action '+cls+(preview&&!item?.__airQueueAction?' queue-action-preview':'')+'" aria-label="'+esc(selected)+'" title="'+esc(selected)+'">'+icon+'</span>'}
function syncStaticQueueActions(){document.querySelectorAll(".playlist-row").forEach(row=>{const placeholder=$(".queue-action",row);if(!placeholder)return;if(placeholder.classList.contains("loop-picked"))return;const selected=selectedAction||row.dataset.airQueueAction;const template=document.createElement("template");template.innerHTML=queueActionMarkup({__airQueueAction:selected},!!selectedAction).trim();placeholder.replaceWith(template.content.firstElementChild)})}
function selectQueueRow(index){if(index<0||index>=queue.Playlist.length)return;selectedQueueIndex=index;if(audio.paused)updateNow(queue.Playlist[index]);renderQueue()}
function renderQueue(){const list=$(".playlist-list");if(!list)return;const tracks=queue.Playlist;const headings=$(".playlist>.playhead span");if(headings[0])headings[0].textContent="PLAYLIST ÚNICA";if(headings[1])headings[1].textContent=demoMode&&!tracks.length?"EXEMPLO • 14 FAIXAS":tracks.length+" / 14 FAIXAS";if(!tracks.length){if(demoMode)return;list.replaceChildren();const empty=document.createElement("div");empty.className="air-queue-empty";empty.textContent="Adicione faixas pelo Catálogo";list.append(empty);const track=$(".track");if(track){const name=$("strong",track),meta=$("small",track),times=$(".progress span",track),bar=$(".bar",track);if(name)name.textContent="Nenhuma faixa selecionada";if(meta)meta.textContent="Adicione uma faixa à playlist para reproduzir";if(times.length>1){times[0].textContent="00:00";times[1].textContent="00:00"}if(bar){bar.style.background="linear-gradient(90deg,#fa7c13 0%,#14283a 0%)";bar.style.setProperty("--play-progress","0%")}}currentIndex=-1;selectedQueueIndex=-1;return}if(selectedQueueIndex<0||selectedQueueIndex>=tracks.length)selectedQueueIndex=0;if(audio.paused&&currentIndex<0)updateNow(tracks[selectedQueueIndex]);list.replaceChildren();tracks.forEach((item,i)=>{const row=document.createElement("div");row.className="playlist-row";row.tabIndex=0;row.setAttribute("role","button");row.setAttribute("aria-label","Selecionar "+titleOf(item));const icon=categoryIcon(item);const badge=document.createElement("span");badge.className="category-icon "+icon.cls;if(icon.svg)badge.innerHTML=icon.svg;else badge.textContent=icon.text;const info=document.createElement("div");info.className="playlist-info";const title=document.createElement("span");title.className="track-title";const isHourCue=item.__airSpecialType==="Hora Certa";if(isHourCue)title.classList.add("hora-certa-label");const artist=String(item.artist||"").trim();title.textContent=isHourCue?"Hora Certa":titleOf(item)+(artist&&!titleOf(item).toLocaleLowerCase("pt-BR").includes(artist.toLocaleLowerCase("pt-BR"))?" — "+artist:"");const sub=document.createElement("div");sub.className="track-sub";const scheduled=document.createElement("time");scheduled.className="queue-scheduled";scheduled.textContent=plannedAt(tracks,i,item);const duration=document.createElement("span");duration.className="queue-time";duration.textContent=fmt(durationOf(item));const intro=document.createElement("span");intro.className="queue-intro";intro.textContent=introTimeOf(item);const genre=genreInfo(item);const tag=document.createElement("span");tag.className="genre-label genre-"+genre.key;tag.textContent=genre.label;tag.title=genre.label;sub.append(scheduled,duration,intro);sub.insertAdjacentHTML("beforeend",queueStateMarkup(i));if(!isHourCue)sub.append(tag);sub.insertAdjacentHTML("beforeend",queueActionMarkup(item,!!selectedAction));info.append(title,sub);row.append(badge,info);row.addEventListener("click",()=>selectQueueRow(i));row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectQueueRow(i)}});list.append(row)});syncPlaylistRowProgress()}
function addToQueue(item){queue.Playlist.push({...item});activeQueue="Playlist";demoMode=false;localStorage.setItem("playmaster-air-demo-dismissed","1");persist();renderQueue();status.textContent="Adicionada à playlist."}
function deleteQueueTrack(index){const list=queue.Playlist,item=list[index];if(!item)return;const wasCurrent=index===currentIndex;if(wasCurrent){cancelPlaybackWatchdog();cancelFade();audio.pause();audio.removeAttribute("src");audio.load();audio.loop=false;transportLoopItem=null;playbackPaused=false;pauseResumePending=false;currentIndex=-1;if(loopButton){loopButton.classList.remove("is-active");loopButton.setAttribute("aria-pressed","false")}setMainPlayState(false)}else if(index<currentIndex)currentIndex--;if(selectedQueueIndex>index)selectedQueueIndex--;else if(selectedQueueIndex===index)selectedQueueIndex=Math.min(index,list.length-2);list.splice(index,1);if(!list.length){currentIndex=-1;selectedQueueIndex=-1}else if(selectedQueueIndex<0)selectedQueueIndex=Math.min(index,list.length-1);persist();renderQueue();refreshOnAir()}
function playHourCueSegment(item,segmentIndex){const part=segmentList(item)[segmentIndex];if(!part?.id)return;currentSegmentIndex=segmentIndex;playbackPaused=false;audio.pause();audio.loop=false;audio.volume=Number(part.__airGain??1);audio.src="/api/library/"+encodeURIComponent(part.id)+"/audio";audio.load();const request=audio.play();if(request&&typeof request.catch==="function")request.catch(error=>{void showPlaybackError(error,item);renderQueue()})}
function nextTrack(){const list=queue.Playlist;const endedItem=currentIndex>=0?list[currentIndex]:null;const parts=segmentList(endedItem);if(audio.ended&&endedItem?.__airSequence&&currentSegmentIndex+1<parts.length){playHourCueSegment(endedItem,currentSegmentIndex+1);return}if(audio.ended&&endedItem?.__airSequence&&endedItem.__airLoop){playHourCueSegment(endedItem,0);return}if(audio.ended&&endedItem?.__airPauseAfter){playbackPaused=true;pauseResumePending=true;selectedQueueIndex=currentIndex;audio.loop=false;transportLoopItem=null;if(loopButton){loopButton.classList.remove('is-active');loopButton.setAttribute('aria-pressed','false')}renderQueue();return}if(currentIndex>=0&&!audio.ended&&!audio.paused&&audio.currentTime>0){const item=list[currentIndex];const id=String(item?.id??titleOf(item||{}));skippedTrackIds.add(id);playedTrackIds.delete(id)}if(audio.ended&&currentIndex===13&&list.length>14){list.splice(0,14);currentIndex=-1;selectedQueueIndex=0;persist();renderQueue();playIndex(0);return}if(currentIndex+1<list.length)playIndex(currentIndex+1);else{setLoop(false);audio.pause();audio.volume=1;currentIndex=-1;currentSegmentIndex=0;renderQueue()}}
function setQueue(){activeQueue="Playlist";renderQueue()}
function ensureTabs(){document.querySelector(".air-queue-tabs")?.remove();renderQueue()}
function openCatalog(){overlay.hidden=false;loadCategory(catalogCategory)}
async function allHourCueAssets(){const collected=[],seen=new Set();let offset=0;for(let page=0;page<20;page++){const data=await json("/api/library?category="+encodeURIComponent("Hora Certa")+"&limit=500&offset="+offset);const items=Array.isArray(data.items)?data.items:[];let added=0;for(const item of items){const key=String(item.id??item.fileName??item.name??JSON.stringify(item));if(seen.has(key))continue;seen.add(key);collected.push(item);added++}const total=Number(data.total??data.totalCount??data.pagination?.total??0);if(!items.length||added===0||items.length<500||(total&&collected.length>=total))break;offset+=items.length}return collected}
async function refreshHourCueVoiceOptions(){
  hourCueVoiceSelect.replaceChildren(new Option("Carregando vozes…",""));
  hourCueVoiceStatus.textContent="Buscando as pastas de voz da categoria Hora Certa…";
  airVoiceMenu.querySelector(".air-voice-menu").classList.remove("needs-login");
  try{
    if(!sessionOk&&!await checkSession())throw new Error("Faça login pelo Catálogo para carregar as vozes.");
    const items=await allHourCueAssets();
    const voices=[...new Set(items.filter(item=>!hourAssetIsSignal(item)).map(item=>String(item.subcategory||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR",{numeric:true,sensitivity:"base"}));
    hourCueVoiceSelect.replaceChildren(new Option("Selecione uma voz…",""));
    for(const voice of voices)hourCueVoiceSelect.add(new Option(voice,voice));
    if(!voices.length){selectedHourCueVoice="";window.playmasterAirSettings.hourCueVoice="";hourCueVoiceStatus.textContent="Nenhuma pasta de voz encontrada. Organize os arquivos em Hora Certa / Voz Masc. 01 (ou outra voz) no Auto Import.";return}
    if(!voices.includes(selectedHourCueVoice))selectedHourCueVoice=voices.find(voice=>/mascul/i.test(voice))||(voices.length===1?voices[0]:"");
    hourCueVoiceSelect.value=selectedHourCueVoice;
    window.playmasterAirSettings.hourCueVoice=selectedHourCueVoice;
    if(selectedHourCueVoice)localStorage.setItem(hourCueVoiceStorageKey,selectedHourCueVoice);else localStorage.removeItem(hourCueVoiceStorageKey);
    hourCueVoiceStatus.textContent=selectedHourCueVoice?"Voz selecionada: "+selectedHourCueVoice:"Escolha a voz que o Air usará para a Hora Certa.";
  }catch(error){hourCueVoiceSelect.replaceChildren(new Option("Voz indisponível",""));hourCueVoiceStatus.textContent=error.message;airVoiceMenu.querySelector(".air-voice-menu").classList.add("needs-login")}
}
hourCueVoiceSelect.addEventListener("change",()=>{selectedHourCueVoice=hourCueVoiceSelect.value;window.playmasterAirSettings.hourCueVoice=selectedHourCueVoice;try{if(selectedHourCueVoice)localStorage.setItem(hourCueVoiceStorageKey,selectedHourCueVoice);else localStorage.removeItem(hourCueVoiceStorageKey)}catch{}hourCueVoiceStatus.textContent=selectedHourCueVoice?"Voz selecionada: "+selectedHourCueVoice:"Selecione uma voz para a Hora Certa.";if(catalogCategory==="Hora Certa")renderCatalog()});
airVoiceMenu.addEventListener("click",event=>{if(event.target===airVoiceMenu||event.target.closest("[data-close]"))airVoiceMenu.hidden=true;if(event.target.closest(".air-voice-menu-catalog")){airVoiceMenu.hidden=true;openCatalog()}});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!airVoiceMenu.hidden)airVoiceMenu.hidden=true});
document.querySelectorAll(".toolbar .tool").forEach(button=>{if($("span",button)?.textContent.trim()==="Menu")button.addEventListener("click",()=>{airVoiceMenu.hidden=false;void refreshHourCueVoiceOptions()})});
const staticPlaylist=$(".playlist-list");staticPlaylist?.addEventListener("click",event=>{if(!demoMode||queue.Playlist.length)return;if(event.target.closest(".playlist-row"))event.preventDefault()});
const toolbarActions=new Set(["Pause","Loop","Excluir","Cue","Hora Certa","Temperatura","Mover faixa"]);$$(".tool").forEach(el=>{const label=$("span",el)?.textContent.trim();if(label==="Catálogo")el.addEventListener("click",openCatalog)});document.addEventListener("click",event=>{const tool=event.target?.closest?.(".toolbar .tool");if(!tool)return;const label=$("span",tool)?.textContent.trim();if(!toolbarActions.has(label))return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(label==="Loop"){loopSelectionMode=!loopSelectionMode;pauseSelectionMode=false;selectedAction=null;delete document.body.dataset.armedQueueAction;persist();renderQueue();syncStaticQueueActions();window.dispatchEvent(new CustomEvent("playmaster:queue-action-consumed"));return}if(label==="Pause"){pauseSelectionMode=!pauseSelectionMode;loopSelectionMode=false;selectedAction=null;delete document.body.dataset.armedQueueAction;persist();renderQueue();syncStaticQueueActions();window.dispatchEvent(new CustomEvent("playmaster:queue-action-consumed"));return}loopSelectionMode=false;pauseSelectionMode=false;const removeAll=selectedAction===label;selectedAction=removeAll?null:label;delete document.body.dataset.armedQueueAction;queue.Playlist.forEach(item=>{if(removeAll)delete item.__airQueueAction;else item.__airQueueAction=label});document.querySelectorAll(".playlist-row").forEach(row=>{if(removeAll)delete row.dataset.airQueueAction;else row.dataset.airQueueAction=label});persist();renderQueue();syncStaticQueueActions();window.dispatchEvent(new CustomEvent("playmaster:queue-action-consumed"))},true);document.addEventListener("click",event=>{const icon=event.target?.closest?.(".playlist-row .queue-action.action-loop");if(!icon||!loopSelectionMode)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const row=icon.closest(".playlist-row"),rows=Array.from(document.querySelectorAll(".playlist-row")),index=rows.indexOf(row),item=queue.Playlist[index];if(!item)return;item.__airLoop=!item.__airLoop;if(index===currentIndex){audio.loop=Boolean(item.__airLoop);transportLoopItem=audio.loop?item:null;if(loopButton){loopButton.classList.toggle("is-active",audio.loop);loopButton.setAttribute("aria-pressed",String(audio.loop))}}persist();renderQueue()},true);document.addEventListener("click",event=>{const icon=event.target?.closest?.(".playlist-row .queue-action.action-pause");if(!icon||!pauseSelectionMode)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const row=icon.closest(".playlist-row"),rows=Array.from(document.querySelectorAll(".playlist-row")),index=rows.indexOf(row),item=queue.Playlist[index];if(!item)return;item.__airPauseAfter=!item.__airPauseAfter;persist();renderQueue()},true);document.addEventListener("click",event=>{const icon=event.target?.closest?.(".playlist-row .queue-action.action-delete");if(!icon)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const row=icon.closest(".playlist-row"),rows=Array.from(document.querySelectorAll(".playlist-row")),index=rows.indexOf(row);if(index<0)return;deleteQueueTrack(index)},true);

document.addEventListener("click",event=>{const icon=event.target?.closest?.(".playlist-row .queue-action.action-clock");if(!icon)return;const row=icon.closest(".playlist-row"),rows=Array.from(document.querySelectorAll(".playlist-row")),index=rows.indexOf(row);if(index<0)return;if(selectedAction!=="Hora Certa"&&row.dataset.airQueueAction!=="Hora Certa")return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();void addHourCueAt(index)},true);
const hourCuePlaylistStyle=document.createElement("style");hourCuePlaylistStyle.textContent=".playlist-row .track-title.hora-certa-label{color:#b76cff!important;font-weight:700!important}";document.head.append(hourCuePlaylistStyle);
function hourAssetText(item){return [titleOf(item),item?.fileName,item?.filename,item?.originalName,item?.originalFileName,item?.sourceName,item?.sourceFileName,item?.folder,item?.folderName,item?.path,item?.subcategory,item?.metadata?.name,item?.metadata?.fileName,item?.metadata?.originalName].filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").replace(/[_-]+/g," ")}
function hourAssetIsSignal(item){return /(?:^|\b)(?:sinais?|signal)(?:\b|$)/i.test(hourAssetText(item))}
function spokenNumber(text){const words=String(text).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").match(/[a-z]+/g)||[];const nums={zero:0,oh:0,um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10,onze:11,doze:12,treze:13,quatorze:14,catorze:14,quinze:15,dezesseis:16,dezessete:17,dezoito:18,dezenove:19};const tens={vinte:20,trinta:30,quarenta:40,cinquenta:50};for(let i=0;i<words.length;i++){if(tens[words[i]]){let value=tens[words[i]];if(words[i+1]==="e"&&nums[words[i+2]]>0&&nums[words[i+2]]<10)value+=nums[words[i+2]];return value}if(nums[words[i]]!==undefined)return nums[words[i]]}return null}
function numberForUnit(item,unit){const text=hourAssetText(item),unitWord=unit==="hour"?"horas?":"minutos?";const wordMatch=text.match(new RegExp("([a-z]+(?:\\s+e\\s+[a-z]+)?)\\s+"+unitWord+"\\b"));if(wordMatch){const n=spokenNumber(wordMatch[1]);if(n!==null)return n}const patterns=unit==="hour"?[/\b(?:hora|horas)\s*0*(\d{1,2})\b/,/\b0*(\d{1,2})\s*horas?\b/,/\bhora\s*0*(\d{1,2})\b/]:[/\b(?:minuto|minutos)\s*0*(\d{1,2})\b/,/\b0*(\d{1,2})\s*minutos?\b/];for(const pattern of patterns){const m=text.match(pattern);if(m)return Number(m[1])}return null}
function hourAssetIsWhole(item){return /\bhoras?\s*cheias?\b|\bhora\s*completa\b|\bwhole\s*hour\b/i.test(hourAssetText(item))}
function findHourAsset(items,unit,value,whole){return items.find(item=>!hourAssetIsSignal(item)&&numberForUnit(item,unit)===value&&(!whole||hourAssetIsWhole(item)))||null}
function exactHourAsset(items,hour,minute){const minuteText=String(minute).padStart(2,"0"),hours=[...new Set([hour,(hour%12)||12])];return items.find(item=>{const name=[titleOf(item),item?.fileName,item?.originalFileName,item?.sourceFileName].filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[_-]+/g," ");return hours.some(value=>{const h=String(value),padded=h.padStart(2,"0"),timePattern=new RegExp("(?:^|\\D)(?:"+padded+"|"+h+")[:h .]?"+minuteText+"(?:\\D|$)"),compactPattern=new RegExp("(?:^|\\D)(?:"+padded+"|"+h+")"+minuteText+"(?:\\D|$)");return timePattern.test(name)||compactPattern.test(name)||numberForUnit(item,"hour")===value&&numberForUnit(item,"minute")===minute})})||null}

async function addHourCueAt(index){
  const list=queue.Playlist;
  if(index<0||index>=list.length)return;
  const scheduled=plannedAt(list,index,list[index]);
  const match=scheduled.match(/^(\d{2}):(\d{2})/);
  if(!match){showPlaybackNotice("Não consegui calcular o horário previsto para inserir a Hora Certa.");return}
  if(!sessionOk&&!await checkSession()){showPlaybackNotice("Conecte o Auto Import pelo Catálogo para carregar a Hora Certa.");return}
  if(!selectedHourCueVoice)await refreshHourCueVoiceOptions();
  if(!selectedHourCueVoice){showPlaybackNotice("Escolha a voz da Hora Certa no Menu do Air antes de inserir.");return}
  try{
    const allAssets=await allHourCueAssets();
    const voiceAssets=allAssets.filter(item=>String(item.subcategory||"").trim()===selectedHourCueVoice&&!hourAssetIsSignal(item));
    const unassignedAssets=allAssets.filter(item=>!String(item.subcategory||"").trim()&&!hourAssetIsSignal(item));
    const candidates=voiceAssets.length?voiceAssets:unassignedAssets;
    if(!candidates.length){showPlaybackNotice("Não encontrei arquivos de voz para "+selectedHourCueVoice+" em Hora Certa.");return}
    const [hour,minute]=match.slice(1).map(Number);
    const voiceClip=exactHourAsset(candidates,hour,minute);
    if(!voiceClip){showPlaybackNotice("Não encontrei o arquivo completo de Hora Certa para "+String(hour).padStart(2,"0")+":"+String(minute).padStart(2,"0")+" na voz "+selectedHourCueVoice+".");return}
    const sequence=[];
    const signal=allAssets.find(hourAssetIsSignal);
    if(signal)sequence.push({...signal,__airGain:.35});
    sequence.push(voiceClip);
    const original=list[index];
    const hourCue={...voiceClip,id:"air-hour-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),title:"Hora Certa",name:"Hora Certa",artist:"",category:"Hora Certa",subcategory:selectedHourCueVoice,duration:sequence.reduce((sum,part)=>sum+rawDuration(part),0),__airSpecialType:"Hora Certa",__airSequence:sequence};
    list.splice(index,0,hourCue);
    if(currentIndex>=index)currentIndex++;
    selectedQueueIndex=index;
    selectedAction=null;
    for(const item of list)if(item.__airQueueAction==="Hora Certa")delete item.__airQueueAction;
    delete document.body.dataset.armedQueueAction;
    persist();renderQueue();
    showPlaybackNotice("Hora Certa inserida antes de "+titleOf(original)+", prevista para "+scheduled+".");
    window.dispatchEvent(new CustomEvent("playmaster:queue-action-consumed"));
  }catch(error){showPlaybackNotice("Não foi possível inserir a Hora Certa: "+(error?.message||"falha ao carregar o áudio."))}
}

document.addEventListener("click",event=>{
  const icon=event.target?.closest?.(".playlist-row .queue-action.action-clock");
  if(!icon)return;
  const row=icon.closest(".playlist-row"),rows=Array.from(document.querySelectorAll(".playlist-row")),index=rows.indexOf(row);
  if(index<0)return;
  const item=queue.Playlist[index];
  if(selectedAction!=="Hora Certa"&&item?.__airQueueAction!=="Hora Certa")return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  void addHourCueAt(index);
},true);

const cueAudio=new Audio();cueAudio.preload="metadata";cueAudio.playsInline=true;cueAudio.setAttribute("playsinline","");cueAudio.setAttribute("webkit-playsinline","");
const cueHost=document.querySelector(".column.center")||document.body;if(cueHost!==document.body&&getComputedStyle(cueHost).position==="static")cueHost.style.position="relative";
const cueOverlay=document.createElement("div");cueOverlay.className="air-cue-overlay";cueOverlay.hidden=true;cueOverlay.innerHTML='<section class="air-cue-dialog" role="dialog" aria-modal="true" aria-label="Pré-escuta Cue"><header><strong>PRÉ-ESCUTA · CUE</strong><button type="button" data-cue-close aria-label="Fechar">×</button></header><div class="air-cue-title"></div><div class="air-cue-meta"></div><div class="air-cue-controls"><button type="button" class="air-cue-play" aria-label="Play"></button><button type="button" class="air-cue-stop" aria-label="Stop"></button><button type="button" class="air-cue-pause" aria-label="Pause"></button><div class="air-cue-summary"><small>DECORRIDO / TOTAL</small><span><b class="air-cue-elapsed">00:00</b><i> / </i><b class="air-cue-duration">00:00</b></span></div></div><input class="air-cue-seek" type="range" min="0" max="100" value="0" aria-label="Progresso do áudio"><div class="air-cue-times"><span class="air-cue-time-current">00:00</span><span class="air-cue-time-remaining">RESTANTE 00:00</span></div></section>';cueHost.append(cueOverlay);
const cueTitle=$(".air-cue-title",cueOverlay),cueMeta=$(".air-cue-meta",cueOverlay),cueSeek=$(".air-cue-seek",cueOverlay),cueElapsed=$(".air-cue-elapsed",cueOverlay),cueDuration=$(".air-cue-duration",cueOverlay),cueCurrent=$(".air-cue-time-current",cueOverlay),cueRemaining=$(".air-cue-time-remaining",cueOverlay),cuePlayButton=$(".air-cue-play",cueOverlay);
let cueItem=null;
const updateCueDisplay=()=>{const mediaDuration=cueAudio.duration;const total=Number.isFinite(mediaDuration)&&mediaDuration>0?mediaDuration:durationOf(cueItem);const current=cueAudio.currentTime||0;cueSeek.max=String(Math.max(1,total||100));cueSeek.value=String(Math.min(current,total||100));const progress=total?Math.min(100,current/total*100):0;cueSeek.style.background="linear-gradient(90deg,#ff8618 0 "+progress+"%,#142d3e "+progress+"%)";cueElapsed.textContent=fmt(current);cueDuration.textContent=fmt(total);cueCurrent.textContent=fmt(current);cueRemaining.textContent="RESTANTE "+fmt(Math.max(0,total-current));cuePlayButton.setAttribute("aria-label","Play")};
const closeCue=()=>{cueAudio.pause();cueAudio.currentTime=0;cueOverlay.hidden=true;updateCueDisplay()};
const openCue=item=>{if(!item?.id){showPlaybackNotice("Não foi possível abrir o Cue: esta faixa não possui arquivo de áudio associado.");return}cueItem=item;cueTitle.textContent=titleOf(item);cueMeta.textContent=[item.artist,item.category||"Músicas","Saída principal"].filter(Boolean).join(" · ");cueAudio.pause();cueAudio.src="/api/library/"+encodeURIComponent(item.id)+"/audio";cueAudio.load();cueOverlay.hidden=false;updateCueDisplay()};
cueOverlay.addEventListener("click",event=>{if(event.target===cueOverlay||event.target.closest("[data-cue-close]"))closeCue()});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!cueOverlay.hidden)closeCue()});
cuePlayButton.addEventListener("click",()=>{if(cueAudio.paused){const request=cueAudio.play();if(request&&typeof request.catch==="function")request.catch(error=>{showPlaybackNotice("Falha ao reproduzir a pré-escuta: "+(error?.message||"erro de áudio"))})}updateCueDisplay()});
$(".air-cue-stop",cueOverlay).addEventListener("click",()=>{cueAudio.pause();cueAudio.currentTime=0;updateCueDisplay()});
$(".air-cue-pause",cueOverlay).addEventListener("click",()=>{cueAudio.pause();updateCueDisplay()});
cueSeek.addEventListener("input",()=>{if(Number.isFinite(cueAudio.duration)&&cueAudio.duration>0)cueAudio.currentTime=Number(cueSeek.value);updateCueDisplay()});
["timeupdate","loadedmetadata","durationchange","play","pause","ended"].forEach(name=>cueAudio.addEventListener(name,updateCueDisplay));
setInterval(()=>{if(!cueOverlay.hidden)updateCueDisplay()},250);
document.addEventListener("click",event=>{const icon=event.target?.closest?.(".playlist-row .queue-action.action-cue");if(!icon)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const row=icon.closest(".playlist-row"),rows=Array.from(document.querySelectorAll(".playlist-row")),index=rows.indexOf(row);if(index>=0)openCue(queue.Playlist[index])},true);
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
audio.addEventListener("timeupdate",updateProgress);audio.addEventListener("loadedmetadata",updateProgress);audio.addEventListener("ended",()=>{if(currentIndex>=0){const item=queue[activeQueue][currentIndex],parts=segmentList(item);if(!item?.__airSequence||currentSegmentIndex>=parts.length-1)playedTrackIds.add(String(item?.id??titleOf(item||{})))}nextTrack()});setInterval(updateAirTimers,100);updateAirTimers();

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
