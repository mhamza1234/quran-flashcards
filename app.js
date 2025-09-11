/* =========================
   Quran Flashcards (v3)
   ========================= */

/* State */
let manifest = [];
let deck = null;            // raw deck JSON
let layout = "full";        // "full" | "audio"
let wordsFlat = [];         // [{ a, w, ai, wi }]
let idx = 0;
let mode = "sequential";

/* DOM helpers */
const $ = (id) => document.getElementById(id);

/* Controls / common */
const selSurah   = $('surahSelect');
const selMode    = $('modeSelect');
const jumpInput  = $('jumpInput');
const goBtn      = $('goBtn');
const errorBanner= $('errorBanner');
const posText    = $('positionText');

/* Ayah header */
const ayahArabic = $('ayahArabic');
const ayahBangla = $('ayahBangla');

/* FRONT */
const frontFace  = $('frontFace');
const crumb      = $('crumb');
const frontArabic= $('frontArabicWord');
const frontBangla= $('frontBanglaMeaning');
const chipRoot   = $('chipRoot');
const chipRootM  = $('chipRootMeaning');
const chipMorph  = $('chipMorph');
const audioBtn   = $('audioBtn');
const tajBlock   = $('tajBlock');
const tajSummary = $('tajSummary');
const tajList    = $('tajList');
const tajExample = $('tajExample');
const exArabic   = $('exArabic');
const exBangla   = $('exBangla');
const frontHint  = $('frontHint');
const ayahAudio  = $('ayahAudio');

/* BACK */
const backFace   = $('backFace');
const backTabs   = $('backTabs');
const tabDeriv   = $('tabDeriv');
const tabWbw     = $('tabWbw');

const rootsPane  = $('rootsPane');
const rootDetails= $('rootDetails');
const rootTxt    = $('rootTxt');
const rootMeaningTxt = $('rootMeaningTxt');
const morphTxt   = $('morphTxt');
const derivTitle = $('derivTitle');
const derivEmpty = $('derivEmpty');
const derivList  = $('derivList');

const wbwPane    = $('wbwPane');
const wbwToolbar = $('wbwToolbar');
const wbwScope   = $('wbwScope');
const wbwList    = $('wbwList');

/* Nav buttons */
const firstBtn   = $('firstBtn');
const prevBtn    = $('prevBtn');
const flipBtn    = $('flipBtn');
const nextBtn    = $('nextBtn');
const lastBtn    = $('lastBtn');

/* Init */
init();

async function init(){
  try{
    await loadManifest();
    hookEvents();
    await loadSelectedDeck();
  }catch(err){
    showError(err?.message || String(err));
  }
}

function hookEvents(){
  selMode.addEventListener('change', ()=> { mode = selMode.value; });

  selSurah.addEventListener('change', loadSelectedDeck);
  goBtn.addEventListener('click', onQuickGo);

  firstBtn.addEventListener('click', ()=> { idx = 0; render(); });
  lastBtn .addEventListener('click', ()=> { idx = Math.max(0, wordsFlat.length-1); render(); });
  prevBtn .addEventListener('click', prev);
  nextBtn .addEventListener('click', next);
  flipBtn .addEventListener('click', flip);

  tabDeriv?.addEventListener('click', ()=>{
    tabDeriv.classList.add('active'); tabWbw.classList.remove('active');
    rootsPane.style.display='block'; wbwPane.style.display='none';
  });
  tabWbw?.addEventListener('click', ()=>{
    tabWbw.classList.add('active'); tabDeriv.classList.remove('active');
    rootsPane.style.display='none'; wbwPane.style.display='block';
    buildWbwList({wholeSurah: wbwScope?.checked ?? false, ayahIdx: currentAyahIndex()});
  });
  wbwScope?.addEventListener('change', ()=>{
    buildWbwList({wholeSurah: wbwScope.checked, ayahIdx: currentAyahIndex()});
  });

  document.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowRight') next();
    if(e.key === 'ArrowLeft')  prev();
    if(e.key.toLowerCase()==='f') flip();
  });

  audioBtn.addEventListener('click', toggleAudio);
}

async function loadManifest(){
  clearError();
  const res = await fetch('data/manifest.json?v=3', {cache:"no-store"});
  if(!res.ok) throw new Error(`Cannot load data/manifest.json (${res.status})`);
  manifest = await res.json();

  selSurah.innerHTML = manifest.map(m =>
    `<option value="${m.filename}" data-layout="${m.layout || 'full'}">${m.display || m.name_bn || m.id}</option>`
  ).join('');
}

async function loadSelectedDeck(){
  clearError();
  const opt = selSurah.selectedOptions[0];
  const filename = opt?.value || manifest?.[0]?.filename;
  layout = opt?.dataset?.layout || manifest?.[0]?.layout || 'full';

  const res = await fetch(`data/${filename}?v=3`, {cache:"no-store"});
  if(!res.ok){
    showError(`Failed to load ${filename} (${res.status}).`);
    deck = null; wordsFlat = []; idx=0; render();
    return;
  }
  deck = await res.json();
  // flatten words
  wordsFlat = [];
  (deck.ayats || []).forEach((a, ai)=>{
    (a.words || []).forEach((w, wi)=>{
      wordsFlat.push({ a, w, ai, wi });
    });
  });
  idx = 0;
  render();
}

/* Navigation */
function prev(){
  if(!wordsFlat.length) return;
  if(mode==='random'){ idx = Math.floor(Math.random()*wordsFlat.length); }
  else idx = Math.max(0, idx-1);
  render();
}
function next(){
  if(!wordsFlat.length) return;
  if(mode==='random'){ idx = Math.floor(Math.random()*wordsFlat.length); }
  else idx = Math.min(wordsFlat.length-1, idx+1);
  render();
}
function flip(){
  if(frontFace.style.display==='none'){
    frontFace.style.display='block';
    backFace.style.display='none';
  }else{
    frontFace.style.display='none';
    backFace.style.display='block';
    renderBack(); // ensure back is populated fresh
  }
}
function currentAyahIndex(){
  const cur = wordsFlat[idx];
  return cur ? cur.ai : 0;
}

/* Quick jump */
function onQuickGo(){
  const v = (jumpInput.value || '').trim();
  const m = v.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if(!m || !wordsFlat.length) return;
  const s = +m[1], a = +m[2], w = m[3] ? +m[3] : null;

  const found = wordsFlat.findIndex(x=>{
    const [ss,aa] = x.a.ayah_id.split(':').map(Number);
    if(ss!==s || aa!==a) return false;
    if(w==null) return true;
    const wi = +(x.w.word_id?.split(':')[2] || 0);
    return wi===w;
  });
  if(found>=0){ idx = found; render(); }
}

/* Render */
function render(){
  // guards
  if(!wordsFlat.length){
    ayahArabic.textContent = '﴿ ﴾';
    ayahBangla.textContent = '—';
    crumb.textContent = '—';
    frontArabic.textContent = '—'; frontBangla.textContent='—';
    chipRoot.textContent=chipRootM.textContent=chipMorph.textContent='';
    tajBlock.classList.add('hidden');
    audioBtn.classList.add('hidden');
    posText.textContent = '0 / 0';
    return;
  }

  const {a, w, ai, wi} = wordsFlat[idx];

  // header
  ayahArabic.textContent = a.arabic || '﴿ ﴾';
  ayahBangla.textContent = a.bangla || '—';

  // front main
  crumb.textContent = `${a.ayah_id} — ${idx+1} / ${wordsFlat.length}`;
  frontArabic.textContent = w.arabic_word || '—';
  frontBangla.textContent = w.bangla_meaning || '—';

  // labeled chips
  chipRoot.innerHTML  = `<span class="k">Root:</span> <span class="v ar" dir="rtl">${w.root || '—'}</span>`;
  chipRootM.innerHTML = `<span class="k">Root Meaning:</span> <span class="v">${w.rootMeaning || '—'}</span>`;
  chipMorph.innerHTML = `<span class="k">Morphology:</span> <span class="v">${w.derivationMethod || '—'}</span>`;

  // layout-specific front
  if(layout==='audio'){
    // audio
    const audioUrl = w.audio || a.audio_ayah || deck.audio_ayah || '';
    if(audioUrl){
      audioBtn.classList.remove('hidden');
      ayahAudio.src = audioUrl;
    }else{
      audioBtn.classList.add('hidden');
      ayahAudio.removeAttribute('src');
    }

    // tajweed (only when present)
    const tj = w.tajweed || {};
    const hasTaj = (tj.summary || '') || (Array.isArray(tj.rules) && tj.rules.length);
    if(hasTaj){
      tajBlock.classList.remove('hidden');
      tajSummary.textContent = tj.summary || '';
      tajList.innerHTML = (tj.rules || []).map(r=>`<div class="rule">${r}</div>`).join('');
      if(tj.exampleArabic || tj.exampleBangla){
        tajExample.classList.remove('hidden');
        exArabic.textContent = tj.exampleArabic || '';
        exBangla.textContent = tj.exampleBangla || '';
      }else{
        tajExample.classList.add('hidden');
      }
    }else{
      tajBlock.classList.add('hidden');
      tajList.innerHTML=''; tajSummary.textContent='';
      tajExample.classList.add('hidden');
    }

    frontHint.textContent = 'Flip for Derived Words or Word-by-Word • Press F to flip';
  }else{
    // full layout -> never show audio/taj
    audioBtn.classList.add('hidden');
    tajBlock.classList.add('hidden');
    frontHint.textContent = 'Flip for Word-by-Word • Press F to flip';
  }

  // ensure we’re on front on render
  frontFace.style.display='block';
  backFace.style.display='none';

  posText.textContent = `${idx+1} / ${wordsFlat.length}`;
}

function renderBack(){
  if(!wordsFlat.length) return;
  const {a, w, ai} = wordsFlat[idx];

  // Layout behavior
  if(layout==='audio'){
    // Tabs visible
    backTabs.classList.remove('hidden');
    wbwToolbar.classList.remove('hidden');

    // Start on Derived Words
    tabDeriv.classList.add('active'); tabWbw.classList.remove('active');
    rootsPane.style.display='block'; wbwPane.style.display='none';

    // Fill root details
    rootDetails.classList.remove('hidden');
    rootTxt.textContent = w.root || '—';
    rootMeaningTxt.textContent = w.rootMeaning || '—';
    morphTxt.textContent = w.derivationMethod || '—';

    // Derived words
    fillDerived(w);

  }else{
    // full layout -> no tabs, only WBW
    backTabs.classList.add('hidden');
    rootsPane.style.display='none';
    wbwPane.style.display='block';
    wbwToolbar.classList.add('hidden'); // no whole-surah toggle in full mode back
    buildWbwList({wholeSurah:false, ayahIdx: ai});
  }
}

/* Derived helper */
function fillDerived(w){
  derivList.innerHTML='';

  const derivs = Array.isArray(w.quranicDerivations) ? w.quranicDerivations : [];
  const filtered = derivs.filter(d => (d.arabic||'').trim() !== (w.arabic_word||'').trim());

  if(!filtered.length){
    derivTitle.classList.add('hidden');
    derivEmpty.classList.remove('hidden');
    return;
  }
  derivTitle.classList.remove('hidden');
  derivEmpty.classList.add('hidden');

  filtered.forEach(d=>{
    const morph = d.derivationMethod ? ` <span class="muted">(${d.derivationMethod})</span>` : '';
    const occs = (d.occurrences||[]).map(o=>o.ayah_id).join(', ');
    const mean = d.meaning || '';
    const row = document.createElement('div');
    row.className='deriv-row';
    row.innerHTML = `
      <div class="d-ar big" dir="rtl">${d.arabic||''}${morph}</div>
      <div class="d-text">
        <div class="d-bn">${mean}</div>
        ${occs ? `<div class="d-meta">${occs}</div>` : ``}
      </div>
    `;
    derivList.appendChild(row);
  });
}

/* WBW helper */
function buildWbwList({wholeSurah=false, ayahIdx=0}){
  wbwList.innerHTML='';
  const words = [];
  if(wholeSurah){
    (deck.ayats||[]).forEach(a => (a.words||[]).forEach(w => words.push({a,w})));
  }else{
    const a = deck.ayats?.[ayahIdx];
    (a?.words||[]).forEach(w => words.push({a,w}));
  }
  if(!words.length){
    wbwList.innerHTML = `<div class="muted">No words.</div>`;
    return;
  }
  words.forEach(({w})=>{
    const row = document.createElement('div');
    row.className = 'wbw-item';
    row.innerHTML = `
      <div class="wbw-ar" dir="rtl">${w.arabic_word || ''}</div>
      <div class="wbw-bn">${w.bangla_meaning || ''}</div>
    `;
    wbwList.appendChild(row);
  });
}

/* Audio */
function toggleAudio(){
  if(!ayahAudio?.src) return;
  if(ayahAudio.paused) ayahAudio.play();
  else ayahAudio.pause();
}

/* Errors */
function showError(msg){
  errorBanner.textContent = msg;
  errorBanner.classList.remove('hidden');
}
function clearError(){
  errorBanner.textContent = '';
  errorBanner.classList.add('hidden');
}
