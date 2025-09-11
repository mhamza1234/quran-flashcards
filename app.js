/* ===============================
   Quran Flashcards — UI strict
   =============================== */

let manifest = [];
let deck = null;
let wordsFlat = [];
let idx = 0;
let mode = "sequential";
let features = { audio:false, tajweed:false };
let currentLayout = "full-centered-wbw";

const $  = id => document.getElementById(id);
const el = sel => document.querySelector(sel);

const selSurah = $('surahSelect');
const selMode  = $('modeSelect');
const quick    = $('quickSearch');
const quickGo  = $('quickGo');

const errorBanner = $('errorBanner');

const ayahArabic = $('ayahArabic');
const ayahBangla = $('ayahBangla');

const wordId      = $('wordId');
const frontArabic = $('frontArabicWord');
const frontBangla = $('frontBanglaMeaning');
const frontRoot   = $('frontRoot');
const frontRootM  = $('frontRootMeaning');
const frontDerivM = $('frontDerivationMethod');

const audioBtn = $('audioBtn');
const tajBlock = $('tajBlock');
const tajSummary = $('tajSummary');
const tajList = $('tajList');
const tajExample = $('tajExample');
const exAr = $('exArabic');
const exBn = $('exBangla');

const backHost = $('backHost');

const card = $('card');
const posText = $('positionText');

const btnFirst = $('firstBtn');
const btnPrev  = $('prevBtn');
const btnFlip  = $('flipBtn');
const btnNext  = $('nextBtn');
const btnLast  = $('lastBtn');

init();

async function init(){
  try{
    await loadManifest();
    await loadSelectedDeck();
  }catch(e){ showError(e.message||String(e)); }

  selMode.addEventListener('change', ()=> mode=selMode.value );
  selSurah.addEventListener('change', loadSelectedDeck);
  quickGo.addEventListener('click', onQuickGo);
  quick.addEventListener('keydown', e=>{ if(e.key==='Enter') onQuickGo(); });

  btnFirst.addEventListener('click', ()=>{ idx=0; render(); });
  btnLast .addEventListener('click', ()=>{ idx=Math.max(0,wordsFlat.length-1); render(); });
  btnPrev .addEventListener('click', prev);
  btnNext .addEventListener('click', next);
  btnFlip .addEventListener('click', ()=> card.classList.toggle('show-back'));

  document.addEventListener('keydown', e=>{
    if(e.key==='ArrowRight') next();
    if(e.key==='ArrowLeft') prev();
    if(e.key.toLowerCase()==='f') card.classList.toggle('show-back');
  });
}

async function loadManifest(){
  clearError();
  const res = await fetch('data/manifest.json', {cache:'no-store'});
  if(!res.ok) throw new Error('Could not load manifest.json');
  manifest = await res.json();
  selSurah.innerHTML = manifest.map(m =>
    `<option value="${m.filename}">${m.display || m.name_bn || m.name_ar || m.id}</option>`
  ).join('');
}

async function loadSelectedDeck(){
  clearError();
  const filename = selSurah.value || (manifest[0] && manifest[0].filename);
  const man = (manifest||[]).find(m=>m.filename===filename) || {};
  applyLayout(man.layout, man.features, man.defaultFace);

  const res = await fetch(`data/${filename}`, {cache:'no-store'});
  if(!res.ok){
    wordsFlat=[]; deck=null; idx=0; hardClear();
    showError(`Failed to load ${filename} (${res.status}).`);
    return;
  }
  deck = await res.json();
  const ui = deck.ui || {};
  applyLayout(ui.layout || man.layout, Object.assign({}, man.features||{}, ui.features||{}), ui.defaultFace || man.defaultFace);

  // flatten
  wordsFlat=[];
  (deck.ayats||[]).forEach((a,ai)=>{
    (a.words||[]).forEach((w,wi)=> wordsFlat.push({a,w,ai,wi}));
  });
  idx=0;
  render();
}

function applyLayout(layout, feats={}, defaultFace){
  currentLayout = layout || 'full-centered-wbw';
  features = Object.assign({audio:false,tajweed:false}, feats);

  document.body.classList.remove('layout-full','layout-audio');
  if(currentLayout==='tajweed-audio-with-tabs') document.body.classList.add('layout-audio');
  else document.body.classList.add('layout-full');

  if(typeof defaultFace==='string'){
    card.classList.toggle('show-back', defaultFace==='back');
  }
}

/* Nav helpers */
function prev(){
  if(!wordsFlat.length) return;
  if(mode==='random') idx=Math.floor(Math.random()*wordsFlat.length);
  else idx=Math.max(0,idx-1);
  render();
}
function next(){
  if(!wordsFlat.length) return;
  if(mode==='random') idx=Math.floor(Math.random()*wordsFlat.length);
  else idx=Math.min(wordsFlat.length-1,idx+1);
  render();
}

function onQuickGo(){
  const v=(quick.value||'').trim();
  const m=v.match(/^(\d+)[:.](\d+)(?:[:.](\d+))?$/);
  if(!m||!wordsFlat.length) return;
  const s=+m[1], a=+m[2], w=m[3]?+m[3]:null;
  const i=wordsFlat.findIndex(x=>{
    const [ss,aa]=(x.a.ayah_id||'').split(':').map(Number);
    if(ss!==s||aa!==a) return false;
    if(w==null) return true;
    const wi=+(String(x.w.word_id||'0:0:0').split(':')[2]||0);
    return wi===w;
  });
  if(i>=0){ idx=i; render(); }
}

/* RENDER */
function render(){
  if(!wordsFlat.length){ hardClear(); return; }

  const {a,w,wi}=wordsFlat[idx];
  ayahArabic.textContent = a.arabic || '﴿ ﴾';
  ayahBangla.textContent = a.bangla || '—';
  posText.textContent = `${idx+1} / ${wordsFlat.length}`;

  // front (both layouts share same top; tajweed/audio hidden by CSS for full)
  wordId.textContent = `${a.ayah_id}:${(wi||0)+1}`;
  frontArabic.textContent = w.arabic_word || '—';
  frontBangla.textContent = w.bangla_meaning || '—';
  frontRoot.textContent   = w.root || '';
  frontRootM.textContent  = w.rootMeaning || '';
  frontDerivM.textContent = w.derivationMethod || '';

  // Audio/Tajwid visibility
  if(currentLayout==='tajweed-audio-with-tabs'){
    if(features.audio) audioBtn.classList.remove('hidden'); else audioBtn.classList.add('hidden');
    if(features.tajweed && w.tajweed && (w.tajweed.summary || (w.tajweed.rules||[]).length)){
      tajBlock.classList.remove('hidden');
      tajSummary.textContent = w.tajweed.summary || '';
      tajList.innerHTML = (w.tajweed.rules||[]).map(r=>`<div class="taj-row"><b>${r.title||''}</b> — ${r.text||''}</div>`).join('');
      if(w.tajweed.example && (w.tajweed.example.ar || w.tajweed.example.bn)){
        tajExample.classList.remove('hidden');
        exAr.textContent = w.tajweed.example.ar || '';
        exBn.textContent = w.tajweed.example.bn || '';
      }else{
        tajExample.classList.add('hidden');
        exAr.textContent = exBn.textContent = '';
      }
    }else{
      tajBlock.classList.add('hidden');
      tajSummary.textContent=''; tajList.innerHTML=''; tajExample.classList.add('hidden');
    }
  }else{
    audioBtn.classList.add('hidden');
    tajBlock.classList.add('hidden');
    tajSummary.textContent=''; tajList.innerHTML=''; tajExample.classList.add('hidden');
  }

  // back
  if(currentLayout==='tajweed-audio-with-tabs'){
    renderBackTabs(a, w);
  }else{
    renderBackWbw(a);
  }
}

function renderBackWbw(a){
  backHost.innerHTML = (a.words||[]).map(w=>`
    <div class="wbw-row">
      <div class="d-ar big" dir="rtl">${w.arabic_word||''}</div>
      <div class="d-bn">${w.bangla_meaning||''}</div>
    </div>
  `).join('') || `<div class="muted" style="text-align:center">—</div>`;
}

function renderBackTabs(a,w){
  backHost.innerHTML = `
    <div class="tabbar">
      <button id="tabDerived" class="btn gold">Derived Words</button>
      <button id="tabWbw" class="btn">Word-by-Word</button>
    </div>
    <div id="tabBody"></div>
  `;
  const body = $('tabBody');
  const btnA = $('tabDerived'), btnB = $('tabWbw');

  const showDerived = ()=>{ btnA.classList.add('gold'); btnB.classList.remove('gold'); body.innerHTML = buildDerived(a,w); };
  const showWbw     = ()=>{ btnB.classList.add('gold'); btnA.classList.remove('gold'); body.innerHTML = buildWbw(a); };

  btnA.onclick = showDerived;
  btnB.onclick = showWbw;
  showDerived();
}

function buildWbw(a){
  return (a.words||[]).map(w=>`
    <div class="wbw-row">
      <div class="d-ar big" dir="rtl">${w.arabic_word||''}</div>
      <div class="d-bn">${w.bangla_meaning||''}</div>
    </div>
  `).join('');
}

function stripTashkeel(s=''){ return s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,''); }

function buildDerived(a,w){
  const main = stripTashkeel(w.arabic_word||'');
  const list = (Array.isArray(w.quranicDerivations)?w.quranicDerivations:[])
    .filter(d => stripTashkeel(d.arabic||'') !== main);

  if(!list.length) return `<div class="muted" style="text-align:center">No related forms.</div>`;

  return list.map(d=>{
    const morph = d.derivationMethod ? `<span class="badge-morph">(${d.derivationMethod})</span>` : '';
    const ex = (d.exampleArabic||d.exampleBangla)
      ? `<div class="ex-line"><span dir="rtl">${d.exampleArabic||''}</span><span>${d.exampleBangla||''}</span></div>` : '';
    const occ = (d.occurrences||[]).map(o=>o.ayah_id).join(', ');
    return `
      <div class="deriv-row">
        <div class="d-ar big" dir="rtl">${d.arabic||''}${morph}</div>
        <div class="d-bn">${d.meaning||''}</div>
        ${occ?`<div class="d-meta">${occ}</div>`:''}
        ${ex}
      </div>
    `;
  }).join('');
}

function hardClear(){
  ayahArabic.textContent='﴿ ﴾';
  ayahBangla.textContent='—';
  [frontArabic,frontBangla,frontRoot,frontRootM,frontDerivM].forEach(n=>n.textContent='');
  wordId.textContent='—';
  backHost.innerHTML='';
  posText.textContent='0 / 0';
}

function showError(msg){ errorBanner.textContent=msg; errorBanner.classList.remove('hidden'); }
function clearError(){ errorBanner.textContent=''; errorBanner.classList.add('hidden'); }
