(()=> {
"use strict";
const CATEGORIES=["Músicas","Comerciais","Vinhetas","Intercons","Trilhas","Chamadas","Locução","Hora Certa","Temperatura","Outros"];
const key="playmaster-air-queues-v1";
const queue={Músicas:[],Comerciais:[]};
let activeQueue="Músicas",currentIndex=-1,sessionOk=false,catalogCategory="Músicas",catalogItems=[];
const audio=new Audio();audio.preload="none";audio.playsInline=true;audio.setAttribute("playsinline","");
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const titleOf=x=>x?.title||x?.fileName||x?.name||"Áudio";
const durationOf=x=>Math.max(0,Number(x?.duration)||0);
const fmt=n=>{n=Math.floor(Math.max(0,Number(n)||0));return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")};
const persist=()=>localStorage.setItem(key,JSON.stringify(queue));
try{const saved=JSON.parse(localStorage.getItem(key)||"{}");for(const k of ["Músicas","Comerciais"])if(Array.isArray(saved[k]))queue[k]=saved[k]}catch{}
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
function renderCatalog(){files.replaceChildren();const q=search.value.trim().toLocaleLowerCase("pt-BR");const list=catalogItems.filter(x=>[titleOf(x),x.artist].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(q)));if(!list.length){const p=document.createElement("p");p.className="air-catalog-empty";p.textContent=sessionOk?"Nenhum áudio nesta categoria.":"Faça login para carregar o catálogo.";files.append(p);return}for(const item of list){const row=document.createElement("article");row.className="air-catalog-row";const info=document.createElement("div");info.innerHTML='<strong>'+esc(titleOf(item))+'</strong><small>'+esc(item.artist||item.category||"")+' · '+fmt(durationOf(item))+'</small>';const add=document.createElement("button");add.type="button";add.textContent="Adicionar à "+(item.category==="Comerciais"?"Comerciais":"Músicas");add.addEventListener("click",()=>addToQueue(item));row.append(info,add);files.append(row)}}
async function loadCategory(c){catalogCategory=c;catNav.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.category===c));search.value="";status.textContent="Carregando "+c+"…";try{if(!sessionOk&&!await checkSession()){catalogItems=[];status.textContent="Sessão do Auto Import necessária.";renderCatalog();return}const d=await json("/api/library?category="+encodeURIComponent(c)+"&limit=500&offset=0");catalogItems=(d.items||[]).map(x=>({...x,category:x.category||c}));status.textContent=catalogItems.length+" arquivo(s)";renderCatalog()}catch(e){catalogItems=[];status.textContent=e.message;renderCatalog()}}
catNav.addEventListener("click",e=>{const b=e.target.closest("button[data-category]");if(b)loadCategory(b.dataset.category)});
search.addEventListener("input",renderCatalog);
function updateNow(item){const track=$(".track");if(!track)return;const name=$("strong",track),meta=$("small",track),times=$$(".progress span",track);if(name)name.textContent=titleOf(item);if(meta)meta.textContent=(item.artist||"")+" • "+(item.category||"Áudio")+" • Playlist "+(item.category==="Comerciais"?"Comerciais":"Músicas");if(times.length>1)times[1].textContent=fmt(item.duration);updateProgress()}
function $$(s,r=document){return [...r.querySelectorAll(s)]}
function updateAirTimers(){const introCard=$("#introTimerCard"),introLabel=$("#introTimerLabel"),introValue=$("#introTimerValue"),progressiveValue=$("#progressiveTimerValue");if(!introCard||!introLabel||!introValue||!progressiveValue)return;const hasTrack=currentIndex>=0&&Boolean(queue[activeQueue][currentIndex]);const elapsed=hasTrack?(audio.currentTime||0):0;const duration=hasTrack?(Number.isFinite(audio.duration)?audio.duration:durationOf(queue[activeQueue][currentIndex])):0;const inIntro=hasTrack&&elapsed<5;const shown=inIntro?Math.max(0,5-elapsed):Math.max(0,duration-elapsed);introLabel.textContent=inIntro||!hasTrack?"INTRO":"TEMPO REGRESSIVO";introCard.classList.toggle("is-regressive",hasTrack&&!inIntro);introValue.textContent=fmtTenths(shown);progressiveValue.textContent=fmtTenths(elapsed)}
function fmtTenths(seconds){seconds=Math.max(0,Number(seconds)||0);const whole=Math.floor(seconds),minutes=Math.min(99,Math.floor(whole/60)),secs=whole%60,tenth=Math.floor((seconds-whole)*10);return String(minutes).padStart(2,"0")+":"+String(secs).padStart(2,"0")+","+tenth}
function updateProgress(){const track=$(".track");if(track){const total=Number.isFinite(audio.duration)?audio.duration:durationOf(queue[activeQueue][currentIndex]);const current=audio.currentTime||0;const p=total?Math.min(100,current/total*100):0;const bar=$(".bar",track);if(bar){bar.style.background="linear-gradient(90deg,#fa7c13 0 "+p+"%,#14283a "+p+"%)";bar.style.setProperty("--play-progress",p+"%")}const times=$(".progress span",track);if(times.length>1){times[0].textContent=fmt(current);times[1].textContent=fmt(total)}}updateAirTimers()}
async function playIndex(i){const list=queue[activeQueue];if(!list.length)return;currentIndex=(i+list.length)%list.length;const item=list[currentIndex];try{const r=await fetch("/api/library/"+encodeURIComponent(item.id)+"/audio",{credentials:"same-origin",cache:"no-store"});if(!r.ok)throw Error("Não foi possível carregar "+titleOf(item)+" (HTTP "+r.status+").");const blob=await r.blob();if(!blob.size)throw Error("O áudio recebido está vazio.");audio.pause();audio.src=URL.createObjectURL(blob);audio.currentTime=0;await audio.play();updateNow(item);renderQueue();}catch(e){status.textContent=e.message;overlay.hidden=false}}
function renderQueue(){const list=$(".playlist-list");if(!list)return;list.replaceChildren();const tracks=queue[activeQueue];if(!tracks.length){const empty=document.createElement("div");empty.className="air-queue-empty";empty.textContent="Adicione faixas pelo Catálogo";list.append(empty);return}tracks.forEach((item,i)=>{const row=document.createElement("div");row.className="playlist-row";const play=document.createElement("button");play.type="button";play.className="playicon";play.textContent="▶";play.title="Reproduzir";play.addEventListener("click",()=>playIndex(i));const name=document.createElement("span");name.className="name";name.textContent="♫ "+titleOf(item);const time=document.createElement("span");time.className="queue-time";time.textContent=fmt(item.duration);const skip=document.createElement("button");skip.type="button";skip.className="skip";skip.textContent="»";skip.title="Avançar";skip.addEventListener("click",()=>{activeQueue=item.category==="Comerciais"?"Comerciais":"Músicas";playIndex(i+1)});row.append(play,name,time,skip);list.append(row)})}
function addToQueue(item){const bucket=item.category==="Comerciais"?"Comerciais":"Músicas";queue[bucket].push({...item});activeQueue=bucket;persist();renderQueue();status.textContent="Adicionada à playlist "+bucket+"."; }
function nextTrack(){const list=queue[activeQueue];if(currentIndex+1<list.length)playIndex(currentIndex+1);else{audio.pause();currentIndex=-1;renderQueue()}}
function setQueue(c){activeQueue=c;currentIndex=-1;renderQueue();const tabs=$$(".air-queue-tab");tabs.forEach(b=>b.classList.toggle("active",b.dataset.queue===c))}
function ensureTabs(){const section=$(".playlist"),list=$(".playlist-list");if(!section||!list)return;const tabs=document.createElement("div");tabs.className="air-queue-tabs";for(const c of ["Músicas","Comerciais"]){const b=document.createElement("button");b.type="button";b.className="air-queue-tab";b.dataset.queue=c;b.textContent=c;b.addEventListener("click",()=>setQueue(c));tabs.append(b)}list.before(tabs);setQueue(activeQueue)}
function openCatalog(){overlay.hidden=false;loadCategory(catalogCategory)}
$$(".tool").forEach(el=>{if($("span",el)?.textContent.trim()==="Catálogo")el.addEventListener("click",openCatalog)});
const transport=$$(".transport button");transport[0]?.addEventListener("click",()=>{if(currentIndex>=0){audio.currentTime=0;updateProgress()}});
transport[1]?.addEventListener("click",async()=>{if(audio.paused){if(currentIndex<0){if(queue[activeQueue].length)await playIndex(0);else openCatalog()}else await audio.play()}else audio.pause()});
transport[2]?.addEventListener("click",nextTrack);
audio.addEventListener("timeupdate",updateProgress);audio.addEventListener("loadedmetadata",updateProgress);audio.addEventListener("ended",nextTrack);setInterval(updateAirTimers,100);updateAirTimers();

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
function selectMode(mode){
  modeButtons.forEach(button=>{
    const active=button.dataset.mode===mode;
    button.classList.toggle("is-active",active);
    button.setAttribute("aria-pressed",String(active));
  });
  const label=$("#activeModeText");
  if(label)label.textContent=modeNames[mode]||"AUTOMÁTICO";
}
modeButtons.forEach(button=>button.addEventListener("click",()=>selectMode(button.dataset.mode)));
selectMode("A");

const onAirTile=$(".onair");
function refreshOnAir(){
  if(!onAirTile)return;
  const playing=[...document.querySelectorAll("audio")].some(el=>!el.paused&&!el.ended);
  onAirTile.classList.toggle("is-live",playing);
}
function bindAirAudio(el){
  ["play","playing","pause","ended","emptied","timeupdate"].forEach(eventName=>el.addEventListener(eventName,refreshOnAir));
}
document.querySelectorAll("audio").forEach(bindAirAudio);
new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
  if(node.nodeType!==1)return;
  if(node.matches?.("audio"))bindAirAudio(node);
  node.querySelectorAll?.("audio").forEach(bindAirAudio);
}))).observe(document.body,{childList:true,subtree:true});
refreshOnAir();


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
